---
type: subagent-memory
agent: architect
modul: phase1_async_refactor
created: 2026-04-29
status: completed
---

# Phase 1 Architekturplan — Async Refactor

## Implementierungs-Reihenfolge

```
Stufe 1: database.py (async engine + session)
Stufe 2: models/persona.py (current_state Feld)
Stufe 3: Alembic (alembic.ini + migrations/env.py)
Stufe 4: app/schemas/ (Pydantic Request/Response Modelle)
Stufe 5: Async AI-Clients (persona_generator, tick_engine, report_generator)
Stufe 6: Router (async + Pydantic + /run Endpoint)
Stufe 7: main.py (lifespan, async startup)
```

## Zu ändernde Dateien

| Datei | Art der Änderung |
|---|---|
| `app/database.py` | Komplett: async engine, AsyncSession, async get_db |
| `app/main.py` | lifespan statt sync startup |
| `app/models/persona.py` | current_state = Column(JSON, default={}) hinzufügen |
| `app/routers/simulations.py` | Komplett: async, Pydantic, /run Endpoint |
| `app/routers/personas.py` | async + Pydantic response_model |
| `app/routers/posts.py` | async + Pydantic response_model |
| `app/routers/analysis.py` | async + Pydantic response_model |
| `app/simulation/tick_engine.py` | AsyncAnthropic, asyncio.gather, Semaphore, selectinload |
| `app/simulation/persona_generator.py` | AsyncAnthropic, async def |
| `app/analysis/report_generator.py` | AsyncAnthropic, async def, selectinload |
| `docker-compose.yml` | alembic upgrade head vor App-Start |

## Neu zu erstellende Dateien

| Datei | Zweck |
|---|---|
| `app/schemas/common.py` | UUIDModel, TimestampMixin |
| `app/schemas/simulation.py` | SimulationCreate/Read/RunResponse |
| `app/schemas/persona.py` | PersonaRead, PersonaCreate |
| `app/schemas/content.py` | PostRead, CommentRead, ReactionRead, AnalysisReportRead, TickRead |
| `app/simulation/runner.py` | run_simulation_background(), globaler Semaphore |
| `alembic.ini` | Alembic-Konfiguration |
| `alembic/env.py` | Alembic env mit sync-wrapper |

## Kritische Details

### async SQLAlchemy
- Driver: `postgresql+asyncpg://`
- `async_sessionmaker` mit `expire_on_commit=False` (ZWINGEND)
- Lazy Loading funktioniert NICHT — alle Relationships via `selectinload` laden

### Semaphore
- `asyncio.Semaphore(10)` als Modul-Variable in `runner.py`
- Wird an `run_tick()` übergeben
- Global für alle laufenden Simulationen

### Background Task Session
- Background Task darf KEINE Session aus dem Request übernehmen
- Eigene Session via `async with AsyncSessionLocal() as db`
- Bei Exception: neue Session für Status-Update auf `failed`

### Persona History (current_state JSON)
```json
{
  "opinion_evolution": "Kurze Beschreibung Meinungsentwicklung",
  "recent_actions": [
    {"tick": 3, "action": "post", "summary": "Kritischen Post verfasst"},
    {"tick": 4, "action": "comment", "summary": "Widerspruch geäußert"}
  ],
  "mood": "skeptisch",
  "key_relationships": ["Klaus M. (ally)", "Sarah K. (opponent)"]
}
```
Ringpuffer: max 5 Einträge in `recent_actions`.

### Status-Transitions
```
pending → running   (/run Call)
running → completed (nach letztem Tick + Report)
running → failed    (bei Exception)
```
Guard: HTTP 409 wenn bereits running.

### Alembic
- Alembic nutzt sync-Connection (psycopg2) für autogenerate
- App nutzt async-Connection (asyncpg) für Runtime
- docker-compose Entrypoint: `alembic upgrade head && uvicorn ...`
