---
type: subagent-memory
agent: code
modul: phase5a_clone_search
created: 2026-04-29
status: completed
---
## Was wurde getan

- Clone-Endpoint `POST /{simulation_id}/clone` in `app/routers/simulations.py` hinzugefügt (status 201, response_model `SimulationRead`). Klont Konfigurationsfelder der Original-Simulation (name + " (Kopie)", product_description, target_market, industry, total_ticks, config, webhook_url), setzt status=pending und current_tick=0. Personas, Posts, Ticks und Reports werden nicht übernommen.
- Optionaler `name`-Suchparameter (`str | None = Query(None)`) im `GET /` Endpoint ergänzt. Filterung via `Simulation.name.ilike(f"%{name}%")` (case-insensitive LIKE). Kein neuer Import notwendig.
- Kein neues Schema erstellt — clone-Endpoint verwendet das bestehende `SimulationRead`.

## Erstellte/geänderte Dateien

- `app/routers/simulations.py` — geändert (clone-Endpoint hinzugefügt, name-Filter in list_simulations ergänzt)
