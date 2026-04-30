"""
Analyse-Layer: Generiert den finalen Report via Claude Sonnet (async) mit Tool Use.
"""
import json
import logging
from uuid import UUID

logger = logging.getLogger("simulator.analysis")

import anthropic
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.config import settings
from app.utils.retry import with_retry
from app.models import AnalysisReport, Post, Comment, Simulation, InfluenceEvent

async_client = anthropic.AsyncAnthropic(api_key=settings.anthropic_api_key)

ANALYST_SYSTEM_PROMPT = """Du bist ein erfahrener Marktforscher und Analyst.
Analysiere die Ergebnisse einer sozialen Simulation objektiv und präzise.
Hebe Überraschungen, Wendepunkte und nicht-offensichtliche Erkenntnisse hervor.
Sei kritisch — eine gute Analyse zeigt auch Risiken und Schwächen auf."""

ANALYSIS_REPORT_TOOL = {
    "name": "analysis_report",
    "description": "Strukturierter Analyse-Report der Simulation",
    "input_schema": {
        "type": "object",
        "properties": {
            "full_report": {
                "type": "string",
                "description": "Kompletter Analyse-Report als Fließtext",
            },
            "sentiment_over_time": {
                "type": "string",
                "description": "JSON-String: Sentiment-Verlauf über die Tage",
            },
            "key_turning_points": {
                "type": "string",
                "description": "Wichtige Wendepunkte der Simulation",
            },
            "criticism_points": {
                "type": "string",
                "description": "Hauptkritikpunkte und Bedenken",
            },
            "opportunities": {
                "type": "string",
                "description": "Erkannte Chancen und positive Reaktionen",
            },
            "target_segment_analysis": {
                "type": "string",
                "description": "Zielgruppen-Segmentierung",
            },
            "unexpected_findings": {
                "type": "string",
                "description": "Überraschende Erkenntnisse",
            },
            "influence_network": {
                "type": "string",
                "description": "Analyse des Influence-Netzwerks: Schlüsselpersonen, Überzeugungsketten, einflussreichste Posts",
            },
            "platform_dynamics": {
                "type": "string",
                "description": "Plattform-Analyse: Unterschiede FeedBook vs Threadit, Migration, wo wird wie diskutiert",
            },
            "network_evolution": {
                "type": "string",
                "description": "Netzwerk-Dynamik: Community-Bildung, Echokammern, Fragmentierung",
            },
        },
        "required": [
            "full_report",
            "sentiment_over_time",
            "key_turning_points",
            "criticism_points",
            "opportunities",
            "target_segment_analysis",
            "unexpected_findings",
            "influence_network",
            "platform_dynamics",
            "network_evolution",
        ],
    },
}


