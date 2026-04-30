"""
Persona-Generierung via LLM-Provider (async) mit Tool Use.
Bei großen Persona-Mengen werden mehrere Batch-Calls parallel ausgeführt.
"""
import asyncio
import logging

from app.llm import LLMProvider, get_provider

logger = logging.getLogger("simulator.persona_generator")

PERSONA_SYSTEM_PROMPT = """Du bist Experte für europäische Gesellschaftsforschung. \
Erstelle realistische Personas. Min. 20% Skeptiker."""

BATCH_SIZE = 25
MAX_CONCURRENT_BATCHES = 2
_TOKENS_PER_PERSONA = 350
_BATCH_TOKEN_BUFFER = 1024

PERSONA_GENERATION_TOOL_NAME = "create_personas"
PERSONA_GENERATION_TOOL_DESC = "Erstellt eine Liste von Personas für die Marktsimulation"
PERSONA_GENERATION_TOOL_SCHEMA = {
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
                    "preferred_platform": {
                        "type": "string",
                        "enum": ["feedbook", "threadit"],
                        "description": "feedbook = Facebook-ähnlich (emotional, Freundeslisten), threadit = Reddit-ähnlich (sachlich, Subreddits)",
                    },
                },
                "required": [
                    "name", "age", "location", "occupation", "personality",
                    "values", "communication_style", "initial_opinion", "is_skeptic",
                    "preferred_platform",
                ],
            },
        }
    },
    "required": ["personas"],
}


def _build_prompt(
    product_description: str,
    target_market: str,
    industry: str,
    persona_count: int,
    batch_index: int = 0,
    batch_total: int = 1,
) -> str:
    batch_hint = ""
    if batch_total > 1:
        batch_hint = (
            f"\n\nDies ist Batch {batch_index + 1} von {batch_total}. "
            f"Erzeuge eigenständige, unverwechselbare Personas — verwende keine generischen "
            f"Namen wie 'Max Mustermann'. Nutze regional vielfältige Vornamen und Nachnamen."
        )

    return f"""Produkt/Idee: {product_description}
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
- is_skeptic (boolean)
- preferred_platform ("feedbook" oder "threadit") — welche Plattform passt zum Charakter? \
Jüngere/technikaffine/sachliche Typen → threadit; emotionale/familienorientierte/ältere Typen → feedbook. \
Verteile realistisch: ca. 55% feedbook, 45% threadit.{batch_hint}"""


async def _generate_batch(
    provider: LLMProvider,
    product_description: str,
    target_market: str,
    industry: str,
    persona_count: int,
    batch_index: int,
    batch_total: int,
    semaphore: asyncio.Semaphore,
    model: str | None = None,
) -> list[dict]:
    async with semaphore:
        prompt = _build_prompt(
            product_description, target_market, industry,
            persona_count, batch_index, batch_total,
        )
        max_tokens = max(4096, persona_count * _TOKENS_PER_PERSONA + _BATCH_TOKEN_BUFFER)

        result = await provider.call_tool(
            tier="smart",
            system=PERSONA_SYSTEM_PROMPT,
            cache_system=True,
            user_blocks=[{"text": prompt}],
            tool_name=PERSONA_GENERATION_TOOL_NAME,
            tool_description=PERSONA_GENERATION_TOOL_DESC,
            tool_schema=PERSONA_GENERATION_TOOL_SCHEMA,
            max_tokens=max_tokens,
            model=model,
        )

        personas = result.get("personas") if isinstance(result, dict) else None
        if not personas:
            raise RuntimeError(
                f"Persona-Generator (Batch {batch_index + 1}/{batch_total}): "
                f"Antwort enthält kein 'personas'-Feld (max_tokens={max_tokens})."
            )

        # Wenn das Modell weniger als angefordert liefert: einmal nachfordern
        if len(personas) < persona_count:
            missing = persona_count - len(personas)
            logger.warning(
                "Persona-Batch %d/%d: nur %d/%d Personas erhalten — fordere %d nach",
                batch_index + 1, batch_total, len(personas), persona_count, missing,
            )
            retry_prompt = _build_prompt(
                product_description, target_market, industry,
                missing, batch_index, batch_total,
            )
            retry_max_tokens = max(4096, missing * _TOKENS_PER_PERSONA + _BATCH_TOKEN_BUFFER)
            try:
                retry_result = await provider.call_tool(
                    tier="smart",
                    system=PERSONA_SYSTEM_PROMPT,
                    cache_system=True,
                    user_blocks=[{"text": retry_prompt}],
                    tool_name=PERSONA_GENERATION_TOOL_NAME,
                    tool_description=PERSONA_GENERATION_TOOL_DESC,
                    tool_schema=PERSONA_GENERATION_TOOL_SCHEMA,
                    max_tokens=retry_max_tokens,
                    model=model,
                )
                extra = retry_result.get("personas") if isinstance(retry_result, dict) else None
                if extra:
                    personas.extend(extra)
                    logger.info("Nachforderung erfolgreich: +%d Personas", len(extra))
            except Exception as e:
                logger.warning("Nachforderung fehlgeschlagen (akzeptiere Teilergebnis): %s", e)

        logger.info(
            "Persona-Batch %d/%d fertig: %d Personas",
            batch_index + 1, batch_total, len(personas),
        )
        return personas


