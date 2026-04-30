---
type: subagent-memory
agent: code
modul: phase5b_input_validation
created: 2026-04-29
status: completed
---
## Was wurde getan

Pydantic v2 Input-Validierung fuer alle zentralen Request-Schemas implementiert und der FastAPI-Exception-Handler fuer `RequestValidationError` ergaenzt.

## Erstellte/geänderte Dateien

- `app/schemas/simulation.py`
  - `SimulationConfig`: `persona_count` und `tick_count` mit `Field(ge/le)` Constraints versehen
  - `SimulationCreate`: Alle Felder mit `Field(min_length, max_length, ge, le)` annotiert
  - `@field_validator` fuer `webhook_url` (URL-Prefix-Pruefung, max 2048 Zeichen)
  - `@field_validator` fuer `name` und `product_description` (automatisches `.strip()`)

- `app/schemas/chat.py`
  - `ChatMessage.role`: `Field(pattern="^(user|assistant)$")` — nur valide Rollen erlaubt
  - `ChatMessage.content`: `Field(min_length=1, max_length=5000)`
  - `ChatRequest.message`: `Field(min_length=1, max_length=2000)`
  - `ChatRequest.history`: `Field(default_factory=list, max_length=50)`

- `app/schemas/auth.py`
  - `ApiKeyCreate.name`: `Field(min_length=3, max_length=255)`

- `app/middleware/errors.py`
  - `RequestValidationError`-Handler hinzugefuegt (vor `HTTPException`-Handler registriert)
  - Gibt strukturierten 422-Response mit `exc.errors()` als `detail` zurueck
  - Importiert `RequestValidationError` aus `fastapi.exceptions`
