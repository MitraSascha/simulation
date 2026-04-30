---
type: project
updated: 2026-04-29
phase: 3
---

## Status
Backend vollständig implementiert. Alle Phasen 1–6 abgeschlossen.
Phase 7 (Engine-Optimierung) abgeschlossen — Simulation Engine grundlegend überarbeitet.
Frontend noch offen.

## Abgeschlossen

### Phase 1 — Async Core
- Async SQLAlchemy 2.0 (AsyncSession, asyncpg)
- Alembic Migrationen (001 Schema, 002 Indexes, 003 Webhook)
- Pydantic Schemas für alle Request/Response-Modelle
- POST /simulations/{id}/run — Background Task
- Persona-History (current_state JSON mit Ringpuffer)
- Parallele Haiku-Calls via asyncio.gather + Semaphore

### Phase 2 — Beobachtbarkeit
- SSE Live-Updates (GET /simulations/{id}/stream)
- Strukturiertes Logging (SimulatorFormatter)
- Globaler Error-Handler (HTTPException, ValueError, RequestValidationError)

### Phase 3 — Features
- Chat-Interface mit Personas (POST /personas/{id}/chat)
- State Evolution: opinion_evolution + mood per Haiku fortgeschrieben
- API-Key Authentifizierung (SHA-256 Hash, Admin-Endpoints)

### Phase 4 — Produktreife
- Simulation Cancel, Reset, Stats
- Logging in Engine (runner, tick_engine, report_generator)
- Pagination (simulations, personas, posts mit Filtern)
- Export (JSON + CSV für Posts und Personas)
- Webhook-Support (POST bei completed/failed)

### Phase 5 — Robustheit
- Simulation Clone (POST /{id}/clone)
- Namenssuche (GET /simulations/?name=...)
- Input-Validierung (Pydantic Field Constraints + Validators)
- Health Check mit DB-Connectivity (GET /health)
- Metrics Endpoint (GET /metrics)

### Phase 6 — Stabilität
- Retry-Logik (Exponential Backoff für alle Anthropic-Calls)
- Concurrent Simulation Guard (max 3 gleichzeitig, konfigurierbar)
- Stale Simulation Reset beim Server-Start
- Dockerfile Multi-Stage Build, Non-Root User
- API-Dokumentation (OpenAPI Tags + Beschreibungen)
- Konfigurierbares CORS

### Phase 7 — Engine-Optimierung (2026-04-29)
- **tick_engine.py:** State-Updates parallelisiert (asyncio.gather statt sequenziell)
- **tick_engine.py:** Feed-Filter auf letzte 5 Ingame-Tage (Skalierbarkeit)
- **tick_engine.py:** Feed-Algorithmus verbessert (Recency-Decay + Trending-Bonus)
- **tick_engine.py:** Post-ID-Validierung bei Comment/React-Aktionen
- **tick_engine.py:** Tool Use statt fragiles JSON-Parsing (persona_action + state_update)
- **tick_engine.py:** Multi-Action pro Tick (1-3 Aktionen pro Persona)
- **tick_engine.py:** Prompt Caching (cache_control auf System-Prompt + Persona-Profil)
- **persona_generator.py:** Modell auf Sonnet umgestellt (Qualität entscheidend)
- **persona_generator.py:** Tool Use statt JSON-Parsing
- **report_generator.py:** Alle strukturierten Felder werden jetzt befüllt (sentiment_over_time etc.)
- **report_generator.py:** Tool Use + max_tokens auf 8192 erhöht
- **runner.py:** Cancellation-Check vor jedem Tick
- **runner.py:** Semaphore aus Settings statt hardcoded
- **runner.py:** datetime.utcnow() → datetime.now(timezone.utc)
- **runner.py:** Max Concurrent Simulations wird jetzt geprüft
- **tick_engine.py:** Wave-System (3 Waves pro Tick: 30/30/40%) für Intra-Tick-Interaktion
- **tick_engine.py:** Persona-History im Prompt (eigene Posts + erhaltene Kommentare)
- **runner.py:** Homophilie-basierte Social Connections (Stadt, Alter, Values, Skeptiker-Status)