def _dedupe_names(personas: list[dict]) -> list[dict]:
    """Eindeutige Namen via Suffix-Counter (Anna Schmidt, Anna Schmidt 2, ...)."""
    seen: dict[str, int] = {}
    for p in personas:
        original = (p.get("name") or "").strip() or "Persona"
        key = original.lower()
        if key not in seen:
            seen[key] = 1
            p["name"] = original
        else:
            seen[key] += 1
            p["name"] = f"{original} {seen[key]}"
    return personas


async def generate_personas(
    product_description: str,
    target_market: str,
    industry: str,
    persona_count: int = 10,
    provider_name: str | None = None,
    model: str | None = None,
) -> list[dict]:
    """Generiert N Personas asynchron via konfigurierten LLM-Provider.

    Bei persona_count > BATCH_SIZE werden mehrere Batches parallel ausgeführt
    (max. MAX_CONCURRENT_BATCHES gleichzeitig).
    """
    provider = get_provider(provider_name)
    logger.info(
        "Starte Persona-Generierung (%d Personas, provider=%s)",
        persona_count, provider.name,
    )

    if persona_count <= BATCH_SIZE:
        result = await _generate_batch(
            provider, product_description, target_market, industry,
            persona_count, batch_index=0, batch_total=1,
            semaphore=asyncio.Semaphore(1),
            model=model,
        )
        result = _dedupe_names(result)
        logger.info("Persona-Generierung abgeschlossen: %d Personas erstellt", len(result))
        return result

    # Aufteilung in Batches
    batch_sizes: list[int] = []
    remaining = persona_count
    while remaining > 0:
        size = min(BATCH_SIZE, remaining)
        batch_sizes.append(size)
        remaining -= size

    batch_total = len(batch_sizes)
    semaphore = asyncio.Semaphore(MAX_CONCURRENT_BATCHES)

    logger.info(
        "Persona-Generierung in %d Batches à ~%d (max %d parallel)",
        batch_total, BATCH_SIZE, MAX_CONCURRENT_BATCHES,
    )

    tasks = [
        _generate_batch(
            provider, product_description, target_market, industry,
            size, idx, batch_total, semaphore,
            model=model,
        )
        for idx, size in enumerate(batch_sizes)
    ]
    batch_results = await asyncio.gather(*tasks)

    all_personas: list[dict] = []
    for batch in batch_results:
        all_personas.extend(batch)

    all_personas = _dedupe_names(all_personas)

    if len(all_personas) < persona_count:
        logger.warning(
            "Persona-Generierung lieferte %d von %d angeforderten Personas",
            len(all_personas), persona_count,
        )
    elif len(all_personas) > persona_count:
        all_personas = all_personas[:persona_count]

    logger.info("Persona-Generierung abgeschlossen: %d Personas erstellt", len(all_personas))
    return all_personas
