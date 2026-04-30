---
type: subagent-memory
agent: research
modul: async_patterns
created: 2026-04-29
status: completed
---

# Async Patterns — FastAPI + SQLAlchemy 2.0 + Anthropic SDK

Wissensstand: SQLAlchemy 2.0.x, FastAPI 0.111+, anthropic SDK 0.25+, Python 3.12

---

## 1. Async SQLAlchemy 2.0 — Engine + AsyncSession in FastAPI

### Imports & Engine-Setup

```python
# db/engine.py
from sqlalchemy.ext.asyncio import (
    AsyncEngine,
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)
from sqlalchemy.orm import DeclarativeBase

DATABASE_URL = "postgresql+asyncpg://user:pass@localhost/dbname"

engine: AsyncEngine = create_async_engine(
    DATABASE_URL,
    pool_size=10,
    max_overflow=20,
    pool_pre_ping=True,   # erkennt tote Verbindungen automatisch
    echo=False,
)

AsyncSessionLocal = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,  # WICHTIG: verhindert lazy-load-Fehler nach commit()
    autoflush=False,
    autocommit=False,
)

class Base(DeclarativeBase):
    pass
```

### `get_db()` als FastAPI Dependency

```python
# db/deps.py
from collections.abc import AsyncGenerator
from sqlalchemy.ext.asyncio import AsyncSession
from db.engine import AsyncSessionLocal

async def get_db() -> AsyncGenerator[AsyncSession, None]:
    async with AsyncSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
```

```python
# router
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from db.deps import get_db

router = APIRouter()

@router.get("/items/{item_id}")
async def get_item(item_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Item).where(Item.id == item_id))
    return result.scalar_one_or_none()
```

### Kernregeln

- **`asyncpg`** als Driver für PostgreSQL (nicht `psycopg2`): `postgresql+asyncpg://`
- `expire_on_commit=False` ist in async-Kontexten zwingend, sonst schlägt jeder Attributzugriff nach `commit()` fehl
- `async with session:` — Session als Async-Contextmanager, nie manuell `.close()` aufrufen
- `select()` statt Legacy-`session.query()` — in 2.0 das einzige unterstützte Pattern
- Relationships: `lazy="selectin"` oder `lazy="joined"` setzen, niemals Standard-Lazy in async verwenden

---

## 2. Alembic mit async SQLAlchemy

### `alembic.ini` — nur die relevante Zeile

```ini
sqlalchemy.url = postgresql+asyncpg://user:pass@localhost/dbname
```

Alternativ aus Env-Variable (bevorzugt):

```ini
# sqlalchemy.url wird in env.py überschrieben — Zeile leer lassen oder auskommentieren
```

### `alembic/env.py` — vollständiges async-Pattern

```python
import asyncio
from logging.config import fileConfig

from sqlalchemy import pool
from sqlalchemy.engine import Connection
from sqlalchemy.ext.asyncio import async_engine_from_config

from alembic import context

# Eigene Base importieren damit Alembic die Tabellen kennt
from db.engine import Base
from db import models  # noqa: F401 — alle Models importieren!

config = context.config
fileConfig(config.config_file_name)

# Ziel-Metadaten für --autogenerate
target_metadata = Base.metadata


def run_migrations_offline() -> None:
    """Offline: SQL-Skript erzeugen ohne DB-Verbindung."""
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )
    with context.begin_transaction():
        context.run_migrations()


def do_run_migrations(connection: Connection) -> None:
    context.configure(connection=connection, target_metadata=target_metadata)
    with context.begin_transaction():
        context.run_migrations()


async def run_async_migrations() -> None:
    """Online: asynchrone Verbindung, sync-Wrapper für Alembic."""
    connectable = async_engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,  # für Migrationen kein Pool nötig
    )
    async with connectable.connect() as connection:
        await connection.run_sync(do_run_migrations)

    await connectable.dispose()


def run_migrations_online() -> None:
    asyncio.run(run_async_migrations())


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
```

### Wichtige Punkte

- `pool.NullPool` in Migrationen: verhindert Verbindungs-Leaks bei einmaligen Migration-Runs
- `run_sync()` ist die Brücke: Alembic selbst ist nicht async — es bekommt eine sync-kompatible Connection
- **Alle Models vor `target_metadata`-Zuweisung importieren**, sonst erkennt `--autogenerate` Tabellen nicht
- Bei `DATABASE_URL` aus Umgebungsvariable: `config.set_main_option("sqlalchemy.url", os.environ["DATABASE_URL"])` vor dem Engine-Setup einfügen

---

## 3. FastAPI BackgroundTasks vs. asyncio Tasks

### BackgroundTasks — was es ist und was nicht

