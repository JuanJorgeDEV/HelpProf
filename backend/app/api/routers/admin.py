from __future__ import annotations

import logging
from datetime import datetime, timezone
from typing import Any
from uuid import UUID

from fastapi import APIRouter, Depends, Query

from app.api.deps import require_supabase_user
from app.core.errors import HelpProfError, InternalServerHelpProfError, NotFoundError
from app.models.schemas import (
    DomainGuideCreateIn,
    DomainGuidePublicOut,
    DomainGuideUpdateIn,
    PillAdminOut,
    PillCreateIn,
    PillUpdateIn,
)
from app.services.db.supabase_client import get_service_client, supabase_call

log = logging.getLogger("helpprof.admin")

router = APIRouter(prefix="/admin", tags=["admin"])

_auth = Depends(require_supabase_user)


def _pill_admin_from_row(r: dict) -> PillAdminOut:
    return PillAdminOut(
        id=r["id"],
        title=r["title"],
        tool_category=r["tool_category"],
        survival_content=r["survival_content"],
        tags=list(r.get("tags") or []),
        views_count=int(r.get("views_count") or 0),
        slides_url=r.get("slides_url"),
        deleted_at=r.get("deleted_at"),
    )


def _first_row(res: Any) -> dict | None:
    """postgrest-py 2.x: INSERT/UPDATE com `return=representation` devolve `data` como lista."""
    data = getattr(res, "data", None)
    if data is None:
        return None
    if isinstance(data, dict):
        return data
    if isinstance(data, list):
        return data[0] if data else None
    return None


def _domain_guide_from_row(r: dict) -> DomainGuidePublicOut:
    return DomainGuidePublicOut(
        id=r["id"],
        tool_category=r["tool_category"],
        title=r["title"],
        deep_content=r["deep_content"],
        slides_embed=r.get("slides_embed"),
    )


@router.get("/pills", response_model=list[PillAdminOut], dependencies=[_auth])
def list_pills(
    include_deleted: bool = Query(default=False, description="Se true, inclui pílulas arquivadas (soft delete)."),
    limit: int = Query(default=100, ge=1, le=500),
) -> list[PillAdminOut]:
    """Lista pílulas para o painel Triad Support."""
    client = get_service_client()
    q = (
        client.table("pills")
        .select("id,title,tool_category,survival_content,tags,views_count,slides_url,deleted_at")
        .order("updated_at", desc=True)
        .limit(limit)
    )
    if not include_deleted:
        q = q.is_("deleted_at", "null")
    res = supabase_call(
        "admin_pills_list",
        lambda: q.execute(),
    )
    rows = res.data or []
    return [_pill_admin_from_row(r) for r in rows]


def _utc_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


@router.post("/pills", response_model=PillAdminOut, dependencies=[_auth])
def create_pill(body: PillCreateIn) -> PillAdminOut:
    client = get_service_client()
    row = {
        "title": body.title,
        "tool_category": body.tool_category,
        "survival_content": body.survival_content,
        "tags": body.tags,
        "slides_url": body.slides_url,
        "deleted_at": None,
    }
    res = supabase_call(
        "admin_pills_insert",
        lambda: client.table("pills").insert(row).execute(),
    )
    r = _first_row(res)
    if not r:
        raise InternalServerHelpProfError("Não foi possível criar a pílula.")
    return _pill_admin_from_row(r)


@router.patch("/pills/{pill_id}", response_model=PillAdminOut, dependencies=[_auth])
def update_pill(pill_id: UUID, body: PillUpdateIn) -> PillAdminOut:
    client = get_service_client()
    patch = body.model_dump(exclude_unset=True)
    tags = patch.pop("tags", None)
    if tags is not None:
        patch["tags"] = tags
    if not patch:
        raise HelpProfError("Nenhum campo para atualizar.")
    res = supabase_call(
        "admin_pills_update",
        lambda: client.table("pills")
        .update(patch)
        .eq("id", str(pill_id))
        .execute(),
    )
    rows = res.data or []
    if not rows:
        raise NotFoundError("Pílula não encontrada.")
    r = rows[0]
    return _pill_admin_from_row(r)


@router.delete("/pills/{pill_id}", dependencies=[_auth])
def soft_delete_pill(pill_id: UUID) -> dict[str, str]:
    client = get_service_client()
    res = supabase_call(
        "admin_pills_soft_delete",
        lambda: client.table("pills")
        .update({"deleted_at": _utc_iso()})
        .eq("id", str(pill_id))
        .is_("deleted_at", "null")
        .execute(),
    )
    rows = res.data or []
    if not rows:
        raise NotFoundError("Pílula não encontrada ou já arquivada.")
    return {"status": "archived", "pill_id": str(pill_id)}


# --- Guias Domínio (Triad Support) -------------------------------

@router.get("/domain-guides", response_model=list[DomainGuidePublicOut], dependencies=[_auth])
def list_domain_guides(limit: int = Query(default=200, ge=1, le=500)) -> list[DomainGuidePublicOut]:
    client = get_service_client()
    res = supabase_call(
        "admin_domain_guides_list",
        lambda: client.table("domain_guides")
        .select("id,tool_category,title,deep_content,slides_embed,updated_at")
        .is_("deleted_at", "null")
        .order("updated_at", desc=True)
        .limit(limit)
        .execute(),
    )
    rows = res.data or []
    return [_domain_guide_from_row(r) for r in rows]


