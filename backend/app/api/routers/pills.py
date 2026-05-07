from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Query, Request

from app.api.limiter_ext import limiter, pill_view_key
from app.core.errors import NotFoundError
from app.models.schemas import PillCardOut, PillPublicOut, ViewResponse
from app.services.db.supabase_client import get_service_client, supabase_call

router = APIRouter(prefix="/pills", tags=["pills"])


def _escape_ilike(pat: str) -> str:
    return pat.replace("\\", r"\\").replace("%", r"\%").replace("_", r"\_")


def _pill_card_rows(rows: list) -> list[PillCardOut]:
    return [
        PillCardOut(
            id=r["id"],
            title=r["title"],
            tool_category=r["tool_category"],
            tags=list(r.get("tags") or []),
            views_count=int(r.get("views_count") or 0),
        )
        for r in rows
    ]


@router.get("/trending", response_model=list[PillCardOut])
def list_trending(limit: int = Query(default=20, ge=1, le=100)) -> list[PillCardOut]:
    client = get_service_client()
    res = supabase_call(
        "pills_trending",
        lambda: client.table("pills")
        .select("id,title,tool_category,tags,views_count")
        .is_("deleted_at", "null")
        .order("views_count", desc=True)
        .limit(limit)
        .execute(),
    )
    rows = res.data or []
    return _pill_card_rows(rows)


@router.get("", response_model=list[PillCardOut])
def list_pills_public(
    tool_category: str | None = Query(
        default=None,
        max_length=60,
        description="Slug da ferramenta (ex.: ONEDRIVE), case-insensitive.",
    ),
    q: str | None = Query(
        default=None,
        max_length=200,
        description="Busca parcial no título (ilike).",
    ),
    exclude_id: UUID | None = Query(
        default=None,
        description="Exclui uma pílula (ex.: a que está aberta).",
    ),
    limit: int = Query(default=20, ge=1, le=100),
    offset: int = Query(default=0, ge=0, le=5000),
) -> list[PillCardOut]:
    """Lista pílulas públicas com filtros opcionais (listagem / relacionadas)."""
    client = get_service_client()

    def run_query():
        b = (
            client.table("pills")
            .select("id,title,tool_category,tags,views_count")
            .is_("deleted_at", "null")
        )
        if tool_category is not None and str(tool_category).strip():
            b = b.eq("tool_category", str(tool_category).strip().upper())
        if exclude_id is not None:
            b = b.neq("id", str(exclude_id))
        if q is not None and str(q).strip():
            cleaned = _escape_ilike(str(q).strip())
            b = b.ilike("title", f"%{cleaned}%")
        return (
            b.order("views_count", desc=True)
            .order("title", desc=False)
            .range(offset, offset + limit - 1)
            .execute()
        )

    res = supabase_call("pills_list_public", run_query)
    rows = res.data or []
    return _pill_card_rows(rows)


@router.get("/{pill_id}", response_model=PillPublicOut)
def get_pill(pill_id: UUID) -> PillPublicOut:
    client = get_service_client()
    res = supabase_call(
        "pills_get",
        lambda: client.table("pills")
        .select("id,title,tool_category,survival_content,tags,views_count,slides_url")
        .eq("id", str(pill_id))
        .is_("deleted_at", "null")
        .maybe_single()
        .execute(),
    )
    r = res.data
    if not r:
        raise NotFoundError("Pílula não encontrada.")
    return PillPublicOut(
        id=r["id"],
        title=r["title"],
        tool_category=r["tool_category"],
        survival_content=r["survival_content"],
        tags=list(r.get("tags") or []),
        views_count=int(r.get("views_count") or 0),
        slides_url=r.get("slides_url"),
    )


@router.post("/{pill_id}/view", response_model=ViewResponse)
@limiter.limit("1/hour", key_func=pill_view_key)
def record_view(request: Request, pill_id: UUID) -> ViewResponse:  # noqa: ARG001 — slowapi usa Request
    client = get_service_client()
    res = supabase_call(
        "increment_pill_views",
        lambda: client.rpc("increment_pill_views", {"p_id": str(pill_id)}).execute(),
    )
    raw = res.data
    if isinstance(raw, list):
        raw = raw[0] if raw else None
    if raw is None:
        raise NotFoundError("Pílula não encontrada.")
    try:
        views = int(raw)
    except (TypeError, ValueError) as exc:
        raise NotFoundError("Pílula não encontrada.") from exc
    if views < 0:
        raise NotFoundError("Pílula não encontrada.")
    return ViewResponse(pill_id=pill_id, views_count=views)