```python
from fastapi import BackgroundTasks

@router.post("/start-job")
async def start_job(bg: BackgroundTasks):
    bg.add_task(some_async_function, arg1, arg2)
    return {"status": "queued"}
```

**Wie es funktioniert:** Die Task läuft im selben asyncio Event-Loop, **nach** dem HTTP-Response. Sie blockiert die Response nicht, aber sie teilt den Worker-Prozess.

| Eigenschaft | BackgroundTasks | asyncio.create_task() |
|---|---|---|
| Ausführung | Nach Response, im selben Event-Loop | Sofort im selben Event-Loop |
| Fehlerbehandlung | Exceptions werden geloggt, nicht propagiert | Exceptions können via Task-Callbacks abgefangen werden |
| Laufzeit-Limit | Kein hartes Limit, aber: Worker-Neustart killt Task | Gleiches Risiko |
| Sichtbarkeit | Keine | Keine (ohne eigene Logik) |
| Geeignet für | < 30 Sek., einfache Operationen | Kurze bis mittlere Tasks |

### Empfehlung für lang laufende Tasks (Minuten)

**BackgroundTasks reicht NICHT für:**
- Tasks > 1–2 Minuten (Uvicorn/Gunicorn-Worker-Timeouts, Neustart)
- Tasks, die nach Server-Neustart fortgesetzt werden sollen
- Tasks, deren Status abgefragt werden muss
- Parallele Tasks mit vielen gleichzeitigen Requests

**Was stattdessen verwenden:**

```
Dauer < 30s, kein Persistenz-Bedarf   → BackgroundTasks oder asyncio.create_task()
Dauer > 30s oder Persistenz nötig     → Task Queue (Celery + Redis, ARQ, SAQ)
Sehr einfach, Minuten, kein Neustart  → asyncio.create_task() + in-memory State Dict
```

**Pragmatische Lösung für moderate Anforderungen (asyncio.create_task + Registry):**

```python
# tasks/registry.py
import asyncio
from uuid import uuid4, UUID

_tasks: dict[UUID, asyncio.Task] = {}

def register_task(coro) -> UUID:
    task_id = uuid4()
    task = asyncio.create_task(coro)
    _tasks[task_id] = task
    task.add_done_callback(lambda t: _tasks.pop(task_id, None))
    return task_id

def get_task_status(task_id: UUID) -> str:
    task = _tasks.get(task_id)
    if task is None:
        return "not_found"
    if task.done():
        return "failed" if task.exception() else "done"
    return "running"
```

**Fazit:** Für einen Simulator mit lang laufenden Ticks (Minuten) ist eine echte Task Queue (z.B. **ARQ** mit Redis — async-nativ, leichtgewichtig) die robustere Wahl gegenüber BackgroundTasks.

---

## 4. Anthropic Python SDK — Async + Rate Limiting

### AsyncAnthropic Client

```python
# services/anthropic_client.py
import anthropic

# Einmal instanziieren, als Singleton verwenden
client = anthropic.AsyncAnthropic(
    api_key="...",          # oder aus ANTHROPIC_API_KEY env var
    max_retries=3,          # automatische Retries bei 429/5xx
    timeout=60.0,           # Sekunden
)
```

### Einzelner async Call

```python
async def call_claude(prompt: str, system: str) -> str:
    message = await client.messages.create(
        model="claude-opus-4-5",
        max_tokens=1024,
        system=system,
        messages=[{"role": "user", "content": prompt}],
    )
    return message.content[0].text
```

### Parallele Calls mit Semaphore-basiertem Rate Limiting

```python
import asyncio
import anthropic
from typing import Any

client = anthropic.AsyncAnthropic()

async def call_with_semaphore(
    semaphore: asyncio.Semaphore,
    payload: dict[str, Any],
) -> str:
    async with semaphore:
        message = await client.messages.create(**payload)
        return message.content[0].text


async def run_parallel_calls(
    payloads: list[dict[str, Any]],
    max_concurrent: int = 10,
) -> list[str]:
    semaphore = asyncio.Semaphore(max_concurrent)
    tasks = [call_with_semaphore(semaphore, p) for p in payloads]
    return await asyncio.gather(*tasks, return_exceptions=True)
```

**Verwendung:**

```python
payloads = [
    {
        "model": "claude-opus-4-5",
        "max_tokens": 512,
        "messages": [{"role": "user", "content": f"Persona {i}: ..."}],
    }
    for i in range(50)
]

# Max 10 gleichzeitige Calls, restliche warten
results = await run_parallel_calls(payloads, max_concurrent=10)
```

### Ratschläge

