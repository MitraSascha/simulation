"""
Persona-Generierung via Claude Sonnet (async) mit Tool Use.
Wird einmalig pro Simulation aufgerufen.
"""
import logging

import anthropic

from app.config import settings
from app.utils.retry import with_retry

logger = logging.getLogger("simulator.persona_generator")

async_client = anthropic.AsyncAnthropic(api_key=settings.anthropic_api_key)

PERSONA_SYSTEM_PROMPT = """Du bist Experte für europäische Gesellschaftsforschung. \
Erstelle realistische Personas. Min. 20% Skeptiker."""

PERSONA_GENERATION_TOOL = {
    "name": "create_personas",
    "description": "Erstellt eine Liste von Personas für die Marktsimulation",
    "input_schema": {
        "type": "object",
        "properties": {
            "personas": {
                "type": "array",
                "items": {
                    "type": "object",
                    "properties": {
                        "name": {"type": "string"},
                        "age": {"type": "string"},
                        "location": {"type": "string"},
                        "occupation": {"type": "string"},
                        "personality": {"type": "string", "description": "2-3 Sätze Charakterbeschreibung"},
                        "values": {"type": "array", "items": {"type": "string"}, "maxItems": 5},
                        "communication_style": {"type": "string"},
                        "initial_opinion": {"type": "string"},
                        "is_skeptic": {"type": "boolean"},
                    },
                    "required": [
                        "name",
                        "age",
                        "location",
                        "occupation",
                        "personality",
                        "values",
                        "communication_style",
                        "initial_opinion",
                        "is_skeptic",
                    ],
                },
            }
        },
        "required": ["personas"],
    },
}


async def generate_personas(
    product_description: str,
    target_market: str,
    industry: str,
    persona_count: int = 10,
) -> list[dict]:
    """Generiert N Personas asynchron via Claude Sonnet mit Tool Use."""
    prompt = f"""Produkt/Idee: {product_description}
Zielmarkt: {target_market}
Branche: {industry}

Erstelle {persona_count} diverse Personas für diese Marktsimulation.
Europäische Gesellschaftsrealität (DE/AT/CH): politische Fragmentierung, Datenskepsis, \
regionale Unterschiede. Inkludiere Zielgruppen, Randfälle und Skeptiker/Gegner \
(mindestens 20% der Personas müssen is_skeptic=true sein).

Jede Persona braucht:
- name (string)
- age (string, z.B. "34")
- location (string, z.B. "München", "Wien", "Zürich", "Hamburg", "Bern")
- occupation (string)
- personality (string, 2-3 Sätze Charakterbeschreibung)
- values (array of strings, max 5 Kernwerte)
- communication_style (string, 1-2 Sätze wie diese Person schreibt/spricht)
- initial_opinion (string, erste Haltung zum Produkt)
- is_skeptic (boolean)"""

    logger.info("Starte Persona-Generierung (%d Personas)", persona_count)

    message = await with_retry(
        async_client.messages.create,
        model="claude-sonnet-4-6-20250514",
        max_tokens=4096,
        system=[
            {
                "type": "text",
                "text": PERSONA_SYSTEM_PROMPT,
                "cache_control": {"type": "ephemeral"},
            }
        ],
        messages=[{"role": "user", "content": prompt}],
        tools=[PERSONA_GENERATION_TOOL],
        tool_choice={"type": "tool", "name": "create_personas"},
        max_attempts=3,
        base_delay=2.0,
    )

    tool_block = next(b for b in message.content if b.type == "tool_use")
    personas = tool_block.input["personas"]

    logger.info("Persona-Generierung abgeschlossen: %d Personas erstellt", len(personas))
    return personas
