---
type: subagent-memory
agent: code
modul: phase7-engine-optimization
created: 2026-04-29
status: completed
---

## Was wurde getan
Komplette Überarbeitung der Simulations-Engine in 4 Dateien basierend auf einer Code-Review.

## Ergebnisse / Outputs

### tick_engine.py (Hauptänderungen)
- State-Updates von sequenziell auf parallel umgestellt (asyncio.gather)
- Posts werden nur noch für letzte 5 Ingame-Tage geladen (statt alle)
- Feed-Algorithmus: Recency-Decay + Trending-Bonus hinzugefügt
- Post-ID-Validierung: ungültige comment_on_post_id/react_to_post_id werden abgefangen
- Fragiles JSON-Parsing (raw.find("{")) durch Anthropic tool_use ersetzt
- Multi-Action: Personas können 1-3 Aktionen pro Tick durchführen
- Prompt Caching: cache_control auf System-Prompt und Persona-Profil
- Toter Code (build_persona_prompt) entfernt, ersetzt durch _build_persona_profile_block

### persona_generator.py
- Modell von Haiku auf Sonnet umgestellt (claude-sonnet-4-6-20250514)
- JSON-Array-Parsing durch tool_use (create_personas Tool) ersetzt

### report_generator.py
- Alle strukturierten DB-Felder werden jetzt befüllt (waren vorher NULL)
- tool_use (analysis_report Tool) statt Freitext
- max_tokens von 4096 auf 8192 erhöht

### runner.py
- Cancellation-Check vor jedem Tick (prüft SimulationStatus.running)
- Semaphore aus settings.default_agent_concurrent_calls statt hardcoded 10
- datetime.utcnow() durch datetime.now(timezone.utc) ersetzt (5 Stellen)
- Max Concurrent Simulations wird vor Start geprüft (mit func.count)

## Wichtige Entscheidungen
- Tool Use mit tool_choice forced: garantiert valides JSON, eliminiert Parsing-Fehler
- Multi-Action 1-3 pro Tick: mehr Dynamik ohne zusätzliche API-Calls
- Feed-Window 5 Tage: Skalierbarkeit, ohne Analyseverlust (Report nutzt eigene Query)
- update_persona_state_async Signatur geändert: nimmt jetzt action_summaries (list[str]) statt einzelne Parameter

## Übergabe-Hinweise
- Die Signatur von update_persona_state_async hat sich geändert — alte Parameter (action, action_type, action_summary) sind jetzt zusammengefasst zu action_summaries: list[str]
- persona_action gibt jetzt {"actions": [...]} statt {action: ...} zurück
- build_persona_prompt existiert nicht mehr, _build_persona_profile_block + inline Feed-Text werden verwendet

## Offene Punkte
- Mini-Batches (Wave-System) innerhalb eines Ticks noch nicht implementiert
- Homophilie-basierte Social Connections noch nicht implementiert
- PII-Filter fehlt noch (DSGVO-Pflicht lt. CLAUDE.md)