- **`return_exceptions=True`** bei `gather()`: Verhindert, dass ein einzelner Fehler alle anderen Tasks abbricht
- **Semaphore-Wert:** Anthropic erlaubt je nach Tier 5–50 concurrent Requests. Für Tier-1 ist `max_concurrent=10` sicher, Tier-2+ bis 20
- **Exponential Backoff:** Der SDK-interne `max_retries=3` deckt 429-Fehler bereits ab. Für eigenes Retry-Logic: `tenacity`-Library
- **Streaming:** `await client.messages.stream(...)` als Async-Contextmanager für SSE-Responses

---

## 5. Persona History Pattern — Konsistenz über viele Ticks

### Das Problem

Jeder Anthropic-API-Call hat ein Context Window (200k Token bei Claude 3/4). Bei 15+ Ticks mit vielen Personas wächst die History linear → irgendwann zu groß + teuer.

### Option A: Sliding Window

```python
def build_messages_sliding_window(
    full_history: list[dict],
    max_messages: int = 20,
) -> list[dict]:
    """Behält die letzten N Nachrichten."""
    return full_history[-max_messages:]
```

**Vorteil:** Einfach, deterministisch  
**Nachteil:** Frühe, aber wichtige Ereignisse gehen verloren (z.B. erste Charakterisierung der Persona)

### Option B: Rolling Summary (empfohlen für 15+ Ticks)

```python
SUMMARY_INTERVAL = 5  # Nach je 5 Ticks neu zusammenfassen

async def maybe_summarize(
    persona_id: str,
    history: list[dict],
    current_tick: int,
) -> tuple[str, list[dict]]:
    """
    Gibt (summary_text, recent_messages) zurück.
    summary_text wird als System-Prompt-Präfix eingefügt.
    recent_messages sind die letzten N Nachrichten (Sliding Window).
    """
    if current_tick % SUMMARY_INTERVAL != 0:
        return existing_summary, history[-10:]

    summary_prompt = (
        "Fasse die bisherige Geschichte dieser Persona prägnant zusammen. "
        "Fokus: Persönlichkeitsentwicklung, wichtige Entscheidungen, aktuelle Gemütslage."
    )
    new_summary = await call_claude(
        prompt="\n".join(m["content"] for m in history),
        system=summary_prompt,
    )
    return new_summary, history[-5:]  # Nur die letzten 5 nach Summary


def build_system_prompt(base_persona: str, rolling_summary: str) -> str:
    if rolling_summary:
        return f"{base_persona}\n\n## Bisherige Geschichte\n{rolling_summary}"
    return base_persona
```

**Aufruf-Pattern pro Tick:**

```python
async def tick_for_persona(persona: Persona, tick: int) -> str:
    summary, recent_history = await maybe_summarize(
        persona.id, persona.full_history, tick
    )
    persona.rolling_summary = summary

    response = await client.messages.create(
        model="claude-opus-4-5",
        max_tokens=512,
        system=build_system_prompt(persona.base_description, summary),
        messages=recent_history + [{"role": "user", "content": current_tick_prompt}],
    )
    text = response.content[0].text
    persona.full_history.append({"role": "assistant", "content": text})
    return text
```

### Option C: Hybrid (beste Konsistenz)

```
System-Prompt    = Persona-Basis (unveränderlich) + Rolling Summary (aktualisiert alle N Ticks)
Messages-Array   = Sliding Window der letzten 6–10 Messages
```

**Warum Hybrid für 15+ Ticks:**
- Summary bewahrt Langzeit-Narrative (Charakterentwicklung, Schlüsselereignisse)
- Sliding Window sichert kurzfristigen Gesprächskontext
- Token-Budget bleibt kontrollierbar

### Vergleich

| Pattern | Konsistenz | Kosten | Komplexität | Empfehlung |
|---|---|---|---|---|
| Kein Limit | Hoch | Sehr hoch | Niedrig | Nur Prototyp |
| Sliding Window | Mittel | Mittel | Niedrig | Kurze Sessions |
| Rolling Summary | Hoch | Mittel | Mittel | 15+ Ticks |
| Hybrid | Sehr hoch | Mittel | Mittel | Simulator |

**Empfehlung für diesen Simulator:** Hybrid-Pattern. Rolling Summary alle 5 Ticks, Sliding Window der letzten 8 Messages im `messages[]`-Array.

---

## Zusammenfassung — Quick Reference

| Thema | Key Decision |
|---|---|
| Async Engine | `postgresql+asyncpg`, `expire_on_commit=False`, `async_sessionmaker` |
| Alembic | `run_sync()` + `NullPool` + alle Models importieren |
| BackgroundTasks | Nur < 30s; für Minuten → ARQ oder asyncio.create_task() + Registry |
| Anthropic Parallel | `asyncio.Semaphore(10-20)` + `gather(return_exceptions=True)` |
| History | Hybrid: Rolling Summary (alle 5 Ticks) + Sliding Window (8 Messages) |
