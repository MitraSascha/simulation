---
type: subagent-memory
agent: code
modul: phase3c_auth
created: 2026-04-29
status: completed
---
## Was wurde getan

API-Key-Authentifizierung für das FastAPI-Backend implementiert. Alle produktiven Endpoints (simulations, personas, posts, analysis, stream, chat) sind jetzt hinter `verify_api_key` gesichert. `/` und `/health` bleiben offen. Ein separater `/admin/*`-Router ermöglicht Key-Verwaltung über einen Master-Key.

## Erstellte/geänderte Dateien

**Neu erstellt:**
- `app/models/auth.py` — SQLAlchemy-Modell `ApiKey` mit SHA-256-Hash-Speicherung (kein Klartext)
- `app/auth.py` — `verify_api_key` FastAPI-Dependency, `generate_api_key()`, `_hash_key()`
- `app/schemas/auth.py` — Pydantic-Schemas: `ApiKeyCreate`, `ApiKeyRead`, `ApiKeyCreated`
- `app/routers/admin.py` — Admin-Endpoints: POST /admin/keys, GET /admin/keys, DELETE /admin/keys/{key_id}

**Geändert:**
- `app/config.py` — `admin_master_key: str = "change-me-in-production"` hinzugefügt
- `app/models/__init__.py` — `ApiKey` in Import und `__all__` ergänzt
- `app/main.py` — Alle bestehenden Router mit `dependencies=[Depends(verify_api_key)]` versehen; Admin-Router ohne Auth registriert
- `.env.example` — `ADMIN_MASTER_KEY=change-me-in-production` ergänzt

## Übergabe-Hinweise

- **Datenbank-Migration:** Die neue Tabelle `api_keys` muss per Alembic-Migration angelegt werden (`alembic revision --autogenerate -m "add api_keys"` + `alembic upgrade head`).
- **Erster Key:** Nach dem Deployment via `POST /admin/keys` mit Header `X-Admin-Key: <ADMIN_MASTER_KEY>` anlegen. Der Klartext-Key wird nur einmal zurückgegeben.
- **`last_used_at`-Update:** Das `await db.execute(update(...))` in `verify_api_key` persistiert erst, wenn die Session committed wird (am Ende des Requests durch den DB-Context-Manager). Falls die Session kein Auto-Commit hat, muss der DB-Context-Manager `await session.commit()` aufrufen — prüfen ob `app/database.py` das bereits tut.
- **`ApiKeyRead` Pydantic-Config:** `model_config = {"from_attributes": True}` ist gesetzt, damit SQLAlchemy-ORM-Objekte direkt serialisiert werden können.
- **`stream.router` und `chat.router`** haben prefix="" — die `verify_api_key`-Dependency greift trotzdem korrekt, da sie auf Router-Ebene gesetzt ist.
