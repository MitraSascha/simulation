---
type: subagent-memory
agent: architect
modul: model-overrides
created: 2026-04-30
status: completed
---

## Was wurde getan
Modellauswahl pro Rolle eingeführt. Der Wizard bietet drei Modi (Standard / Premium /
Custom). Die ausgewählten Modelle werden pro Simulation in der DB gespeichert und
durchlaufen alle Call-Sites. Defaults für OpenAI auf GPT-5-Familie umgestellt.

## Ergebnisse / Outputs
- `app/llm/provider.py` — `call_tool` und `chat` bekommen optionalen `model: str | None`-Parameter.
- `app/llm/anthropic_impl.py` + `openai_impl.py` — `_resolve_model(tier, override)` setzt Override durch.
- `app/llm/__init__.py` — Helper `resolve_model(sim, tier)` für Call-Sites.
- `app/models/simulation.py` + Migration 007 — Spalten `llm_model_fast`, `llm_model_smart` (nullable).
- `app/schemas/simulation.py` — SimulationCreate + SimulationRead um die zwei Felder erweitert.
- Call-Sites lesen Custom-Modelle:
  - `runner.py` — reicht `sim.llm_model_smart` an `generate_personas` durch.
  - `tick_engine.py` — `run_tick` liest `sim.llm_model_fast` und reicht es an `persona_action` + `update_persona_state_async`.
  - `routers/analysis.py` — Manual-Trigger Report nutzt `sim.llm_model_smart`.
  - `routers/chat.py` — Chat nutzt `sim.llm_model_smart`.
- `app/config.py` — OpenAI-Defaults: `gpt-5-mini` (fast) / `gpt-5` (smart).
- `.env.example` — angepasst.
- Frontend Wizard: "Erweitert"-Toggle mit Modus-Buttons (Standard / Premium / Custom).
  Bei Custom zwei Dropdowns mit Modell-Liste je Provider. Premium-Modus mappt das
  Smart-Modell auch auf den Fast-Slot.

## Wichtige Entscheidungen
- Keine Backend-Validierung der Modellnamen — Frontend gibt kuratierte Liste vor,
  Provider lehnt unbekannte Modelle ohnehin mit BadRequest ab.
- Premium-Modus = Smart-Modell auch für Fast-Slot, statt eigenes "Top-Tier"-Konzept.
  Spart UI-Komplexität, deckt den realen Wunsch ("alles Sonnet/GPT-5") ab.
- Bestehende Sims (vor Migration 007) haben llm_model_fast/smart = NULL → Tier-Default
  greift, nichts bricht.
- Provider-Default-Modelle werden nur **bei Provider-Build** aus Settings gelesen
  (Singleton-Cache). Settings-Änderung erfordert Restart — bewusste Vereinfachung.

## Übergabe-Hinweise
- Migration 007 muss laufen: `alembic upgrade head`.
- Im Container neue OpenAI-Defaults nehmen — kein Code-Change nötig, falls
  Settings Override in `.env` bestehen.
- Wenn Anthropic-Tier nicht ausreicht: Im Wizard "OpenAI" + Standard-Modus wählen
  (nutzt gpt-5-mini für Aktionen → 500k TPM Headroom).

## Offene Punkte
- Modell-Liste im Frontend ist hardcoded — bei neuen Modellen muss `modelOptions`
  aktualisiert werden.
- Token-Budget-Pacer (Punkt B aus dem Roadmap-Gespräch) noch nicht implementiert.
- Kosten-Schätzung im Wizard berücksichtigt Premium-Modus / Custom-Modelle nicht.
