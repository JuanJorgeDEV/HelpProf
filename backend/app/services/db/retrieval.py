from __future__ import annotations

import logging
from typing import Any

from app.config import get_settings
from app.services.ai.embeddings import embed_text_768
from app.services.db.supabase_client import get_service_client, supabase_call

log = logging.getLogger("helpprof.retrieval")


def _norm_row(r: dict[str, Any]) -> dict[str, Any]:
    return {
        "id": r["id"],
        "title": r["title"],
        "tool_category": r["tool_category"],
        "survival_content": r["survival_content"],
        "tags": list(r.get("tags") or []),
        "views_count": int(r.get("views_count") or 0),
        "_sim": float(r.get("similarity")) if r.get("similarity") is not None else None,
        "_lex": float(r.get("lexical_score")) if r.get("lexical_score") is not None else None,
    }


def hybrid_pill_search(query: str) -> tuple[list[dict[str, Any]], float | None]:
    """
    Retorna pílulas candidatas (ordenadas) e o melhor score semântico observado (None se vazio).
    """
    settings = get_settings()
    client = get_service_client()
    vec = embed_text_768(query.strip())
    best_sim: float | None = None

    sem_rows: list[dict[str, Any]] = supabase_call(
        "match_pills_semantic",
        lambda: client.rpc(
            "match_pills_semantic",
            {
                "query_embedding": vec,
                "similarity_threshold": settings.lume_similarity_floor * 0.5,
                "result_limit": 20,
            },
        ).execute(),
    ).data or []

    lex_rows: list[dict[str, Any]] = supabase_call(
        "match_pills_lexical",
        lambda: client.rpc(
            "match_pills_lexical",
            {"search_query": query, "result_limit": settings.lume_lexical_fallback_limit},
        ).execute(),
    ).data or []

    merged: dict[Any, dict[str, Any]] = {}
    order: list[Any] = []

    for r in sem_rows:
        row = _norm_row(r)
        if row["_sim"] is not None:
            best_sim = row["_sim"] if best_sim is None else max(best_sim, row["_sim"])
        merged[row["id"]] = row
        order.append(row["id"])

    for r in lex_rows:
        row = _norm_row(r)
        if row["id"] not in merged:
            merged[row["id"]] = row
            order.append(row["id"])

    out = [merged[k] for k in order if k in merged]
    log.debug("Hybrid search q=%r semantic=%d lexical=%d merged=%d", query[:80], len(sem_rows), len(lex_rows), len(out))
    return out, best_sim


def pills_by_tag_neighborhood(candidates: list[dict[str, Any]], limit: int = 5) -> list[str]:
    tags: set[str] = set()
    for c in candidates:
        for t in c.get("tags") or []:
            tags.add(str(t).strip().lower())
            if len(tags) >= 40:
                break
    out: list[str] = []
    for t in sorted(tags):
        if t:
            out.append(f"Como funciona {t} na escola?")
        if len(out) >= limit:
            break
    if len(out) < limit:
        out.extend(
            [
                "Como recuperar minha senha do SED?",
                "Como organizar arquivos no OneDrive da escola?",
                "Como formatar notas no Excel para o conselho?",
            ][: limit - len(out)]
        )
    return out[:limit]
