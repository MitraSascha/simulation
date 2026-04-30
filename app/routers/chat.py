import json
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
import anthropic

from app.database import get_db
from app.config import settings
from app.models.persona import Persona
from app.schemas.chat import ChatRequest, ChatResponse, ChatMessage

router = APIRouter()
async_client = anthropic.AsyncAnthropic(api_key=settings.anthropic_api_key)


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

    # Bisherige History auf max 10 Nachrichten begrenzen, dann neue User-Message anhängen
    history_window = body.history[-10:]
    messages_payload = [
        {"role": msg.role, "content": msg.content}
        for msg in history_window
    ]
    messages_payload.append({"role": "user", "content": body.message})

    response = await async_client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=512,
        system=system_prompt,
        messages=messages_payload,
    )

    assistant_text = response.content[0].text

    # Aktualisierte History aufbauen: bisherige Window + neue User-Message + Antwort der Persona
    updated_history = list(history_window) + [
        ChatMessage(role="user", content=body.message),
        ChatMessage(role="assistant", content=assistant_text),
    ]
    # Auf max 20 Einträge kürzen (älteste raus)
    updated_history = updated_history[-20:]

    return ChatResponse(
        persona_name=persona.name,
        message=assistant_text,
        history=updated_history,
    )
