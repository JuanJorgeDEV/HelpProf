from __future__ import annotations

import logging
import time
from uuid import UUID

from llama_index.llms.google_genai import GoogleGenAI

from app.config import get_settings
from app.core.errors import NotFoundError, ServiceUnavailableError
from app.models.schemas import LumeQueryIn, LumeQueryOut, PillCardOut
from app.services.ai.embeddings import embed_text_768
from app.services.ai.guardrail import OUT_OF_SCOPE_REPLY_PT, question_within_scope
from app.services.db.retrieval import hybrid_pill_search, pills_by_tag_neighborhood
from app.services.db.supabase_client import get_service_client, supabase_call

log = logging.getLogger("helpprof.lume")

_HOME_SYSTEM = """Você é a Lume, assistente técnica do HelpProf para professores da rede pública.
Use apenas o material das pílulas fornecidas abaixo. Se o contexto não permitir responder com segurança, diga que não encontrou uma pílula específica e sugira reformular ou escolher uma pílula da lista exibida no site.
Seja objetiva, empática e use passos curtos quando possível. Não invente funcionalidades de software.
"""

_PILL_SYSTEM = """Você é a Lume, assistente técnica do HelpProf.
Baseie sua resposta ESTRITAMENTE no texto desta pílula. Não invente passos adicionais nem suposições fora do texto.
Se algo não estiver no texto, diga educadamente que a pílula não cobre esse ponto e indique pedir ajuda ao suporte ou abrir outra pílula relacionada.
"""


def _log_search(term: str, found_results: bool) -> None:
    try:
        client = get_service_client()
        supabase_call(
            "search_logs_insert",
            lambda: client.table("search_logs")
            .insert({"search_term": term, "found_results": found_results})
            .execute(),
        )
    except Exception as exc:
        log.warning("Falha ao registrar search_logs: %s", exc)


def _llm() -> GoogleGenAI:
    settings = get_settings()
    if not settings.gemini_api_key:
        raise ServiceUnavailableError("GEMINI_API_KEY não configurada.")
    return GoogleGenAI(model="gemini-1.5-flash", api_key=settings.gemini_api_key, temperature=0.2)


def _fetch_pill_row(pill_id: UUID) -> dict:
    client = get_service_client()
    res = supabase_call(
        "pills_select_one",
        lambda: client.table("pills")
        .select("id,title,tool_category,survival_content,tags,views_count")
        .eq("id", str(pill_id))
        .is_("deleted_at", "null")
        .maybe_single()
        .execute(),
    )
    row = res.data
    if not row:
        raise NotFoundError("Pílula não encontrada.")
    return row


def _row_to_card(row: dict) -> PillCardOut:
    return PillCardOut(
        id=row["id"],
        title=row["title"],
        tool_category=row["tool_category"],
        tags=list(row.get("tags") or []),
        views_count=int(row.get("views_count") or 0),
    )


def _answer_text(resp) -> str:
    text = getattr(resp, "text", None)
    if text:
        return str(text).strip()
    return str(resp).strip()


def run_lume(payload: LumeQueryIn) -> LumeQueryOut:
    settings = get_settings()
    q = payload.query.strip()

    if not question_within_scope(q):
        _log_search(q, False)
        return LumeQueryOut(answer=OUT_OF_SCOPE_REPLY_PT, low_confidence=True)

    llm = _llm()

    if payload.scenario == "pill" and payload.pill_id:
        row = _fetch_pill_row(payload.pill_id)
        ctx = row["survival_content"]
        user_block = (
            f"Título: {row['title']}\nFerramenta: {row['tool_category']}\n\nTexto da pílula (Markdown):\n{ctx}"
        )
        prompt = f"{_PILL_SYSTEM}\n\n{user_block}\n\nPergunta do professor:\n{q}\n\nResposta (pt-BR):"
        t0 = time.perf_counter()
        response = llm.complete(prompt)
        log.debug("Lume pilula-complete em %.1f ms", (time.perf_counter() - t0) * 1000)
        _log_search(q, True)
        return LumeQueryOut(answer=_answer_text(response), low_confidence=False, suggested_pills=[_row_to_card(row)])

    candidates, best_sim = hybrid_pill_search(q)

    tags_from = candidates[: settings.lume_lexical_fallback_limit]
    suggested_cards = [_row_to_card(c) for c in tags_from]
    low = best_sim is None or best_sim < settings.lume_similarity_floor or not candidates

    context_blocks: list[str] = []
    for i, c in enumerate(candidates[:6], start=1):
        context_blocks.append(
            f"--- Pílula {i}: {c['title']} ({c['tool_category']}) ---\n"
            f"Tags: {', '.join(c['tags'])}\n"
            f"{c['survival_content']}\n"
        )
    mega_ctx = "\n".join(context_blocks) if context_blocks else "(Nenhuma pílula com boa correspondência.)"

    if low:
        guide = (
            "O contexto abaixo pode ser fraco ou vazio. Não invente um passo a passo detalhado. "
            "Explique gentilmente que a busca foi amplia, sugira que o professor detalhe a pergunta, "
            "e oriente escolher uma pílula da lista já sugerida pelo sistema quando possível "
            "(não liste pílulas inventadas)."
        )
    else:
        guide = "Responda com base nas pílulas abaixo, citando apenas o que está no texto quando possível."

    sug_ref = ", ".join(f"{c.id}:{c.title}" for c in suggested_cards)
    prompt = (
        f"{_HOME_SYSTEM}\n\n{guide}\n\n"
        f"Pílulas de referência (id:título — não extrapole):\n{sug_ref}\n\n"
        f"Contexto agregado:\n{mega_ctx}\n\n"
        f"Pergunta do professor:\n{q}\n\n"
        "Resposta (pt-BR):"
    )
    t0 = time.perf_counter()
    response = llm.complete(prompt)
    log.debug("Lume home-complete em %.1f ms", (time.perf_counter() - t0) * 1000)

    answer = _answer_text(response)
    sug_q = pills_by_tag_neighborhood(candidates) if low else []
    found = bool(candidates) and not low
    _log_search(q, found)

    return LumeQueryOut(
        answer=answer,
        low_confidence=low,
        suggested_pills=suggested_cards,
        suggested_questions=sug_q,
    )


def apply_pill_embedding(pill_id: UUID, survival_text: str | None = None) -> None:
    """Gera embedding 768-D e persiste via RPC set_pill_embedding (webhook FastAPI ou testes)."""
    client = get_service_client()
    text = survival_text
    if text is None:
        text = _fetch_pill_row(pill_id)["survival_content"]
    vec = embed_text_768(text)
    supabase_call(
        "set_pill_embedding",
        lambda: client.rpc(
            "set_pill_embedding",
            {"p_id": str(pill_id), "p_vec": vec},
        ).execute(),
    )
