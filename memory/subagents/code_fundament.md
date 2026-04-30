---
type: subagent-memory
agent: code
modul: fundament_schemas_alembic
created: 2026-04-29
status: completed
---

## Was wurde getan

Das Fundament des FastAPI-Backends wurde auf async-Betrieb umgestellt und mit vollständigen Pydantic-Schemas sowie Alembic-Migrationssupport ausgestattet.

- `app/database.py` wurde vollständig auf SQLAlchemy async (asyncpg, async_sessionmaker, create_async_engine) umgebaut. `get_db()` ist jetzt ein async generator mit commit/rollback-Logik.
- `app/models/persona.py`: Feld `current_state = Column(JSON, default={})` nach `social_connections` eingefügt.
- `app/schemas/` wurde neu strukturiert: `common.py`, `simulation.py`, `persona.py`, `content.py` und `__init__.py` mit vollständigen Pydantic v2 Schemas (ConfigDict, from_attributes).
- `app/main.py` wurde auf async umgestellt: lifespan-Context-Manager ersetzt `Base.metadata.create_all`, alle Route-Handler sind async.
- `alembic.ini` im Projektroot erstellt mit sprechenden Dateinamen-Templates (`%%(year)d%%(month).2d%%(day).2d_%%(rev)s_%%(slug)s`).
- `alembic/env.py` liest `settings.database_url` (sync URL), importiert alle Models für autogenerate, standard online/offline mode.
- `alembic/script.py.mako` offizielles Standard-Template.
- `docker-compose.yml`: `app`-Service startet jetzt mit `alembic upgrade head && uvicorn ...`.

## Erstellte/geänderte Dateien

- `W:/Dev/Privat/Simulator/app/database.py` — ersetzt (sync -> async)
- `W:/Dev/Privat/Simulator/app/models/persona.py` — `current_state` Feld ergänzt
- `W:/Dev/Privat/Simulator/app/schemas/common.py` — neu
- `W:/Dev/Privat/Simulator/app/schemas/simulation.py` — neu
- `W:/Dev/Privat/Simulator/app/schemas/persona.py` — neu
- `W:/Dev/Privat/Simulator/app/schemas/content.py` — neu
- `W:/Dev/Privat/Simulator/app/schemas/__init__.py` — ersetzt
- `W:/Dev/Privat/Simulator/app/main.py` — ersetzt (lifespan, async routes)
- `W:/Dev/Privat/Simulator/alembic.ini` — neu
- `W:/Dev/Privat/Simulator/alembic/env.py` — neu
- `W:/Dev/Privat/Simulator/alembic/script.py.mako` — neu
- `W:/Dev/Privat/Simulator/docker-compose.yml` — command ergänzt

## Übergabe-Hinweise

- Alle Router (`app/routers/simulations.py`, `personas.py`, `posts.py`, `analysis.py`) müssen auf async umgestellt werden: `async def` statt `def`, `AsyncSession` statt `Session`, `Depends(get_db)` bleibt gleich aber der Typ ist jetzt `AsyncSession`.
- DB-Abfragen in den Routern müssen auf SQLAlchemy async API umgestellt werden: `await session.execute(select(...))` statt `session.query(...)`.
- Die Schemas sind jetzt vollständig verfügbar über `from app.schemas import ...` — kein direkter Import aus Untermodulen nötig.
- Beim ersten Start läuft `alembic upgrade head` automatisch — es wird eine initiale Migration benötigt (`alembic revision --autogenerate -m "initial"`), die alle Tabellen anlegt. Diese sollte vor dem ersten Deploy erstellt und ins Repo eingecheckt werden.
- `asyncpg` muss in `requirements.txt` vorhanden sein (neben `sqlalchemy[asyncio]`).
