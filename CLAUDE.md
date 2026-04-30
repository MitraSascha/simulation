# Soziale Simulations-Engine — CLAUDE.md
**Verhaltensregeln für Manager-KI und alle Subagents**

---

## Projekt-Kontext

KI-gestützte Simulations-Engine, die **virtuelle Gesellschaften** erschafft, um Marktreaktionen auf neue Produkte, Kampagnen oder Ideen vorherzusagen.  
Stack: **Python / FastAPI · PostgreSQL · Anthropic API (Haiku + Sonnet) · Docker**  
Ziel: DSGVO-natives, europäisches Produkt als Alternative zu MiroFish.

---

## Rollen

### Manager-KI
- Koordiniert das gesamte Projekt
- Delegiert Aufgaben an spezialisierte Subagents
- Startet **maximal 3 Subagents gleichzeitig**
- Liest Berichte der Subagents und entscheidet über nächste Schritte
- Schreibt und pflegt ausschließlich die **Projekt-Memory**
- Erstellt und pflegt die Dokumentation in `docs/`

### Subagents
- Jeder Subagent kümmert sich **ausschließlich um seine zugewiesene Aufgabe**
- Kein Subagent greift in den Zuständigkeitsbereich eines anderen ein
- Jeder Subagent **erstellt nach Abschluss seiner Aufgabe eine eigene Memory-Datei**
- Subagents kommunizieren nicht direkt miteinander — nur über Manager-KI und Memory-Dateien

---

## Subagent-Übersicht & Zuständigkeiten

| Subagent | Zuständigkeit | Darf NICHT |
|---|---|---|
| `angular-agents:research-agent` | Webrecherche, Bibliotheken, Best Practices, Anthropic API-Docs | Code schreiben, Architektur entscheiden |
| `angular-agents:angular-architect` | Architekturplanung, Datenmodell, Modulstruktur (FastAPI/PostgreSQL) | Code implementieren, Tests schreiben |
| `angular-agents:code-specialist` | Python, FastAPI-Endpoints, Datenbankschemas implementieren | Architektur ändern, Tests schreiben |
| `angular-agents:state-manager` | Simulations-Loop (Tick-System), Persona-State, Batching-Logik | API-Schicht bauen, Architektur entscheiden |
| `angular-agents:testing-agent` | Unit-, Integration-, E2E-Tests schreiben | Produktionscode ändern |
| `angular-agents:angular-debugger` | Fehleranalyse & Fixes (Python, API, DB, Simulation) | Features hinzufügen, Architektur ändern |

---

## Parallelisierungsregel

```
Max. 3 Subagents gleichzeitig aktiv.

Erlaubt (Beispiel):
  research-agent + angular-architect + state-manager  ✓

Nicht erlaubt:
  4 oder mehr Subagents parallel                      ✗
```

Sequenziell wenn Abhängigkeit besteht:
```
research-agent → (Bericht) → angular-architect → (Architektur-Bericht) → code-specialist
```

---

## Verzeichnisstruktur

```
W:\Dev\Privat\Simulator\
│
├── CLAUDE.md                          ← Diese Datei (Verhaltensregeln)
├── projekt-dokumentation.md           ← Vollständige Projektbeschreibung & Vision
│
├── doku/                              ← Planungs- & Projektdokumentation
│   ├── ablaufplan_subagents.md        ← Entwicklungs-Ablaufplan
│   ├── architektur.md                 ← Architekturentscheidungen
│   └── api_design.md                  ← FastAPI Endpoint-Design
│
├── memory/                            ← Memory-System
│   ├── MEMORY.md                      ← Index aller Memory-Dateien (Manager-KI pflegt)
│   ├── project/                       ← Projekt-Memory (nur Manager-KI schreibt)
│   │   ├── project_status.md          ← Aktueller Projektstatus & offene Aufgaben
│   │   ├── project_decisions.md       ← Getroffene Architektur- & Tech-Entscheidungen
│   │   └── project_dependencies.md    ← Abhängigkeiten, API-Keys-Status
│   └── subagents/                     ← Subagent-Memory (jeweiliger Subagent schreibt)
│       ├── research_<thema>.md        ← research-agent Memory
│       ├── architect_<modul>.md       ← architect Memory
│       ├── code_<modul>.md            ← code-specialist Memory
│       ├── simulation_<modul>.md      ← state-manager / Simulation-Loop Memory
│       ├── testing_<modul>.md         ← testing-agent Memory
│       └── debug_<issue>.md           ← debugger Memory
│
├── docs/                              ← Technische Dokumentation (Manager-KI erstellt)
│   ├── api/                           ← FastAPI Endpoint-Dokumentation
│   ├── simulation/                    ← Tick-System, Persona-Logik, Feed-Algorithmus
│   └── architecture/                  ← Architektur-Diagramme & Entscheidungen
│
└── app/                               ← Python-Projektcode (wird in Phase 0.1 angelegt)
    ├── main.py                        ← FastAPI Einstiegspunkt
    ├── models/                        ← PostgreSQL Datenmodelle
    ├── routers/                       ← API-Endpoints
    ├── simulation/                    ← Tick-Loop, Persona-Engine, Feed-Algorithmus
    ├── analysis/                      ← Analyse-Layer (Sonnet)
    └── schemas/                       ← Pydantic Schemas
```

---

## Memory-System

### Projekt-Memory (nur Manager-KI)

**Dateipfad:** `memory/project/`