@router.get("/domain-guides/by-category/{tool_category}", response_model=DomainGuidePublicOut, dependencies=[_auth])
def get_domain_guide_by_category_admin(tool_category: str) -> DomainGuidePublicOut:
    category = tool_category.strip().upper()
    if not category:
        raise HelpProfError("tool_category é obrigatório.")
    client = get_service_client()
    res = supabase_call(
        "admin_domain_guide_by_category",
        lambda: client.table("domain_guides")
        .select("id,tool_category,title,deep_content,slides_embed")
        .eq("tool_category", category)
        .is_("deleted_at", "null")
        .limit(1)
        .maybe_single()
        .execute(),
    )
    r = getattr(res, "data", None)
    if not r:
        raise NotFoundError("Guia não encontrado para esta ferramenta.")
    return _domain_guide_from_row(r)


@router.post("/domain-guides", response_model=DomainGuidePublicOut, dependencies=[_auth])
def create_domain_guide(body: DomainGuideCreateIn) -> DomainGuidePublicOut:
    client = get_service_client()
    res = supabase_call(
        "admin_domain_guide_insert",
        lambda: client.table("domain_guides")
        .insert(
            {
                "tool_category": body.tool_category,
                "title": body.title,
                "deep_content": body.deep_content,
                "slides_embed": body.slides_embed,
                "deleted_at": None,
            },
        )
        .execute(),
    )
    r = _first_row(res)
    if not r:
        raise InternalServerHelpProfError("Não foi possível criar o guia.")
    return _domain_guide_from_row(r)


@router.patch("/domain-guides/{guide_id}", response_model=DomainGuidePublicOut, dependencies=[_auth])
def update_domain_guide(guide_id: UUID, body: DomainGuideUpdateIn) -> DomainGuidePublicOut:
    client = get_service_client()
    patch = body.model_dump(exclude_unset=True)
    if not patch:
        raise HelpProfError("Nenhum campo para atualizar.")
    res = supabase_call(
        "admin_domain_guide_update",
        lambda: client.table("domain_guides")
        .update(patch)
        .eq("id", str(guide_id))
        .execute(),
    )
    rows = res.data or []
    if not rows:
        raise NotFoundError("Guia não encontrado.")
    r = rows[0]
    return _domain_guide_from_row(r)


@router.post("/embeddings/backfill", dependencies=[_auth])
def backfill_embeddings() -> dict:
    """
    Gera as 'impressões digitais' (embeddings) de todas as pílulas que ainda não as têm.
    Precisa ser executado uma vez para que a busca da Lume na Home funcione corretamente.
    Cada pílula consome ~1 chamada à API do Google; pode demorar alguns segundos.
    """
    from app.services.ai.lume import apply_pill_embedding
    import time as _time

    client = get_service_client()
    res = supabase_call(
        "admin_pills_without_embedding",
        lambda: client.table("pills")
        .select("id,title")
        .is_("embedding", "null")
        .is_("deleted_at", "null")
        .execute(),
    )
    rows = res.data or []
    total = len(rows)
    done = 0
    errors: list[dict] = []

    for row in rows:
        pid = UUID(row["id"])
        try:
            apply_pill_embedding(pid)
            done += 1
            log.info("Embedding gerado: %s — %s", row["id"], row["title"])
            _time.sleep(0.4)
        except Exception as exc:
            log.warning("Falha ao gerar embedding para %s: %s", row["id"], exc)
            errors.append({"pill_id": row["id"], "title": row["title"], "error": str(exc)})

    return {
        "total_sem_embedding": total,
        "gerados": done,
        "erros": len(errors),
        "detalhes_erros": errors,
    }


@router.put("/domain-guides/by-category/{tool_category}", response_model=DomainGuidePublicOut, dependencies=[_auth])
def upsert_domain_guide_by_category(tool_category: str, body: DomainGuideCreateIn) -> DomainGuidePublicOut:
    category = tool_category.strip().upper()
    if not category:
        raise HelpProfError("tool_category é obrigatório.")
    if body.tool_category != category:
        raise HelpProfError("tool_category do path e do body devem ser iguais.")
    client = get_service_client()
    existing_res = supabase_call(
        "admin_domain_guide_upsert_lookup",
        lambda: client.table("domain_guides")
        .select("id")
        .eq("tool_category", category)
        .is_("deleted_at", "null")
        .limit(1)
        .maybe_single()
        .execute(),
    )
    existing = getattr(existing_res, "data", None)
    payload = {
        "tool_category": category,
        "title": body.title,
        "deep_content": body.deep_content,
        "slides_embed": body.slides_embed,
        "deleted_at": None,
    }
    if existing and existing.get("id"):
        res = supabase_call(
            "admin_domain_guide_upsert_update",
            lambda: client.table("domain_guides")
            .update(payload)
            .eq("id", str(existing["id"]))
            .execute(),
        )
    else:
        res = supabase_call(
            "admin_domain_guide_upsert_insert",
            lambda: client.table("domain_guides")
            .insert(payload)
            .execute(),
        )
    r = _first_row(res)
    if not r:
        raise InternalServerHelpProfError("Não foi possível salvar o guia.")
    return _domain_guide_from_row(r)
