from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Depends, Query

from app.api.deps import require_supabase_user
from app.core.errors import HelpProfError, InternalServerHelpProfError, NotFoundError
from app.models.schemas import CategoryCreateIn, CategoryPublicOut, CategoryUpdateIn
from app.services.db.supabase_client import get_service_client, supabase_call

router = APIRouter(prefix="/categories", tags=["categories"])
_auth = Depends(require_supabase_user)

_COLS = "id,slug,name,group_tag,logo_url,brand_color,sort_order"


def _row_to_out(r: dict) -> CategoryPublicOut:
    return CategoryPublicOut(
        id=r["id"],
        slug=r["slug"],
        name=r["name"],
        group_tag=r.get("group_tag"),
        logo_url=r.get("logo_url"),
        brand_color=r.get("brand_color") or "#6366f1",
        sort_order=int(r.get("sort_order") or 0),
    )


def _first(res) -> dict | None:
    data = getattr(res, "data", None)
    if isinstance(data, list):
        return data[0] if data else None
    if isinstance(data, dict):
        return data
    return None


# ── Público (sem autenticação) ─────────────────────────────────────────────

@router.get("", response_model=list[CategoryPublicOut])
def list_categories(
    limit: int = Query(default=200, ge=1, le=500),
    group_tag: str | None = Query(default=None, max_length=80),
    has_domain_guide: bool = Query(
        default=False,
        description="Quando true, retorna apenas categorias com guia de domínio ativo.",
    ),
) -> list[CategoryPublicOut]:
    """Lista todas as categorias ordenadas por sort_order."""
    client = get_service_client()
    guide_slugs: set[str] | None = None
    if has_domain_guide:
        guides_res = supabase_call(
            "categories_with_domain_guides_lookup",
            lambda: client.table("domain_guides")
            .select("tool_category")
            .is_("deleted_at", "null")
            .execute(),
        )
        guide_slugs = {
            str(r.get("tool_category") or "").strip().upper()
            for r in (guides_res.data or [])
            if r.get("tool_category")
        }
        if not guide_slugs:
            return []

    def run_query():
        q = client.table("categories").select(_COLS)
        if group_tag is not None and str(group_tag).strip():
            q = q.eq("group_tag", str(group_tag).strip())
        if guide_slugs is not None:
            q = q.in_("slug", sorted(guide_slugs))
        return q.order("sort_order", desc=False).order("name", desc=False).limit(limit).execute()

    res = supabase_call("categories_list", run_query)
    return [_row_to_out(r) for r in (res.data or [])]


@router.get("/{slug}", response_model=CategoryPublicOut)
def get_category(slug: str) -> CategoryPublicOut:
    client = get_service_client()
    res = supabase_call(
        "categories_get",
        lambda: client.table("categories")
        .select(_COLS)
        .eq("slug", slug.strip().upper())
        .maybe_single()
        .execute(),
    )
    row = getattr(res, "data", None)
    if not row:
        raise NotFoundError("Categoria não encontrada.")
    return _row_to_out(row)


# ── Admin (JWT obrigatório) ────────────────────────────────────────────────

@router.post("", response_model=CategoryPublicOut, dependencies=[_auth])
def create_category(body: CategoryCreateIn) -> CategoryPublicOut:
    client = get_service_client()
    res = supabase_call(
        "categories_insert",
        lambda: client.table("categories")
        .insert(body.model_dump())
        .execute(),
    )
    r = _first(res)
    if not r:
        raise InternalServerHelpProfError("Não foi possível criar a categoria.")
    return _row_to_out(r)


@router.patch("/{category_id}", response_model=CategoryPublicOut, dependencies=[_auth])
def update_category(category_id: UUID, body: CategoryUpdateIn) -> CategoryPublicOut:
    patch = body.model_dump(exclude_unset=True)
    if not patch:
        raise HelpProfError("Nenhum campo para atualizar.")
    client = get_service_client()
    res = supabase_call(
        "categories_update",
        lambda: client.table("categories")
        .update(patch)
        .eq("id", str(category_id))
        .execute(),
    )
    rows = getattr(res, "data", None) or []
    if not rows:
        raise NotFoundError("Categoria não encontrada.")
    return _row_to_out(rows[0])


@router.delete("/{category_id}", dependencies=[_auth])
def delete_category(category_id: UUID) -> dict[str, str]:
    """Hard delete — só permitido se nenhuma pílula/guia referencia esta categoria."""
    client = get_service_client()

    # Verificar uso antes de remover
    pills_res = supabase_call(
        "categories_check_pills",
        lambda: client.table("pills")
        .select("id")
        .eq("tool_category", str(category_id))
        .limit(1)
        .execute(),
    )
    if pills_res.data:
        raise HelpProfError("Categoria em uso por pílulas — remova ou reclassifique antes de apagar.")

    cat_res = supabase_call(
        "categories_get_for_delete",
        lambda: client.table("categories")
        .select("slug")
        .eq("id", str(category_id))
        .maybe_single()
        .execute(),
    )
    if not getattr(cat_res, "data", None):
        raise NotFoundError("Categoria não encontrada.")

    supabase_call(
        "categories_delete",
        lambda: client.table("categories")
        .delete()
        .eq("id", str(category_id))
        .execute(),
    )
    return {"status": "deleted", "category_id": str(category_id)}