Manager-KI schreibt Projekt-Memory nach:
- Abschluss einer Phase
- Wichtigen Architekturentscheidungen
- Änderungen am Ablaufplan
- Neu bekannten Abhängigkeiten oder Blockern

**Format Projekt-Memory-Datei:**
```markdown
---
type: project
updated: YYYY-MM-DD
phase: 0 | 1 | 2 | 3 | 4
---

## Status
[Kurze Beschreibung was gerade steht]

## Abgeschlossen
- [Was fertig ist]

## Offen
- [Was noch aussteht]

## Entscheidungen
- [Getroffene Entscheidungen mit Begründung]

## Blocker
- [Was blockiert ist und warum]
```

---

### Subagent-Memory (jeweiliger Subagent)

**Dateipfad:** `memory/subagents/<subagent>_<thema>.md`

Jeder Subagent erstellt **am Ende seiner Aufgabe** eine Memory-Datei.  
Diese wird vom nächsten Subagent gelesen, bevor er mit seiner Arbeit beginnt.

**Format Subagent-Memory-Datei:**
```markdown
---
type: subagent-memory
agent: research | architect | code | simulation | testing | debug
modul: <modulname>
created: YYYY-MM-DD
status: completed | partial
---

## Was wurde getan
[Kurze Zusammenfassung der erledigten Aufgabe]

## Ergebnisse / Outputs
[Dateipfade, wichtige Erkenntnisse, erstellte Strukturen]

## Wichtige Entscheidungen
[Was wurde entschieden und warum]

## Übergabe-Hinweise
[Was der nächste Subagent wissen muss, bevor er anfängt]

## Offene Punkte
[Was nicht erledigt wurde / für später notwendig]
```

---

## Dokumentationsregeln

- Jedes implementierte Modul bekommt einen Eintrag in `docs/simulation/` oder `docs/api/`
- Jeder FastAPI-Endpoint wird in `docs/api/` dokumentiert
- Architekturentscheidungen werden in `docs/architecture/` festgehalten
- Manager-KI aktualisiert `memory/MEMORY.md` (Index) nach jeder neuen Memory-Datei

---

## DSGVO-Pflicht (für alle Subagents verbindlich)

Vor **jedem** Claude API-Aufruf mit Nutzerdaten gilt:

```
1. PII-Filter über den Text laufen lassen
2. Namen, Adressen, Telefon → Platzhalter ersetzen
3. Erst dann → Anthropic API
```

Speicherung auf eigenem Server oder lokalem PC ist unbeschränkt erlaubt.  
Personenbezogene Daten verlassen den Server **niemals unzensiert**.  
Hosting ausschließlich auf **EU-Infrastruktur** (kein US-Cloud-Lock-in).

---

## Technologie-Stack (Kurzreferenz)

| Bereich | Technologie |
|---|---|
| Backend | Python / FastAPI |
| Datenbank | PostgreSQL 16 (Docker) |
| KI — Agenten-Aktionen | Claude Haiku (günstig, schnell, ausreichend) |
| KI — Persona-Generierung | Claude Sonnet (Qualität entscheidend) |
| KI — Analyse & Report | Claude Sonnet (Qualität entscheidend) |
| KI — User-Chat | Claude Sonnet |
| Lokale Option | Ollama + Qwen 2.5 7B / Llama 3.1 8B (datenschutzsensible Kunden) |
| Deployment | Docker / docker-compose |
| Frontend | noch offen |

---

## Modell-Strategie (verbindlich für alle Subagents)

| Aufgabe | Modell | Begründung |
|---|---|---|
| Persona-Generierung | Sonnet | Qualität entscheidend |
| Agenten-Aktionen (Posting, Kommentieren) | **Haiku** | Günstig, schnell, reicht völlig |
| Feed-Algorithmus / Weltlogik | Haiku | Kein Reasoning nötig |
| Analyse & Report | Sonnet | Qualität entscheidend |
| User-Chat danach | Sonnet | Qualität für Interaktion |

> **Regel:** Haiku wo möglich, Sonnet nur wo Qualität entscheidend ist.  
> Zielkosten pro Simulation (50 Agenten × 15 Ticks): **~$0.12**

---

## Simulations-Logik (Kurzreferenz für alle Subagents)

```
1 Stunde Realzeit = 15 Ingame-Tage (konfigurierbar)

Pro Tick (= 1 Ingame-Tag):
  1. Weltstand einlesen (alle bisherigen Posts/Kommentare)
  2. Feed für jede Persona zusammenstellen (Algorithmus: was würde sie sehen?)
  3. API-Call: "Du bist [Persona]. Hier ist dein Feed. Was tust du?"
  4. Antworten sammeln → neue Posts/Kommentare in Weltstand schreiben
  5. Nächster Tick
```

**Simulierte Plattformen:**
- **FeedBook** — Facebook-ähnlich (Freundeslisten, Gruppen, emotionale Posts)
- **Threadit** — Reddit-ähnlich (Subreddits, Upvotes, sachliche Debatten)

**Bekannte Risiken — immer im Blick behalten:**
- KI neigt zu höflichen Personas → Skeptiker explizit "scharf" stellen
- Persona-Konsistenz: Charakter-Prompt + History sauber mitführen
- Batching: 10–20 concurrent Calls optimal

---

## Ablaufplan

Detaillierter Entwicklungs-Ablaufplan: `doku/ablaufplan_subagents.md`