async def generate_report(simulation_id: UUID, db: AsyncSession) -> AnalysisReport:
    """Generiert den Analyse-Report asynchron via Claude Sonnet mit Tool Use.

    Lädt alle Posts via selectinload (kein Lazy Loading).
    Speichert AnalysisReport in DB und committet.
    """
    # Simulation laden
    result = await db.execute(
        select(Simulation)
        .options(selectinload(Simulation.personas))
        .where(Simulation.id == simulation_id)
    )
    sim = result.scalar_one()

    # Posts mit allen Relationships laden
    posts_result = await db.execute(
        select(Post)
        .options(
            selectinload(Post.author),
            selectinload(Post.comments).selectinload(Comment.author),
            selectinload(Post.reactions),
        )
        .where(Post.simulation_id == simulation_id)
        .order_by(Post.ingame_day)
    )
    posts = posts_result.scalars().all()

    # Influence-Events laden
    influence_result = await db.execute(
        select(InfluenceEvent)
        .where(InfluenceEvent.simulation_id == simulation_id)
        .order_by(InfluenceEvent.ingame_day)
    )
    influence_events = influence_result.scalars().all()

    # Post-Daten für den Prompt aufbereiten
    post_data = []
    for post in posts:
        post_data.append(
            {
                "author": post.author.name if post.author else "Unbekannt",
                "is_skeptic": post.author.is_skeptic if post.author else False,
                "platform": post.platform.value,
                "ingame_day": post.ingame_day,
                "content": post.content,
                "comments": [
                    {
                        "author": c.author.name if c.author else "?",
                        "content": c.content,
                    }
                    for c in post.comments
                ],
                "reactions_count": len(post.reactions),
            }
        )

    # Influence-Events zusammenfassen
    influence_data = []
    for event in influence_events:
        source_name = next(
            (p.name for p in sim.personas if str(p.id) == str(event.source_persona_id)),
            "Unbekannt"
        )
        target_name = next(
            (p.name for p in sim.personas if str(p.id) == str(event.target_persona_id)),
            "Unbekannt"
        )
        influence_data.append({
            "day": event.ingame_day,
            "source": source_name,
            "target": target_name,
            "type": event.influence_type,
            "description": event.description,
        })

    # Persona-Endzustände für den Report
    persona_states = []
    for p in sim.personas:
        state = p.current_state or {}
        persona_states.append({
            "name": p.name,
            "is_skeptic": p.is_skeptic,
            "final_opinion": state.get("opinion_evolution", p.initial_opinion),
            "final_mood": state.get("mood", "neutral"),
            "platform_affinity": state.get("platform_affinity", {}),
            "connection_count": len(p.social_connections or []),
        })

    skeptic_count = sum(1 for p in sim.personas if p.is_skeptic)

    simulation_context = f"""Produkt: {sim.product_description}
Zielmarkt: {sim.target_market}
Branche: {sim.industry}
Simulierte Ticks: {sim.current_tick}
Personas gesamt: {len(sim.personas)}
Skeptiker: {skeptic_count}"""

    influence_section = ""
    if influence_data:
        influence_section = f"""

Influence-Events (wer hat wen beeinflusst):
{json.dumps(influence_data, ensure_ascii=False, indent=2)}
"""

    persona_states_section = f"""

Persona-Endzustände:
{json.dumps(persona_states, ensure_ascii=False, indent=2)}
"""

    prompt = f"""Analysiere diese Simulation:

{simulation_context}

Alle simulierten Beiträge (chronologisch):
{json.dumps(post_data, ensure_ascii=False, indent=2)}
{influence_section}
{persona_states_section}

Erstelle einen strukturierten Report mit:
1. Sentiment-Verlauf über die simulierten Tage
2. Wichtige Wendepunkte (was hat die Stimmung gekippt?)
3. Hauptkritikpunkte und -ängste
4. Erkannte Chancen und positive Reaktionen
5. Zielgruppen-Segmentierung (wer reagiert wie?)
6. Überraschende oder unerwartete Erkenntnisse
7. Empfehlungen für Produkt/Kampagne
8. Influence-Netzwerk: Wer hat wen überzeugt? Welche Posts waren besonders einflussreich?
9. Plattform-Analyse: Wo wurde positiver/negativer diskutiert? Plattform-Migration?
10. Netzwerk-Dynamik: Haben sich Communities gebildet? Echokammern?

Sei konkret, zitiere Beispiele aus der Simulation."""

    logger.info(f"[{simulation_id}] Starte Report-Generierung ({len(posts)} Posts)")
    message = await with_retry(
        async_client.messages.create,
        model="claude-sonnet-4-6",
        max_tokens=8192,
        system=[
            {
                "type": "text",
                "text": ANALYST_SYSTEM_PROMPT,
                "cache_control": {"type": "ephemeral"},
            }
        ],
        messages=[{"role": "user", "content": prompt}],
        tools=[ANALYSIS_REPORT_TOOL],
        tool_choice={"type": "tool", "name": "analysis_report"},
        max_attempts=3,
        base_delay=2.0,
    )

    tool_block = next(b for b in message.content if b.type == "tool_use")
    data = tool_block.input

    report = AnalysisReport(
        simulation_id=simulation_id,
        full_report=data["full_report"],
        sentiment_over_time=data["sentiment_over_time"],
        key_turning_points=data["key_turning_points"],
        criticism_points=data["criticism_points"],
        opportunities=data["opportunities"],
        target_segment_analysis=data["target_segment_analysis"],
        unexpected_findings=data["unexpected_findings"],
        influence_network=data["influence_network"],
        platform_dynamics=data["platform_dynamics"],
        network_evolution=data["network_evolution"],
    )
    db.add(report)
    await db.commit()
    logger.info(f"[{simulation_id}] Report fertig")
    await db.refresh(report)

    return report
