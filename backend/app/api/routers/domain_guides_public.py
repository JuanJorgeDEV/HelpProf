from __future__ import annotations

from urllib.parse import unquote

from fastapi import APIRouter

from app.core.errors import NotFoundError
from app.models.schemas import DomainGuidePublicOut
from app.services.db.supabase_client import get_service_client, supabase_call

router = APIRouter(prefix="/domain-guides", tags=["domain-guides"])


@router.get("/by-category/{tool_category}", response_model=DomainGuidePublicOut)
def get_by_category(tool_category: str) -> DomainGuidePublicOut:
    category = unquote(tool_category).strip().upper()
    client = get_service_client()
    res = supabase_call(
        "domain_guides_public",
        lambda: client.table("domain_guides")
        .select("id,tool_category,title,deep_content,slides_embed")
        .eq("tool_category", category)
        .is_("deleted_at", "null")
        .maybe_single()
        .execute(),
    )
    r = res.data
    if not r:
        raise NotFoundError("Guia de domínio não encontrado para esta ferramenta.")
    return DomainGuidePublicOut(
        id=r["id"],
        tool_category=r["tool_category"],
        title=r["title"],
        deep_content=r["deep_content"],
        slides_embed=r.get("slides_embed"),
    )
