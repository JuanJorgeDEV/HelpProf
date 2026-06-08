from __future__ import annotations

from fastapi import APIRouter
from fastapi.responses import StreamingResponse

from app.models.schemas import LumeQueryIn, LumeQueryOut
from app.services.ai.lume import run_lume, stream_lume

router = APIRouter(prefix="/lume", tags=["lume"])


@router.post("/query", response_model=LumeQueryOut)
def lume_query(payload: LumeQueryIn) -> LumeQueryOut:
    """Resposta completa (não-streaming). Mantido para compatibilidade."""
    return run_lume(payload)


@router.post("/stream")
def lume_stream(payload: LumeQueryIn) -> StreamingResponse:
    """
    Streaming SSE da Lume.

    Eventos emitidos:
      data: {"text": "..."}                             — fragmento de texto
      data: {"done": true, "low_confidence": bool,
             "suggested_pills": [...],
             "suggested_questions": [...]}              — metadados finais
    """
    return StreamingResponse(
        stream_lume(payload),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",   # desativa buffer do nginx/render proxy
        },
    )
