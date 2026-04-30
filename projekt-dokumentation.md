# Projekt-Dokumentation: Soziale Simulations-Engine für Marktforschung

> **Status:** Konzeptphase  
> **Stand:** April 2026  
> **Autor:** Sascha  

---

## 1. Vision & Idee

### Kernidee
Eine KI-gestützte Simulations-Engine, die **virtuelle Gesellschaften** erschafft, um Marktreaktionen auf neue Produkte, Kampagnen oder Ideen vorherzusagen — bevor echtes Geld investiert wird.

Anstatt klassische Marktforschung (Umfragen, Fokusgruppen, A/B-Tests) betreibt das System eine **soziale Simulation**: Virtuelle KI-Personen mit echten Persönlichkeiten, Meinungen und Verhaltensweisen interagieren auf simulierten sozialen Plattformen und zeigen emergentes, realistisches Verhalten.

### Das Problem das gelöst wird
Unternehmen und SaaS-Anbieter stecken erhebliche Ressourcen in Marktanalyse bevor ein Produkt entwickelt wird:
- Ist Interesse vorhanden?
- Gibt es ähnliche Produkte?
- Was wünschen sich Nutzer?
- Welche Zielgruppen werden angesprochen — oder abgeschreckt?

Diese Fragen lassen sich heute erst nach dem Launch wirklich beantworten. Unsere Engine beantwortet sie **vorher**.

---

## 2. Referenzprojekt: MiroFish

### Was ist MiroFish?
MiroFish (GitHub: `666ghj/MiroFish`) ist ein chinesisches Open-Source-Projekt das die gleiche Grundidee verfolgt. Innerhalb von 24 Stunden nach Launch erhielt es 4,1 Mio. $ Funding und erreichte Platz 1 auf GitHub Trending.

### Warum wir es trotzdem selbst bauen

| Problem bei MiroFish | Unsere Lösung |
|---|---|
| Chinesisches UI, chinesische Infrastruktur | Europäisches Produkt, EU-Hosting |
| DSGVO-inkompatibel (Alibaba Cloud) | DSGVO-native von Anfang an |
| Auf chinesische Social-Dynamiken kalibriert | Europäische Gesellschaftsrealität |
| "Predict anything" — zu vage | Klarer B2B-Fokus: Marktforschung & Produktvalidierung |
| Wenig Transparenz im Reporting | Audit-Trail, nachvollziehbare Persona-Logik |

### Was wir besser machen
- Europäische Personas: politische Fragmentierung, Gewerkschaftsdenken, Datenskepsis, regionale Unterschiede (Bayern vs. Berlin vs. Wien)
- Transparente Analysen mit Konfidenz-Scores und Erklärungen
- Schlanke eigene Engine statt externer Framework-Abhängigkeiten (OASIS, Zep Cloud)
- PostgreSQL als Memory-Layer — bewährt, kontrollierbar, kein Cloud-Lock-in

---

## 3. Kernfunktionen

### 3.1 Eingabe-Phase
- Upload von Produkt-Dokumentation, MVP-Beschreibung, Kampagnenbriefing
- Angabe von Zielmarkt, Branche, relevanten Kontextinformationen
- Konfiguration der Simulation: Anzahl Personas, Laufzeit (Ingame-Tage), Zeitkompression

### 3.2 Persona-Generierung
Die KI leitet automatisch relevante Personengruppen ab — inklusive:
- **Zielgruppen** (z.B. bei Familien-App: Mütter, Väter, Alleinerziehende, Kinder)
- **Randfälle** (Politiker, Verbände, Supermarktketten)
- **Skeptiker und Gegner** (wichtig für Realitätsnähe — rein positive Simulation = Bestätigungsbias)

Jede Persona erhält:
- Eindeutige Persönlichkeit & Werte
- Sprach- und Kommunikationsstil
- Initiale Meinung zum Produkt
- Soziale Verbindungen zu anderen Personas

### 3.3 Plattform-Simulation

Zwei parallele fiktive Plattformen:

**FeedBook** (Facebook-ähnlich)
- Freundeslisten, Gruppen, Reaktionen
- Längere Posts, emotionalere Diskussionen

**Threadit** (Reddit-ähnlich)
- Subreddits/Themenräume, Upvotes
- Sachlichere Debatten, Nischen-Communities

### 3.4 Simulations-Loop (Tick-System)

```
1 Stunde Realzeit = 15 Ingame-Tage (konfigurierbar)

Pro Tick (= 1 Ingame-Tag):
  1. Weltstand einlesen (alle bisherigen Posts/Kommentare)
  2. Feed für jede Persona zusammenstellen (Algorithmus: was würde sie sehen?)
  3. API-Call: "Du bist [Persona]. Hier ist dein Feed. Was tust du?"
  4. Antworten sammeln → neue Posts/Kommentare in Weltstand schreiben
  5. Nächster Tick
```

**Emergentes Verhalten** entsteht natürlich:
- Ein kritischer Post geht "viral" → andere reagieren
- Filterblasen bilden sich
- Meinungen verschieben sich über Zeit
- Unerwartete Koalitionen entstehen

### 3.5 Analyse-Layer
Nach der Simulation:
- Sentiment-Verlauf über Zeit
- Identifikation von Wendepunkten
- Kritikpunkte und Chancen
- Zielgruppen-Segmentierung
- Überraschende Einwände

### 3.6 Interaktiver Chat
- **Mit dem Analysten** — übergeordnete Auswertung, strategische Fragen
- **Mit einzelnen Personas** — direktes Gespräch: "Warum würdest du die App nicht nutzen?"

