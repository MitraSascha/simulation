---
type: subagent-memory
agent: code
modul: phase6b_concurrency_guard
created: 2026-04-29
status: completed
---
## Was wurde getan

Implementierung eines Concurrent-Simulation-Guards, der verhindert, dass mehr als N Simulationen gleichzeitig im Status `running` sind. Zusätzlich wurde eine Stale-Running-Detection eingebaut, die beim Server-Start verwaiste `running`-Simulationen auf `failed` setzt.

## Erstellte/geänderte Dateien

- `app/config.py` — Neues Feld `max_concurrent_simulations: int = 3` in der `Settings`-Klasse ergänzt.
- `app/routers/simulations.py` — Im `POST /{simulation_id}/run` Endpoint nach dem 409-Check einen Guard eingefügt, der `running`-Simulationen zählt und bei Erreichen des Limits HTTP 429 wirft. Import von `settings` aus `app.config` ergänzt (`func` war bereits importiert).
- `.env.example` — Eintrag `MAX_CONCURRENT_SIMULATIONS=3` ergänzt.
- `app/simulation/runner.py` — Neue Funktion `reset_stale_simulations()` hinzugefügt: setzt alle `running`-Simulationen beim Start via `UPDATE ... RETURNING` auf `failed` und loggt die Anzahl.
- `app/main.py` — Im `lifespan`-Context-Manager `reset_stale_simulations()` vor dem `yield` aufgerufen.
