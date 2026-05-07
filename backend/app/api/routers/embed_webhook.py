from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Header

from app.config import get_settings
from app.core.errors import UnauthorizedError
from app.models.schemas import EmbedWebhookIn
from app.services.ai.lume import apply_pill_embedding

router = APIRouter(prefix="/internal/embeddings", tags=["internal"], include_in_schema=False)

_SECRET_HEADER = "X-Embed-Webhook-Secret"


@router.post("/pill", summary="Webhook alternativo ao pg_net→Edge Function (fallback FastAPI)")
def embed_pill_webhook(
    body: EmbedWebhookIn,
    x_embed_webhook_secret: Annotated[str | None, Header(alias=_SECRET_HEADER)] = None,
) -> dict[str, str]:
    settings = get_settings()
    secret = settings.embed_webhook_secret
    if not secret or x_embed_webhook_secret != secret:
        raise UnauthorizedError("Credencial do webhook inválida.")
    apply_pill_embedding(body.pill_id, body.text)
    return {"status": "ok", "pill_id": str(body.pill_id)}