---

## 4. Technische Architektur

### 4.1 Stack

```
Frontend          →  (noch offen, europäisches Design)
Backend           →  Python / FastAPI
Datenbank         →  PostgreSQL (Docker)
KI - Agenten      →  Haiku (Cloud) oder 7B quantisiert (Ollama, lokal)
KI - Analyse      →  Claude Sonnet (Cloud)
KI - Personas     →  Claude Sonnet (Cloud, einmalig pro Simulation)
Deployment        →  Docker / docker-compose
```

### 4.2 Modell-Strategie

| Aufgabe | Modell | Begründung |
|---|---|---|
| Persona-Generierung | Sonnet | Qualität entscheidend |
| Agenten-Aktionen (Posting, Kommentieren) | **Haiku** | Günstig, schnell, reicht völlig |
| Feed-Algorithmus / Weltlogik | Haiku | Kein Reasoning nötig |
| Analyse & Report | Sonnet | Qualität entscheidend |
| User-Chat danach | Sonnet | Qualität für Interaktion |

**Warum kein <3B Modell für Agenten:**
Unter 3B Parametern leidet die Persona-Konsistenz stark. "Thomas, 45, konservativer Familienvater" beginnt sich wie ein generischer Chatbot zu verhalten. 7B quantisiert (Q4, ~6–8 GB VRAM) ist das Minimum für stabile Ergebnisse lokal.

**Lokale Option (für datenschutzsensible Kunden):**
Ollama + Qwen 2.5 7B oder Llama 3.1 8B. Erfordert aber gute Hardware (RTX 3060 12GB minimum) und ist für Standard-Kunden zu langsam.

### 4.3 Docker-Setup (Entwicklungsphase)

```yaml
# docker-compose.yml
services:
  app:
    build: .
    ports:
      - "8000:8000"
    environment:
      - ANTHROPIC_API_KEY=${ANTHROPIC_API_KEY}
    depends_on:
      - db

  db:
    image: postgres:16
    environment:
      - POSTGRES_DB=simulation
      - POSTGRES_USER=sim_user
      - POSTGRES_PASSWORD=sim_pass
    volumes:
      - pgdata:/var/lib/postgresql/data

volumes:
  pgdata:
```

### 4.4 Datenmodell (grob)

```
simulations         — Metadaten, Status, Konfiguration
personas            — Charakter, Werte, Sprache, Verbindungen
posts               — Plattform, Autor, Inhalt, Timestamp (Ingame)
comments            — Referenz auf Post, Autor, Inhalt
reactions           — Like/Dislike/Share pro Persona pro Post
simulation_ticks    — Log jedes Tick-Zustands
analysis_reports    — Finale Auswertung pro Simulation
```

### 4.5 Kostenabschätzung (Entwicklungsphase, eigener Anthropic Account)

Pro Simulation (50 Agenten × 15 Ticks):

| Schicht | Modell | ~Calls | ~Kosten |
|---|---|---|---|
| Agenten-Aktionen | Haiku | 750 | ~$0.05 |
| Persona-Generierung | Sonnet | 1x | ~$0.02 |
| Analyse & Report | Sonnet | 1x | ~$0.05 |
| **Gesamt** | | | **~$0.12** |

---

## 5. Positionierung & USP

### Zielgruppe (primär)
- SaaS-Startups in der Produktentwicklung
- Marketing-Agenturen in der Kampagnenplanung
- Mittelständische Unternehmen vor Markteinführungen
- Politische Kommunikation / NGOs

### Alleinstellungsmerkmale
1. **DSGVO-native** — europäische Infrastruktur, keine chinesischen oder US-Abhängigkeiten
2. **Europäische Gesellschaftsrealität** — Personas die wirklich europäisch denken
3. **Realismus durch Skeptiker** — bewusste Integration von Gegnern und Kritikern
4. **Transparentes Reporting** — nachvollziehbare Entscheidungslogik, kein Black Box Output
5. **Interaktiver Dialog** — nicht nur Report, sondern Gespräch mit Personas danach
6. **B2B-Fokus** — klarer ROI statt "predict anything" Hype

---

## 6. Bekannte Risiken & offene Fragen

| Risiko | Einschätzung |
|---|---|
| KI neigt zu höflichen Personas | Skeptiker müssen explizit "scharf" gestellt werden im Prompt-Design |
| Polarisierungs-Bias in LLMs | LLMs verstärken Gruppenverhalten — muss in Analyse transparent kommuniziert werden |
| Durchsatz bei großen Simulationen | Batching-Strategie nötig, 10–20 concurrent Calls optimal |
| Persona-Konsistenz über viele Ticks | Charakter-Prompt + History muss sauber mitgeführt werden |
| Modellkosten bei Produktivbetrieb | Haiku für Agenten hält Kosten niedrig, Sonnet nur wo nötig |

---

## 7. Nächste Schritte

- [ ] Projektstruktur & Docker-Grundgerüst aufbauen
- [ ] FastAPI Skeleton mit Anthropic-Integration
- [ ] PostgreSQL Datenmodell definieren
- [ ] Ersten Tick-Loop implementieren (5 Personas, 3 Ticks)
- [ ] Persona-Generierung aus Produkt-Input
- [ ] Simples Frontend für Eingabe und Feed-Ansicht
- [ ] Analyse-Layer (Sonnet)
- [ ] Chat-Interface mit Personas

---

*Dieses Dokument wird laufend aktualisiert.*
