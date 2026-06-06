from __future__ import annotations

import logging
import time

from google import genai
from google.genai import types

from app.config import get_settings
from app.core.errors import ServiceUnavailableError

log = logging.getLogger("helpprof.gemini.embeddings")

# text-embedding-004 foi descontinuado; gemini-embedding-001 suporta 768 dims.
_EMBED_MODEL = "gemini-embedding-001"


def embed_text_768(text: str, *, task_type: str = "RETRIEVAL_DOCUMENT") -> list[float]:
    settings = get_settings()
    if not settings.gemini_api_key:
        raise ServiceUnavailableError("GEMINI_API_KEY não configurada.")

    client = genai.Client(api_key=settings.gemini_api_key)
    t0 = time.perf_counter()
    last_exc: Exception | None = None
    for attempt in range(2):
        try:
            resp = client.models.embed_content(
                model=_EMBED_MODEL,
                contents=text,
                config=types.EmbedContentConfig(
                    output_dimensionality=768,
                    task_type=task_type,
                ),
            )
            break
        except Exception as exc:  # pragma: no cover - rede/SDK
            last_exc = exc
            if attempt == 0:
                log.warning("Embedding falhou (tentativa 1), repetindo: %s", exc)
                time.sleep(0.8)
            else:
                log.exception("Falha na API de embeddings: %s", exc)
                raise ServiceUnavailableError(f"Falha ao gerar embeddings: {exc}") from exc
    else:
        raise ServiceUnavailableError(f"Falha ao gerar embeddings: {last_exc}") from last_exc

    ms = (time.perf_counter() - t0) * 1000
    log.debug("Gemini embed_content em %.1f ms", ms)

    embeddings = getattr(resp, "embeddings", None) or []
    first = embeddings[0] if embeddings else None
    emb = getattr(first, "values", None) if first is not None else None
    if not emb or len(emb) != 768:
        raise ServiceUnavailableError("Embedding inválido retornado pela API.")
    return list(map(float, emb))
