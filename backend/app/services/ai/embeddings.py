from __future__ import annotations

import logging
import time

from google import genai
from google.genai import types

from app.config import get_settings
from app.core.errors import ServiceUnavailableError

log = logging.getLogger("helpprof.gemini.embeddings")


def embed_text_768(text: str) -> list[float]:
    settings = get_settings()
    if not settings.gemini_api_key:
        raise ServiceUnavailableError("GEMINI_API_KEY não configurada.")

    client = genai.Client(api_key=settings.gemini_api_key)
    t0 = time.perf_counter()
    try:
        resp = client.models.embed_content(
            model="text-embedding-004",
            contents=text,
            config=types.EmbedContentConfig(output_dimensionality=768),
        )
    except Exception as exc:  # pragma: no cover - rede/SDK
        log.exception("Falha na API de embeddings: %s", exc)
        raise ServiceUnavailableError("Falha ao gerar embeddings.") from exc

    ms = (time.perf_counter() - t0) * 1000
    log.debug("Gemini embed_content em %.1f ms", ms)

    embeddings = getattr(resp, "embeddings", None) or []
    first = embeddings[0] if embeddings else None
    emb = getattr(first, "values", None) if first is not None else None
    if not emb or len(emb) != 768:
        raise ServiceUnavailableError("Embedding inválido retornado pela API.")
    return list(map(float, emb))
