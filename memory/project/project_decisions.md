---
type: project
updated: 2026-04-29
phase: 0
---

## Architekturentscheidungen

### Modell-Strategie
- **Haiku** für alle Agenten-Aktionen (Posting, Kommentieren, Reagieren)
  - Begründung: günstig (~$0.05 für 750 Calls), schnell, Qualität ausreichend
- **Sonnet** für Persona-Generierung, Analyse-Report, User-Chat
  - Begründung: Qualität entscheidend, selten aufgerufen

### Datenbankschema
- UUID als Primary Keys überall (Portabilität, kein Auto-Increment-Leak)
- `ingame_day` als Integer auf Posts/Comments/Reactions (kein DateTime-Chaos)
- `social_connections` in Persona als JSON-Array von UUIDs (einfach, kein Join-Table nötig in Phase 0)

### Feed-Algorithmus (Phase 0, vereinfacht)
- Score = Verbindungen × 3 + Kommentare × 0.5 + Reaktionen
- Top 10 Posts pro Persona pro Tick
- Kein Machine-Learning, kein Embedding — plain Python

### Zwei Plattformen
- FeedBook (Facebook-ähnlich): emotionale Posts, Freundeslisten
- Threadit (Reddit-ähnlich): Subreddits, sachlichere Debatten
- Gemeinsames Post-Modell mit `platform`-Enum und optionalem `subreddit`-Feld

### DSGVO
- Kein US-Cloud-Hosting
- Anthropic API ist das einzige externe System — keine personenbezogenen Echtdaten senden
