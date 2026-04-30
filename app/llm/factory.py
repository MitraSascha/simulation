"""
Provider-Factory: Liefert einen LLMProvider auf Basis eines Namens
("anthropic" oder "openai"). Singleton-Cache pro Prozess.
"""
import logging

from app.llm.provider import LLMProvider

logger = logging.getLogger("simulator.llm.factory")

_cache: dict[str, LLMProvider] = {}


def get_provider(name: str | None = None) -> LLMProvider:
    """Liefert einen LLMProvider. None / unbekannt → Default 'anthropic'."""
    key = (name or "anthropic").lower().strip()
    if key not in ("anthropic", "openai"):
        logger.warning("Unbekannter Provider '%s' — fallback auf 'anthropic'", key)
        key = "anthropic"

    if key in _cache:
        return _cache[key]

    if key == "anthropic":
        from app.llm.anthropic_impl import build_default_provider
        provider = build_default_provider()
    else:  # "openai"
        from app.llm.openai_impl import build_default_provider
        provider = build_default_provider()

    _cache[key] = provider
    return provider
