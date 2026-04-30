---
type: project
updated: 2026-04-29
phase: 0
---

## Abhängigkeiten & Status

### API-Keys
| Dienst | Variable | Status |
|---|---|---|
| Anthropic | `ANTHROPIC_API_KEY` | Muss in `.env` gesetzt werden |

### Externe Dienste
| Dienst | Zweck | Status |
|---|---|---|
| Anthropic API | Haiku (Agenten) + Sonnet (Analyse) | Benötigt API-Key |
| PostgreSQL | Datenspeicher | Läuft via Docker |

### Lokale Anforderungen
- Docker + docker-compose
- Python 3.12+ (für lokale Entwicklung ohne Docker)
- `.env` aus `.env.example` anlegen und `ANTHROPIC_API_KEY` setzen

### Startbefehl
```bash
cp .env.example .env
# ANTHROPIC_API_KEY in .env eintragen
docker-compose up --build
```
API erreichbar unter: http://localhost:8000
Swagger UI: http://localhost:8000/docs
