---
type: subagent-memory
agent: code
modul: phase3b_state_evolution
created: 2026-04-29
status: completed
---

## Was wurde getan

Die Persona-State-Evolution in `app/simulation/tick_engine.py` wurde von passiv (nur Ringpuffer) auf aktiv (Haiku-Call pro Tick) umgestellt:

- Die alte sync-Funktion `update_persona_state` wurde durch die neue async-Funktion `update_persona_state_async` ersetzt.
- `update_persona_state_async` befüllt weiterhin den `recent_actions`-Ringpuffer (max 5), setzt aber danach einen Mini-Haiku-Call ab, der `opinion_evolution` (1-2 Sätze) und `mood` (ein Wort) aktualisiert.
- Bei Fehler im Haiku-Call bleiben `opinion_evolution` und `mood` aus dem bestehenden State unverändert erhalten.
- Die Hilfsfunktion `_derive_action_summary(action)` wurde ergänzt, die aus einem Action-Dict eine lesbare Zusammenfassung ableitet (post/comment/react/nothing).
- In `run_tick` wurde der Verarbeitungsblock in zwei Phasen aufgeteilt:
  1. DB-Writes + action_summary ableiten (wie bisher, im Loop über results)
  2. State-Updates sequenziell via `await update_persona_state_async(...)` (nicht in einem gather, da die Funktion selbst die Semaphore verwendet)
- Ein eigenes `STATE_SYSTEM_PROMPT` wurde für den Haiku-State-Call definiert.

## Erstellte/geänderte Dateien

- `W:\Dev\Privat\Simulator\app\simulation\tick_engine.py` — vollständig neu geschrieben
- `W:\Dev\Privat\Simulator\memory\subagents\code_phase3b_state_evolution.md` — diese Datei

## Übergabe-Hinweise

- `update_persona_state_async` erwartet die Semaphore als letztes Argument; sie wartet selbst auf freie Slots (globale Rate-Limit-Kontrolle).
- Die State-Updates laufen nach dem Haupt-gather sequenziell, damit die Semaphore nicht doppelt belastet wird.
- Das verwendete Modell für State-Updates ist `claude-haiku-4-5-20251001` mit `max_tokens=256`.
- Die alte sync-Funktion `update_persona_state` wurde vollständig entfernt; `_derive_action_summary` übernimmt die Summary-Ableitung für den nothing-Fall.

## Offene Punkte

- Fehlerlogging für fehlgeschlagene Haiku-State-Calls ist derzeit stumm (`pass`). Bei Bedarf kann hier ein Logger ergänzt werden.
- Die Semaphore-Größe (aktuell im Runner festgelegt) bestimmt auch die Parallelität der State-Calls; bei vielen Personas kann die sequenzielle Schleife den Tick verlängern.
- `max_tokens=256` für den State-Call ist knapp bemessen; bei langen `opinion_evolution`-Texten ggf. auf 384 erhöhen.
