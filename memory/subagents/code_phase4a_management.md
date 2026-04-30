---
type: subagent-memory
agent: code
modul: phase4a_simulation_management
created: 2026-04-29
status: completed
---
## Was wurde getan

Drei neue Simulation-Management-Endpoints in das FastAPI-Backend implementiert sowie zwei neue Pydantic-Schemas ergänzt.

### Schemas (`app/schemas/simulation.py`)
- `SimulationStats` — gibt detaillierten Laufzeitstatus inkl. Counts zurück
- `SimulationResetResponse` — Bestätigung nach Reset

### Endpoints (`app/routers/simulations.py`)
- `POST /{simulation_id}/cancel` — setzt Status auf `failed` (400 wenn nicht `running`)
- `POST /{simulation_id}/reset` — löscht alle Simulations-Daten (Personas, Posts, Comments, Reactions, Ticks, Reports) in FK-sicherer Reihenfolge und setzt Simulation auf `pending`/`current_tick=0` zurück (409 wenn `running`)
- `GET /{simulation_id}/stats` — liefert `SimulationStats` via `func.count()` Queries

### Imports ergänzt
- `datetime`, `delete`, `func` aus stdlib/sqlalchemy
- `AnalysisReport, Comment, Persona, Post, Reaction` aus `app.models`
- `SimulationResetResponse`, `SimulationStats` direkt aus `app.schemas.simulation`

### `app/schemas/__init__.py`
- `SimulationStats` und `SimulationResetResponse` in Import und `__all__` aufgenommen

## Erstellte/geänderte Dateien
- `app/schemas/simulation.py` — zwei neue Schemas am Ende ergänzt
- `app/schemas/__init__.py` — neue Schemas exportiert
- `app/routers/simulations.py` — Imports erweitert, drei neue Endpoints hinzugefügt
- `memory/subagents/code_phase4a_management.md` — diese Datei

## Übergabe-Hinweise
- `Comment` und `Reaction` haben **keine** `simulation_id`-Spalte — Löschung erfolgt via `post_id.in_(subquery)` über Post-IDs der Simulation
- Der Cancel-Endpoint setzt keinen echten Interrupt-Mechanismus um; der Background-Task erkennt den `failed`-Status beim nächsten DB-Commit selbst
- `updated_at` wird in `cancel` und `reset` manuell auf `datetime.utcnow()` gesetzt, da SQLAlchemy `onupdate` bei direkten Attributzuweisungen ohne ORM-Update-Event ggf. nicht feuert
- Alle bestehenden Endpoints sind unverändert