### Phase 8 — Emergente Dynamiken (2026-04-29)
- **tick_engine.py:** Dynamischer Sozialer Graph — Verbindungen evolve basierend auf Interaktionen (Comment +2, Like/Share +1, Dislike -0.5, 5% Decay)
- **tick_engine.py:** Emotionale Ansteckung — Ambient Mood des Feeds beeinflusst Persona-Stimmung
- **tick_engine.py:** Influence Tracking — State-Update gibt most_influential_post_id zurück, InfluenceEvents werden gespeichert
- **tick_engine.py:** Plattform-Migration — platform_affinity evolves basierend auf Engagement, Feed gewichtet bevorzugte Plattform höher
- **models/content.py:** Neues Modell InfluenceEvent (source/target persona, trigger post, influence_type)
- **models/content.py:** AnalysisReport um 3 Felder erweitert (influence_network, platform_dynamics, network_evolution)
- **report_generator.py:** Influence-Events + Persona-Endzustände im Prompt, 10 Analyse-Dimensionen
- **alembic:** Migration 004 (influence_events Tabelle) + Migration 005 (report analysis fields)

### Phase F1-F6 — Angular Frontend (2026-04-29)
- **Stack:** Angular 19 + PrimeNG + Tailwind CSS v4 + ECharts + Sigma.js
- **Core:** ApiService, Auth-Interceptor, SSE-Service, ThemeService (Dark/Light), Export-Service
- **Models:** Simulation, Persona, Post, Comment, Reaction, InfluenceEvent, AnalysisReport
- **Views implementiert:**
  - `/simulations` — Liste mit Suche, Statusfilter, Karten-Grid
  - `/simulations/create` — 3-Step Wizard (Produkt → Config → Review+Start)
  - `/simulation/:id/overview` — KPI-Cards + ECharts Aktivitäts-Chart + Live-Feed
  - `/simulation/:id/network` — Sigma.js Sozialer Graph (Mood-Farben, Influence-Größe, Skeptiker-Rahmen)
  - `/simulation/:id/influence` — ECharts Sankey Flow + Top-Influencer Ranking + Event-Timeline
  - `/simulation/:id/sentiment` — Plattform-Verteilung Donut + Persona-Aktivität Area Chart
  - `/simulation/:id/personas` — Master-Detail mit Suche/Filter + Chat-Interface
  - `/simulation/:id/report` — 10-Dimensionen Report Cards + Export-Buttons (JSON/CSV)
- **Features:** Lazy Loading, Dark Mode, SSE Live-Updates, Responsive Grid

## Offen
- [ ] Rate Limiting pro API-Key (Requests/Minute)
- [ ] Multi-Tenancy (Organisationen, Key-Ownership)
- [ ] Celery/ARQ für persistente Background Tasks (Server-Restart-sicher)

## Entscheidungen
- Haiku für Agenten-Aktionen, Sonnet für Persona-Gen + Analyse + Chat
- FastAPI BackgroundTasks (kein Celery) — akzeptabel für Phase 1-6
- PostgreSQL als einziger Datenspeicher
- API-Keys als einzige Auth-Methode (kein JWT/OAuth)
- Stale-Reset beim Startup als Workaround für BackgroundTask-Verlust
- Tool Use (tool_choice forced) statt JSON-Freitext-Parsing — robuster, kein Parsing-Code nötig
- Multi-Action (1-3 pro Tick) statt Single-Action — realistischere Simulation
- Feed-Window: 5 Tage (ältere Posts irrelevant für Feed, Analyse hat weiterhin Zugriff auf alle)
- Wave-System 30/30/40% statt gleichzeitig — ermöglicht Reaktionsketten innerhalb eines Tages
- Homophilie statt Random für Social Connections — realistischere Netzwerkstrukturen
- Dynamischer Sozialer Graph — Verbindungen leben und sterben basierend auf Interaktion
- Emotionale Ansteckung — Stimmung breitet sich über soziale Verbindungen aus
- Influence Tracking — welcher Post hat wessen Meinung verändert
- Plattform-Migration — Personas entwickeln Plattform-Präferenzen basierend auf Engagement

## Blocker
- Keiner — ANTHROPIC_API_KEY + ADMIN_MASTER_KEY in .env setzen, dann startbereit
