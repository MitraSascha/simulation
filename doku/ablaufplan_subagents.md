# Entwicklungs-Ablaufplan — Soziale Simulations-Engine

> **Stand:** April 2026 — Backend vollständig, Frontend offen

---

## Überblick abgeschlossener Phasen

| Phase | Inhalt | Status |
|---|---|---|
| 0 | Projektstruktur, Docker, Skeleton | ✅ |
| 1 | Async Core, Alembic, Run-Endpoint, Persona-History | ✅ |
| 2 | SSE, Logging, Error Handler | ✅ |
| 3 | Chat-Interface, State Evolution, Auth | ✅ |
| 4 | Management (Cancel/Reset/Stats), Pagination, Export, Webhooks | ✅ |
| 5 | Clone, Suche, Input-Validierung, Health/Metrics | ✅ |
| 6 | Retry-Logik, Concurrency Guard, Dockerfile, API Docs | ✅ |
| 7 | **Frontend** | ⬜ offen |

---

## Phase 7 — Frontend (nächster Schritt)

**Technologie:** noch offen (siehe `projekt-dokumentation.md`)

**Mindest-Features für MVP:**
1. Simulation anlegen (Formular: Name, Produkt, Zielmarkt, Branche, Personas, Ticks)
2. Simulation starten + Live-Fortschritt via SSE
3. Feed-Ansicht (Posts + Kommentare während/nach der Simulation)
4. Analyse-Report anzeigen
5. Mit Personas chatten

**Empfohlene Reihenfolge:**
```
research-agent  → Frontend-Framework evaluieren (Svelte? React? Vue?)
angular-architect → UI-Architektur planen
code-specialist  → Implementierung
```

---

## Verbleibende Backend-Aufgaben (nice-to-have)

### Rate Limiting pro API-Key
- `X-RateLimit-Limit` / `X-RateLimit-Remaining` Headers
- In-Memory Counter (einfach) oder Redis (persistent)

### Multi-Tenancy
- Organization-Modell: `organizations` Tabelle
- API-Keys gehören zu einer Organisation
- Simulationen isoliert pro Organisation

### Celery/ARQ Queue
- Persistente Background Tasks
- Simulationen überleben Server-Neustart
- Priority Queue (bezahlte Kunden zuerst)

### Weitere Features
- Simulation-Templates (gespeicherte Konfigurationen)
- Vergleich zweier Simulationen
- Sentiment-Timeline als Chart-Daten Endpoint
- Persona-Netzwerk-Graph (wer kennt wen)

---

## API-Endpoint-Übersicht (aktueller Stand)

### Simulations
| Method | Path | Beschreibung |
|---|---|---|
| GET | /simulations/ | Liste (paginiert, Filter: status, name) |
| POST | /simulations/ | Anlegen |
| GET | /simulations/{id} | Details |
| POST | /simulations/{id}/run | Starten |
| POST | /simulations/{id}/cancel | Abbrechen |
| POST | /simulations/{id}/reset | Zurücksetzen |
| POST | /simulations/{id}/clone | Klonen |
| GET | /simulations/{id}/stats | Statistiken |
| GET | /simulations/{id}/ticks | Tick-Verlauf |
| GET | /simulations/{id}/stream | SSE Live-Updates |

### Personas
| Method | Path | Beschreibung |
|---|---|---|
| GET | /personas/ | Liste (Filter: simulation_id, is_skeptic) |
| GET | /personas/{id} | Details |
| POST | /personas/{id}/chat | Direkt chatten |

### Posts
| Method | Path | Beschreibung |
|---|---|---|
| GET | /posts/ | Liste (Filter: simulation_id, platform, ingame_day) |
| GET | /posts/{id}/comments | Kommentare |
| GET | /posts/{id}/reactions | Reaktionen |

### Analyse
| Method | Path | Beschreibung |
|---|---|---|
| GET | /analysis/{id} | Report abrufen |
| POST | /analysis/{id}/generate | Report generieren |

### Export
| Method | Path | Beschreibung |
|---|---|---|
| GET | /simulations/{id}/export/json | Vollexport als JSON |
| GET | /simulations/{id}/export/posts/csv | Posts als CSV |
| GET | /simulations/{id}/export/personas/csv | Personas als CSV |

### Admin
| Method | Path | Beschreibung |
|---|---|---|
| POST | /admin/keys | API-Key anlegen |
| GET | /admin/keys | Alle Keys |
| DELETE | /admin/keys/{id} | Key deaktivieren |

### System
| Method | Path | Beschreibung |
|---|---|---|
| GET | / | Status |
| GET | /health | DB-Health Check |
| GET | /metrics | System-Metriken (Auth erforderlich) |
