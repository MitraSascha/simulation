# Memory Index — Soziale Simulations-Engine

> Gepflegt von der Manager-KI. Jede neue Memory-Datei bekommt hier einen Eintrag.

## Projekt-Memory

- [Projektstatus](project/project_status.md) — Aktueller Stand, offene Aufgaben, Blocker
- [Architekturentscheidungen](project/project_decisions.md) — Getroffene Tech- & Design-Entscheidungen
- [Abhängigkeiten](project/project_dependencies.md) — API-Keys, externe Dienste, Status

## Subagent-Memory

- [Research: Async Patterns](subagents/research_async_patterns.md) — Async SQLAlchemy, Alembic, Anthropic SDK async, Persona-History
- [Architekt: Phase 1 Refactor](subagents/architect_phase1.md) — Implementierungsplan, Dateiliste, kritische Details
- [Code: Fundament & Schemas](subagents/code_fundament.md) — database.py, Pydantic Schemas, Alembic Setup
- [Code: Simulation Engine](subagents/code_simulation_engine.md) — tick_engine.py, runner.py, persona_generator.py, report_generator.py
- [Code: Router](subagents/code_routers.md) — Alle 4 async Router mit Pydantic
- [Code: Phase 2 Observability](subagents/code_phase2_observability.md) — SSE Stream, Logging Middleware, Error Handler
- [Code: Phase 3a Chat](subagents/code_phase3a_chat.md) — Chat-Interface mit einzelnen Personas
- [Code: Phase 3b State Evolution](subagents/code_phase3b_state_evolution.md) — opinion_evolution + mood aktiv per Haiku fortschreiben
- [Code: Phase 3c Auth](subagents/code_phase3c_auth.md) — API-Key Auth, Admin-Endpoints, SHA-256 Hash-Speicherung
- [Code: Phase 4a Management](subagents/code_phase4a_management.md) — Cancel, Reset, Stats Endpoints
- [Code: Phase 4b Logging + Migration](subagents/code_phase4b_logging_migration.md) — Logging in Engine, initiale Alembic-Migration
- [Code: Phase 4c Pagination](subagents/code_phase4c_pagination.md) — limit/offset + Filter auf simulations/personas/posts
- [Code: Phase 4d Export](subagents/code_phase4d_export.md) — JSON + CSV Export Endpoints
- [Code: Phase 4e Webhooks](subagents/code_phase4e_webhooks.md) — Webhook-Dispatch bei completed/failed
- [Code: Phase 5a Clone+Suche](subagents/code_phase5a_clone_search.md) — Simulation klonen, Namenssuche
- [Code: Phase 5b Validierung](subagents/code_phase5b_validation.md) — Pydantic Field-Constraints, RequestValidationError Handler
- [Code: Phase 5c Health+Metrics](subagents/code_phase5c_health_metrics.md) — DB Health Check, /metrics Endpoint
- [Code: Phase 6a Retry](subagents/code_phase6a_retry.md) — Exponential Backoff für alle Anthropic-Calls
- [Code: Phase 6b Concurrency Guard](subagents/code_phase6b_concurrency_guard.md) — Max concurrent simulations, stale simulation reset
- [Code: Phase 7 Engine-Optimierung](subagents/code_phase7_engine_optimization.md) — Tool Use, Multi-Action, Feed-Verbesserungen, Parallelisierung
- [Architekt: LLM-Provider-Abstraktion](subagents/architect_llm_providers.md) — Anthropic + OpenAI austauschbar, pro Simulation in DB
