---
type: subagent-memory
agent: architect
modul: llm-providers
created: 2026-04-30
status: completed
---

## Was wurde getan
Provider-Abstraktion für Anthropic Claude und OpenAI GPT eingeführt. Jede Simulation
speichert ihren Provider in der DB; bestehende Sims bleiben auf Anthropic.

## Ergebnisse / Outputs
- `app/llm/provider.py` — abstract LLMProvider mit call_tool() + chat()
- `app/llm/anthropic_impl.py` — extrahiert aus den vier alten Call-Sites
- `app/llm/openai_impl.py` — neu, mit gpt-4o-mini (fast) + gpt-4o (smart)
- `app/llm/factory.py` — get_provider("anthropic"|"openai") mit Singleton-Cache
- `app/models/simulation.py` — Spalte `llm_provider` (default "anthropic")
- `alembic/versions/006_add_llm_provider.py`
- `app/schemas/simulation.py` — `llm_provider: Literal["anthropic","openai"]`
- `app/simulation/persona_generator.py`, `tick_engine.py`, `analysis/report_generator.py`,
  `routers/chat.py` — alle migriert auf provider.call_tool / provider.chat
- `app/routers/simulations.py` — Clone übernimmt Provider
- Frontend: Wizard-Step 2 hat Provider-Dropdown (Anthropic | OpenAI)
- `docs/architecture/llm_providers.md` — Architektur, Caveats, Smoke-Test-Anleitung
- `requirements.txt` — `openai==1.54.0` ergänzt
- `.env.example` — OPENAI_API_KEY + optionale Modell-Overrides

## Wichtige Entscheidungen
- Zwei Tiers: "fast" und "smart". Konkrete Modelle pro Provider in Settings,
  d.h. Modellwechsel = .env-Edit, kein Code-Change.
- Provider pro Simulation persistent — kein globaler Schalter. Bestehende Sims
  bleiben durch Default "anthropic" funktionsfähig.
- UserBlock-Liste mit cache-Flag pro Block — Anthropic nutzt cache_control:ephemeral,
  OpenAI no-op (cached automatisch).
- Retry kapselt jede Implementation selbst (provider-spezifische Exception-Typen).
- `app/utils/retry.py` ist nicht mehr referenziert, aber als Datei belassen.
- OpenAI-Lazy-Import: das `openai`-Paket wird erst beim ersten Provider-Bau geladen,
  damit Anthropic-only Setups nicht zwingend openai installieren müssen.

## Übergabe-Hinweise
- Vor erstem OpenAI-Run: `alembic upgrade head` für Migration 006 + `pip install openai==1.54.0`.
- Smoke-Test ist user-getrieben — siehe `docs/architecture/llm_providers.md` Abschnitt
  "Smoke-Test".
- Wenn OpenAI Skeptiker-Anteil unterschreitet, im Persona-System-Prompt nachschärfen.

## Offene Punkte
- Smoke-Test selbst (zwei 5×3-Sims, je ein Provider) noch nicht gelaufen.
- 200er-Sim (Task #15) noch ausstehend — unabhängig vom Provider-Refactor.
