---
type: subagent-memory
agent: code
modul: simulation_engine_async
created: 2026-04-29
status: completed
---

## Was wurde getan

Alle vier Dateien der Simulation Engine wurden vollständig auf async umgestellt und neu implementiert:

1. **persona_generator.py** — Von sync (`anthropic.Anthropic`) auf `anthropic.AsyncAnthropic` migriert. `generate_personas()` ist jetzt `async def`. System-Prompt auf europäische Gesellschaftsrealität und min. 20% Skeptiker-Quote ausgelegt.

2. **tick_engine.py** — Komplette Neufassung als async Engine:
   - `build_feed()` bleibt sync (kein I/O), berechnet Score = Verbindungen×3 + Kommentare×0.5 + Reaktionen
   - `build_persona_prompt()` neu als sync Hilfsfunktion mit Persona-Basisprofil + current_state + Feed
   - `persona_action()` async mit `async with semaphore:` Schutz, JSON-Extraktion via find/rfind, Fallback `{"action": "nothing"}`
   - `update_persona_state()` sync, Ringpuffer max 5 Einträge in `recent_actions`
   - `run_tick()` async, lädt Simulation via `selectinload` (kein Lazy Loading), `asyncio.gather(..., return_exceptions=True)` für parallele Persona-Calls, schreibt Posts/Comments/Reactions in DB, endet mit `await db.flush()` (kein commit)

3. **runner.py** — Neue Datei. Background-Task-Orchestrator mit eigenem `AsyncSessionLocal`-Context. Globaler `asyncio.Semaphore(10)`. Steuert: Persona-Generierung → Social Connections → Tick-Schleife → Report → Status-Update. Fehlerbehandlung via separater Session für `failed`-Status.

4. **report_generator.py** — Von sync auf `anthropic.AsyncAnthropic` migriert. Lädt Posts mit `selectinload(Post.author)`, `selectinload(Post.comments).selectinload(Comment.author)`, `selectinload(Post.reactions)`. Ruft `claude-sonnet-4-6` async auf. Committet nach `db.refresh(report)`.

## Erstellte/geänderte Dateien

- `W:\Dev\Privat\Simulator\app\simulation\persona_generator.py` — ersetzt
- `W:\Dev\Privat\Simulator\app\simulation\tick_engine.py` — ersetzt
- `W:\Dev\Privat\Simulator\app\simulation\runner.py` — neu erstellt
- `W:\Dev\Privat\Simulator\app\analysis\report_generator.py` — ersetzt
- `W:\Dev\Privat\Simulator\memory\subagents\code_simulation_engine.md` — neu erstellt

## Übergabe-Hinweise

**Router-Agent:**
- `run_simulation_background(simulation_id: UUID)` ist der Einstiegspunkt für FastAPI `BackgroundTasks`
- Import: `from app.simulation.runner import run_simulation_background`
- Der globale `semaphore` in `runner.py` gilt prozessweit für alle laufenden Simulationen
- `run_tick()` macht kein `commit` — nur `flush()`. Der Runner committed nach jedem Tick.

**Debugger:**
- Alle Anthropic-Calls verwenden `AsyncAnthropic` — kein `Anthropic` (sync) mehr in diesen Modulen
- `asyncio.gather(..., return_exceptions=True)` ist bewusst gesetzt: Exceptions von einzelnen Persona-Calls werden als `{"action": "nothing"}` behandelt, nicht raised
- SQLAlchemy: Kein Lazy Loading irgendwo — alle Relationships sind explizit via `selectinload` geladen bevor auf `.comments`, `.reactions`, `.author` zugegriffen wird
- `persona.current_state` wird nach jedem Tick direkt am ORM-Objekt gesetzt (kein separates `db.execute(update(...))` pro Persona) — SQLAlchemy trackt die Änderung via `expire_on_commit=False`
- `run_simulation_background` öffnet für den Report eine zweite Session (`AsyncSessionLocal`) und für den Fehlerfall eine dritte — das ist gewollt

## Offene Punkte

- `opinion_evolution` und `mood` im `current_state` werden von `update_persona_state()` nicht aktiv fortgeschrieben — sie werden beim ersten Tick initialisiert, danach aber nicht durch die Engine aktualisiert. Falls dynamische Meinungsentwicklung gewünscht ist, müsste ein weiterer Haiku-Call oder eine Heuristik in `persona_action()` / `update_persona_state()` ergänzt werden.
- Der `unused import anthropic` in `runner.py` (aus dem vorgegebenen Skeleton übernommen) ist nicht funktional — der async_client liegt in den Submodulen. Kann entfernt werden ohne Auswirkung.
- `Simulation.personas` wird in `generate_report()` via `selectinload(Simulation.personas)` geladen, aber die Personas-Relationships (Posts, Comments etc.) werden dort nicht benötigt — nur `is_skeptic` und `name`. Das ist korrekt und effizient.
