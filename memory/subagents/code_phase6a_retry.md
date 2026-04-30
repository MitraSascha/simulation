---
type: subagent-memory
agent: code
modul: phase6a_retry_logic
created: 2026-04-29
status: completed
---
## Was wurde getan

Implementierung einer eigenen Retry-Schicht mit Exponential Backoff für alle Anthropic API-Calls im Simulator-Backend. Diese Schicht ergänzt das interne `max_retries=2` des Anthropic SDK und greift bei `RateLimitError` (429), `InternalServerError` (500) und `APIConnectionError`.

Nicht-retrybare Fehler (`AuthenticationError`, `BadRequestError`, alle anderen Exceptions) werden sofort propagiert ohne Retry-Versuche.

## Erstellte/geänderte Dateien

### Neu erstellt
- `app/utils/__init__.py` — leeres Package-Init für das neue utils-Modul
- `app/utils/retry.py` — `with_retry(func, *args, max_attempts, base_delay, max_delay, **kwargs)` async-Hilfsfunktion mit Exponential Backoff (`delay = min(base_delay * 2^(attempt-1), max_delay)`)

### Geändert
- `app/simulation/tick_engine.py`
  - Import von `with_retry` hinzugefügt
  - `persona_action`: API-Call mit `with_retry` gewrappt (`max_attempts=3, base_delay=1.0`)
  - `update_persona_state_async`: State-Haiku-Call mit `with_retry` gewrappt (`max_attempts=3, base_delay=1.0`)
- `app/simulation/persona_generator.py`
  - Import von `with_retry` hinzugefügt
  - `generate_personas`: API-Call mit `with_retry` gewrappt (`max_attempts=3, base_delay=2.0`)
- `app/analysis/report_generator.py`
  - Import von `with_retry` hinzugefügt
  - `generate_report`: Sonnet-Call mit `with_retry` gewrappt (`max_attempts=3, base_delay=2.0`)

## Retry-Parameter-Entscheidungen

| Call-Site | base_delay | Begründung |
|---|---|---|
| `persona_action` | 1.0s | Viele parallele Calls, schnelles Retry gewünscht |
| `update_persona_state_async` | 1.0s | State-Updates sind nicht kritisch, aber häufig |
| `generate_personas` | 2.0s | Einmaliger kritischer Call pro Simulation |
| `generate_report` | 2.0s | Einmaliger kritischer Call, Sonnet ist teurer |

Backoff-Sequenz bei `base_delay=1.0`: 1s → 2s → (max 3 Versuche, kein 3. Warten)
Backoff-Sequenz bei `base_delay=2.0`: 2s → 4s → (max 3 Versuche)
