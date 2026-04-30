---
type: subagent-memory
agent: code
modul: phase4e_webhooks
created: 2026-04-29
status: completed
---
## Was wurde getan

Webhook-Support für das FastAPI-Backend implementiert. Wenn eine Simulation den Status `completed` oder `failed` erreicht, wird ein HTTP-POST an eine optional vom Nutzer konfigurierbare URL gesendet. Fehler beim Webhook-Versand werden geloggt, aber niemals propagiert — die Simulation bleibt davon unberührt.

## Erstellte/geänderte Dateien

- `app/models/simulation.py` — Feld `webhook_url = Column(String(2048), nullable=True)` nach `total_ticks` ergänzt
- `app/schemas/simulation.py` — `webhook_url: str | None = None` in `SimulationCreate`; `webhook_url: str | None` in `SimulationRead` ergänzt
- `app/webhooks.py` — NEU: `dispatch_webhook()` async-Funktion mit httpx, Timeout 10s, strukturiertem Payload (`event`, `simulation_id`, `status`, `current_tick`, `total_ticks`), vollständigem Exception-Handling
- `app/simulation/runner.py` — Import von `dispatch_webhook` hinzugefügt; Webhook-Aufruf nach `completed`-Block; Webhook-Aufruf im `except`-Block (eigene Session, vollständig gekapselt in try/except)
- `alembic/versions/003_add_webhook_url.py` — NEU: Migration `down_revision = '002'`, fügt Spalte `webhook_url VARCHAR(2048) NULL` zur Tabelle `simulations` hinzu

## Übergabe-Hinweise

- Alembic-Migration muss noch ausgeführt werden: `alembic upgrade head`
- Das Payload-Format des Webhooks: `{ event, simulation_id, status, current_tick, total_ticks }` — kompatibel mit n8n/Zapier Webhook-Nodes
- `httpx` muss in `requirements.txt` / `pyproject.toml` eingetragen sein (war laut Aufgabe bereits vorhanden)
- Der `completed`-Webhook liest `sim` aus der laufenden Session (kein extra DB-Hit nötig)
- Der `failed`-Webhook öffnet eine eigene Session, da die Haupt-Session nach dem Fehler im Rollback-State sein kann
