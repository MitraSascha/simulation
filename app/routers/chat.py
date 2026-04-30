import json
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.llm import get_provider
from app.models.persona import Persona
from app.models.simulation import Simulation
from app.schemas.chat import ChatRequest, ChatResponse, ChatMessage

router = APIRouter()


@router.post("/personas/{persona_id}/chat", response_model=ChatResponse)
async def chat_with_persona(
    persona_id: UUID,
    body: ChatRequest,
    db: AsyncSession = Depends(get_db),
) -> ChatResponse:
    result = await db.execute(select(Persona).where(Persona.id == persona_id))
    persona = result.scalar_one_or_none()
    if persona is None:
        raise HTTPException(status_code=404, detail="Persona nicht gefunden")

    sim_provider_name: str | None = None
    sim_model_smart: str | None = None
    sim_result = await db.execute(
        select(Simulation).where(Simulation.id == persona.simulation_id)
    )
    sim = sim_result.scalar_one_or_none()
    if sim is not None:
        sim_provider_name = getattr(sim, "llm_provider", None)
        sim_model_smart = getattr(sim, "llm_model_smart", None)
    provider = get_provider(sim_provider_name)

    current_state: dict = persona.current_state or {}

    system_prompt = (
        f"Du bist {persona.name}, {persona.age} Jahre alt, wohnhaft in {persona.location}.\n"
        f"Beruf: {persona.occupation}\n\n"
        f"Deine Persönlichkeit: {persona.personality}\n"
        f"Deine Werte: {', '.join(persona.values or [])}\n"
        f"Dein Kommunikationsstil: {persona.communication_style}\n\n"
        f"Deine Erfahrung aus der Simulation:\n"
        f"Meinungsentwicklung: {current_state.get('opinion_evolution', persona.initial_opinion)}\n"
        f"Aktuelle Stimmung: {current_state.get('mood', 'neutral')}\n"
        f"Letzte Aktivitäten: {json.dumps(current_state.get('recent_actions', []), ensure_ascii=False)}\n\n"
        f"Antworte IMMER in der ersten Person, konsistent mit deiner Persönlichkeit.\n"
        f"Sei authentisch — du musst nicht höflich sein wenn du das nicht bist.\n"
        f"Wenn du Skeptiker bist, zeige das deutlich.\n"
        f"Antworte auf Deutsch, kurz und natürlich (wie in einem echten Gespräch)."
    )

    # Frontend manages history; last message is the current user turn
    messages_payload = [
        {"role": msg.role, "content": msg.content}
        for msg in body.messages[-20:]
    ]

    assistant_text = await provider.chat(
        tier="smart",
        system=system_prompt,
        messages=messages_payload,
        max_tokens=512,
        model=sim_model_smart,
    )

    return ChatResponse(
        response=assistant_text,
        persona_id=str(persona_id),
    )
