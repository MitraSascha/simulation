"""
OpenAI Implementation des LLMProvider-Interfaces.

Mapping:
- tier="fast"  → gpt-4o-mini
- tier="smart" → gpt-4o
(Modell-Namen sind über Settings konfigurierbar.)

Caching:
- OpenAI cached automatisch ab ~1024 Token Prefix — kein explizites Markup nötig.
- cache=True / cache_system=True sind no-ops.
- Mehrere User-Blöcke werden zu einem zusammengeführten Text-String konkateniert.
"""
import asyncio
import json
import logging

from app.config import settings
from app.llm.provider import ChatMessage, LLMProvider, Tier, UserBlock

logger = logging.getLogger("simulator.llm.openai")


class OpenAIProvider(LLMProvider):
    name = "openai"

    # Sicherer Output-Token-Cap pro Modell. GPT-4o liefert max 16384 Output-Token —
    # wer am Limit kratzt, riskiert Truncation mitten im Tool-Argument.
    _MAX_TOKENS_CAP = 12000

    def __init__(
        self,
        *,
        api_key: str,
        model_fast: str,
        model_smart: str,
    ):
        if not api_key:
            raise RuntimeError(
                "OPENAI_API_KEY ist nicht gesetzt — OpenAI-Provider nicht nutzbar"
            )
        # Lazy import: das Paket ist nur Pflicht, wenn der Provider tatsächlich
        # verwendet wird.
        try:
            from openai import AsyncOpenAI
        except ImportError as e:
            raise RuntimeError(
                "Paket 'openai' ist nicht installiert. Installiere es mit "
                "'pip install openai' oder ergänze es in requirements.txt."
            ) from e

        # Retryable-Exceptions zur Laufzeit binden (Modul-Import schon erfolgt).
        import openai as _openai

        self._client = AsyncOpenAI(api_key=api_key)
        self._retryable = (
            _openai.RateLimitError,
            _openai.APIConnectionError,
            _openai.InternalServerError,
        )
        self._model_fast = model_fast
        self._model_smart = model_smart

    def _model(self, tier: Tier) -> str:
        return self._model_fast if tier == "fast" else self._model_smart

    async def _retry(self, fn, *args, max_attempts: int = 3, base_delay: float = 1.0, **kwargs):
        last_exc: Exception | None = None
        for attempt in range(1, max_attempts + 1):
            try:
                return await fn(*args, **kwargs)
            except self._retryable as e:  # type: ignore[misc]
                last_exc = e
                if attempt == max_attempts:
                    break
                delay = min(base_delay * (2 ** (attempt - 1)), 30.0)
                logger.warning(
                    "OpenAI %s, Versuch %d/%d, warte %.1fs: %s",
                    type(e).__name__, attempt, max_attempts, delay, e,
                )
                await asyncio.sleep(delay)
        assert last_exc is not None
        raise last_exc

    @staticmethod
    def _merge_user_blocks(blocks: list[UserBlock]) -> str:
        """Konkateniert Text-Blöcke zu einem User-Inhalt (cache-Flag wird ignoriert)."""
        return "\n\n".join(b.get("text", "") for b in blocks if b.get("text"))

    async def call_tool(
        self,
        *,
        tier: Tier,
        system: str,
        cache_system: bool,
        user_blocks: list[UserBlock],
        tool_name: str,
        tool_description: str,
        tool_schema: dict,
        max_tokens: int,
    ) -> dict:
        # cache_system / block.cache: no-op — OpenAI cached automatisch.
        user_text = self._merge_user_blocks(user_blocks)

        function_def = {
            "type": "function",
            "function": {
                "name": tool_name,
                "description": tool_description,
                "parameters": tool_schema,
            },
        }

        capped_tokens = min(max_tokens, self._MAX_TOKENS_CAP)
        if capped_tokens < max_tokens:
            logger.warning(
                "OpenAI: max_tokens %d auf %d gedeckelt (Output-Limit-Schutz)",
                max_tokens, capped_tokens,
            )

        response = await self._retry(
            self._client.chat.completions.create,
            model=self._model(tier),
            max_tokens=capped_tokens,
            messages=[
                {"role": "system", "content": system},
                {"role": "user", "content": user_text},
            ],
            tools=[function_def],
            tool_choice={"type": "function", "function": {"name": tool_name}},
        )

        choice = response.choices[0]
        tool_calls = choice.message.tool_calls or []
        if not tool_calls:
            text = choice.message.content or ""
            raise RuntimeError(
                f"OpenAI: keine Tool-Antwort (finish_reason={choice.finish_reason}, "
                f"max_tokens={max_tokens}). Text: {text[:300]}"
            )

        raw_args = tool_calls[0].function.arguments or "{}"
        try:
            parsed = json.loads(raw_args)
        except json.JSONDecodeError as e:
            raise RuntimeError(f"OpenAI: Tool-Argumente nicht parsebar: {e}. Raw: {raw_args[:300]}")

        if not isinstance(parsed, dict):
            raise RuntimeError(f"OpenAI: Tool-Argumente sind kein dict ({type(parsed)})")
        return parsed

    async def chat(
        self,
        *,
        tier: Tier,
        system: str,
        messages: list[ChatMessage],
        max_tokens: int,
    ) -> str:
        payload = [{"role": "system", "content": system}]
        payload.extend({"role": m["role"], "content": m["content"]} for m in messages)

        response = await self._retry(
            self._client.chat.completions.create,
            model=self._model(tier),
            max_tokens=min(max_tokens, self._MAX_TOKENS_CAP),
            messages=payload,
        )

        text = response.choices[0].message.content
        if not text:
            raise RuntimeError(
                f"OpenAI chat: keine Text-Antwort (finish_reason={response.choices[0].finish_reason})"
            )
        return text


def build_default_provider() -> OpenAIProvider:
    """Baut den Default-OpenAI-Provider aus Settings."""
    return OpenAIProvider(
        api_key=settings.openai_api_key,
        model_fast=settings.openai_model_fast,
        model_smart=settings.openai_model_smart,
    )
