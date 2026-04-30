"""LLM-Provider-Abstraktion (Anthropic + OpenAI)."""
from typing import Any

from app.llm.factory import get_provider
from app.llm.provider import ChatMessage, LLMProvider, Tier, UserBlock


def resolve_model(sim: Any, tier: Tier) -> str | None:
    """Liest sim.llm_model_fast / llm_model_smart und liefert den Override (oder None).

    sim ist optional — wenn None, gibt None zurück (Tier-Default greift).
    """
    if sim is None:
        return None
    if tier == "fast":
        return getattr(sim, "llm_model_fast", None) or None
    return getattr(sim, "llm_model_smart", None) or None


__all__ = [
    "LLMProvider", "Tier", "UserBlock", "ChatMessage",
    "get_provider", "resolve_model",
]
