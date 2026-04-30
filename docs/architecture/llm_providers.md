# LLM-Provider — Anthropic Claude & OpenAI GPT

Stand: 2026-04-30

Die Simulations-Engine unterstützt zwei austauschbare LLM-Anbieter:

| Provider | Fast (Agenten-Aktionen, State-Update) | Smart (Persona-Gen, Report, Chat) |
|---|---|---|
| `anthropic` | claude-haiku-4-5-20251001 | claude-sonnet-4-6 |
| `openai`    | gpt-4o-mini               | gpt-4o                |

Modellnamen sind über Settings konfigurierbar (`anthropic_model_*`, `openai_model_*`).

## Auswahl pro Simulation

Jede Simulation speichert ihren Provider in `simulations.llm_provider` (Migration 006).
Der Wert wird im Wizard (Step 2) gewählt und ändert sich nicht mehr — geklonte Simulationen
übernehmen den Provider des Originals. Bestehende Simulationen vor dem Migrations-Run
bekommen den Default `anthropic`.

## Architektur

```
app/llm/
  provider.py       # LLMProvider (abstract)
  anthropic_impl.py # AnthropicProvider
  openai_impl.py    # OpenAIProvider
  factory.py        # get_provider("anthropic"|"openai") — Singleton-Cache
```

Zwei Methoden reichen für alle Use-Cases:

- `call_tool(tier, system, cache_system, user_blocks, tool_name, tool_description, tool_schema, max_tokens) -> dict`
  Erzwungener Tool-Use. Liefert die geparsten Tool-Argumente.
- `chat(tier, system, messages, max_tokens) -> str`
  Freie Textantwort (für Persona-Chat).

`UserBlock` (TypedDict) erlaubt mehrere Text-Blöcke pro User-Message. Das `cache`-Flag
markiert Blöcke, die der Provider bevorzugt cachen soll — Anthropic setzt
`cache_control: ephemeral`, OpenAI ignoriert das Flag (cached automatisch ab ~1024 Token Prefix).

## Tool-Schema

Tool-Schemas sind JSON-Schema und beide Provider akzeptieren sie unverändert. Die
Implementations bauen das Schema je nach Provider in das passende Wrapper-Objekt:

- Anthropic: `{name, description, input_schema}` mit `tool_choice={"type":"tool","name":...}`.
- OpenAI:    `{type: "function", function: {name, description, parameters}}` mit `tool_choice={"type":"function","function":{"name":...}}`.

## Retry & Fehlerklassen

Jede Implementation kapselt ihren eigenen Retry-Loop (Exponential Backoff, max 3 Versuche).

Retryable:
- Anthropic: `RateLimitError`, `InternalServerError`, `APIConnectionError`
- OpenAI:    `RateLimitError`, `APIConnectionError`, `InternalServerError`

Auth- und BadRequest-Fehler werden direkt durchgereicht.

## Caching-Caveat

Anthropic Prompt Caching ist explizit (`cache_control: ephemeral`). OpenAI cached
automatisch ab ~1024 Token Prefix, ohne Konfigurations-API. Bei OpenAI ist die
Cache-Hit-Rate dadurch typischerweise 5–15 % niedriger als bei Anthropic mit
explizitem Caching auf System-Prompt + Persona-Profil. Effekt: OpenAI-Sims sind
in der Praxis ~10–20 % teurer als Anthropic-Sims gleicher Größe — das gleicht sich
durch günstigere Modellpreise wieder aus.

## Persona-Qualität

Sonnet und GPT-4o schreiben unterschiedlich (Tonfall, Längen, Skeptiker-Schärfe).
Bei OpenAI kann der 20-%-Skeptiker-Anteil unterschritten werden — wenn das im
Smoke-Test sichtbar wird, im Persona-System-Prompt nachschärfen.

## .env

```
ANTHROPIC_API_KEY=sk-ant-...
OPENAI_API_KEY=sk-...

# Optional (Defaults wie unten)
ANTHROPIC_MODEL_FAST=claude-haiku-4-5-20251001
ANTHROPIC_MODEL_SMART=claude-sonnet-4-6
OPENAI_MODEL_FAST=gpt-4o-mini
OPENAI_MODEL_SMART=gpt-4o
```

Wenn nur ein Anbieter genutzt werden soll, reicht es, dessen Key zu setzen — der
andere Provider wird erst beim ersten Aufruf instanziiert (Lazy-Import).

## Smoke-Test (manuell)

1. Migration ausführen: `alembic upgrade head`
2. Backend starten.
3. Über Wizard zwei Mini-Sims erstellen (jeweils 5 Personas × 3 Ticks):
   - eine mit `Claude (Anthropic)`
   - eine mit `OpenAI`
4. Beide laufen lassen, Report ansehen, Chat mit einer Persona testen.
5. Logs prüfen: `provider=anthropic` bzw. `provider=openai` muss in den Persona-Generator-
   und Report-Logs erscheinen.
