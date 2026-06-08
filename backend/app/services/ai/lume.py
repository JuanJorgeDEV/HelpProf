from __future__ import annotations

import json
import logging
import time
from collections.abc import Generator
from uuid import UUID

from google import genai
from google.genai import types

from app.config import get_settings
from app.core.errors import NotFoundError, ServiceUnavailableError
from app.models.schemas import HistoryMessage, LumeQueryIn, LumeQueryOut, PillCardOut
from app.services.ai.embeddings import embed_text_768
from app.services.ai.guardrail import OUT_OF_SCOPE_REPLY_PT, question_within_scope
from app.services.db.retrieval import hybrid_pill_search, pills_by_tag_neighborhood
from app.services.db.supabase_client import get_service_client, supabase_call

log = logging.getLogger("helpprof.lume")

_LUME_MODEL = "gemini-2.5-flash"

_PILL_SYSTEM = """Você é a Lume, assistente técnica do HelpProf para professores da rede pública.

Prioridade de fontes:
1. Material do HelpProf abaixo (pílula, guia de domínio, pílulas relacionadas).
2. Se a pergunta pedir algo que o material não cobre (URL de acesso, onde clicar, login, app vs site), use a busca na web para complementar com informação atual e prática.
3. Não recuse ajudar só porque a pílula é curta. Complete o que falta de forma objetiva.

Regras:
- Prefira passos numerados curtos.
- Para ferramentas Microsoft/Google, cite URLs oficiais quando relevante (ex.: onedrive.com, office.com, google.com).
- Se usar informação além do HelpProf, diga brevemente (ex.: "Além do passo da pílula…").
- Foque em uso escolar; evite opinião ou conteúdo fora de tecnologia educacional.
- Responda em Markdown: use títulos, listas e negrito onde ajudar a entender.
"""

_HOME_SYSTEM = """Você é a Lume, assistente técnica do HelpProf para professores da rede pública.

Use as pílulas do HelpProf como base principal. Se elas não forem suficientes, complemente com busca na web (URLs oficiais, passos atuais das ferramentas).

Seja objetiva e use passos curtos. Não invente funcionalidades obscuras; prefira o que está nas pílulas ou em fontes oficiais.
Responda em Markdown: use títulos, listas e negrito onde ajudar a entender.
"""


def _truncate(text: str, max_chars: int) -> str:
    text = (text or "").strip()
    if len(text) <= max_chars:
        return text
    return text[:max_chars] + "\n\n…(trecho omitido por tamanho)…"


def _format_history(history: list[HistoryMessage]) -> str:
    """Formata as últimas mensagens como bloco de contexto para o prompt."""
    if not history:
        return ""
    lines: list[str] = []
    for msg in history[-6:]:
        role = "Professor" if msg.role == "user" else "Lume"
        content = str(msg.content or "").strip()[:500]
        if content:
            lines.append(f"{role}: {content}")
    if not lines:
        return ""
    return "Histórico recente da conversa:\n" + "\n".join(lines) + "\n\n"


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


def _genai_client() -> genai.Client:
    settings = get_settings()
    if not settings.gemini_api_key:
        raise ServiceUnavailableError("GEMINI_API_KEY não configurada.")
    return genai.Client(api_key=settings.gemini_api_key)


def _answer_text(resp) -> str:
    text = getattr(resp, "text", None)
    if text:
        return str(text).strip()
    return str(resp).strip()


def _generate_lume(prompt: str) -> str:
    """Gera resposta com Google Search; se falhar, tenta sem busca."""
    client = _genai_client()
    configs = [
        types.GenerateContentConfig(
            temperature=0.25,
            tools=[types.Tool(google_search=types.GoogleSearch())],
        ),
        types.GenerateContentConfig(temperature=0.25),
    ]

    last_exc: Exception | None = None
    for idx, config in enumerate(configs):
        for attempt in range(2):
            try:
                resp = client.models.generate_content(
                    model=_LUME_MODEL,
                    contents=prompt,
                    config=config,
                )
                text = _answer_text(resp)
                if text:
                    if idx == 1:
                        log.info("Lume respondeu sem Google Search (fallback)")
                    return text
            except Exception as exc:
                last_exc = exc
                log.warning(
                    "generate_content falhou (search=%s tentativa=%s): %s",
                    idx == 0,
                    attempt + 1,
                    exc,
                )
                if attempt == 0:
                    time.sleep(0.8)

    raise ServiceUnavailableError("A Lume não conseguiu gerar a resposta agora.") from last_exc


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


def _fetch_domain_guide(tool_category: str) -> dict | None:
    client = get_service_client()
    res = supabase_call(
        "lume_domain_guide",
        lambda: client.table("domain_guides")
        .select("title,deep_content")
        .eq("tool_category", tool_category.strip().upper())
        .is_("deleted_at", "null")
        .maybe_single()
        .execute(),
    )
    return getattr(res, "data", None)


def _fetch_related_pills(tool_category: str, exclude_id: UUID | None, limit: int = 2) -> list[dict]:
    client = get_service_client()
    q = (
        client.table("pills")
        .select("title,survival_content")
        .eq("tool_category", tool_category.strip().upper())
        .is_("deleted_at", "null")
        .limit(limit + 2)
    )
    if exclude_id:
        q = q.neq("id", str(exclude_id))
    res = supabase_call("lume_related_pills", lambda: q.execute())
    rows = res.data or []
    return rows[:limit]


def _row_to_card(row: dict) -> PillCardOut:
    return PillCardOut(
        id=row["id"],
        title=row["title"],
        tool_category=row["tool_category"],
        tags=list(row.get("tags") or []),
        views_count=int(row.get("views_count") or 0),
    )


def _build_pill_prompt(row: dict, question: str, history: list[HistoryMessage] | None = None) -> str:
    blocks = [
        _PILL_SYSTEM,
        _format_history(history or []),
        (
            f"## Pílula atual\n"
            f"Título: {row['title']}\n"
            f"Ferramenta: {row['tool_category']}\n\n"
            f"{row['survival_content']}"
        ),
    ]

    guide = _fetch_domain_guide(row["tool_category"])
    if guide:
        blocks.append(
            f"## Guia de domínio — {guide['title']}\n"
            f"{_truncate(guide['deep_content'], 8000)}"
        )

    related = _fetch_related_pills(row["tool_category"], UUID(str(row["id"])))
    for i, rel in enumerate(related, start=1):
        blocks.append(
            f"## Outra pílula da mesma ferramenta ({i})\n"
            f"Título: {rel['title']}\n"
            f"{_truncate(rel['survival_content'], 2500)}"
        )

    blocks.append(f"Pergunta do professor:\n{question}\n\nResposta (pt-BR, Markdown):")
    return "\n\n".join(b for b in blocks if b)


def _build_home_context(
    q: str,
    history: list[HistoryMessage],
) -> tuple[str, bool, list[PillCardOut], list[str]]:
    """
    Monta prompt + metadados para o cenário home.
    Retorna: (prompt, low_confidence, suggested_cards, suggested_questions)
    """
    settings = get_settings()
    candidates, best_sim = hybrid_pill_search(q)

    tags_from = candidates[: settings.lume_lexical_fallback_limit]
    suggested_cards = [_row_to_card(c) for c in tags_from]
    low = best_sim is None or best_sim < settings.lume_similarity_floor or not candidates

    context_blocks: list[str] = []
    seen_categories: set[str] = set()
    for i, c in enumerate(candidates[:6], start=1):
        context_blocks.append(
            f"--- Pílula {i}: {c['title']} ({c['tool_category']}) ---\n"
            f"Tags: {', '.join(c['tags'])}\n"
            f"{c['survival_content']}\n"
        )
        seen_categories.add(c["tool_category"])

    for cat in list(seen_categories)[:2]:
        guide = _fetch_domain_guide(cat)
        if guide:
            context_blocks.append(
                f"--- Guia de domínio: {guide['title']} ({cat}) ---\n"
                f"{_truncate(guide['deep_content'], 4000)}\n"
            )

    mega_ctx = "\n".join(context_blocks) if context_blocks else "(Nenhuma pílula com boa correspondência.)"

    if low:
        guide_hint = (
            "O contexto do HelpProf pode ser fraco. Use a busca na web para complementar com passos práticos "
            "e URLs oficiais. Sugira também reformular a pergunta ou abrir uma pílula relacionada."
        )
    else:
        guide_hint = (
            "Responda com base no material do HelpProf. Se faltar detalhe prático (login, URL, botão), "
            "complemente com busca na web."
        )

    sug_ref = ", ".join(f"{c.id}:{c.title}" for c in suggested_cards)
    history_block = _format_history(history)
    prompt = (
        f"{_HOME_SYSTEM}\n\n{guide_hint}\n\n"
        f"{history_block}"
        f"Pílulas de referência (id:título):\n{sug_ref}\n\n"
        f"Contexto agregado:\n{mega_ctx}\n\n"
        f"Pergunta do professor:\n{q}\n\n"
        "Resposta (pt-BR, Markdown):"
    )

    sug_q = _smart_followup_questions(q, candidates) if low else []
    return prompt, low, suggested_cards, sug_q


def _smart_followup_questions(query: str, candidates: list[dict]) -> list[str]:
    """
    Gera sugestões de perguntas de acompanhamento mais relevantes que a abordagem de tags puras.
    Usa os títulos das pílulas encontradas + perguntas comuns do cotidiano escolar como fallback.
    """
    suggestions: list[str] = []

    # Perguntas derivadas dos títulos das pílulas candidatas (mais específicas)
    for c in candidates[:3]:
        title = str(c.get("title") or "").strip()
        cat = str(c.get("tool_category") or "").strip()
        if title:
            suggestions.append(f"Como {title.lower()}?" if not title.lower().startswith("como") else title + "?")
        elif cat:
            suggestions.append(f"O que mais posso fazer no {cat.title()}?")

    # Fallback com perguntas práticas frequentes no cotidiano escolar
    _common = [
        "Como salvo meu arquivo no OneDrive pela primeira vez?",
        "Por que o SED não abre no meu computador?",
        "Como compartilho um documento com minha turma?",
        "Como acesso o CMSP pelo celular?",
        "Como formato uma planilha de notas no Excel?",
    ]
    for q in _common:
        if q not in suggestions:
            suggestions.append(q)
        if len(suggestions) >= 5:
            break

    return suggestions[:5]


# ─────────────────────────────────────────────────────────────
# Endpoint síncrono (mantido para compatibilidade)
# ─────────────────────────────────────────────────────────────

def run_lume(payload: LumeQueryIn) -> LumeQueryOut:
    q = payload.query.strip()

    if payload.scenario != "pill" and not question_within_scope(q):
        _log_search(q, False)
        return LumeQueryOut(answer=OUT_OF_SCOPE_REPLY_PT, low_confidence=True)

    if payload.scenario == "pill" and payload.pill_id:
        row = _fetch_pill_row(payload.pill_id)
        prompt = _build_pill_prompt(row, q, payload.history)
        t0 = time.perf_counter()
        answer = _generate_lume(prompt)
        log.debug("Lume pilula em %.1f ms", (time.perf_counter() - t0) * 1000)
        _log_search(q, True)
        return LumeQueryOut(answer=answer, low_confidence=False, suggested_pills=[_row_to_card(row)])

    prompt, low, suggested_cards, sug_q = _build_home_context(q, payload.history)
    t0 = time.perf_counter()
    answer = _generate_lume(prompt)
    log.debug("Lume home em %.1f ms", (time.perf_counter() - t0) * 1000)

    found = bool(suggested_cards) and not low
    _log_search(q, found)

    return LumeQueryOut(
        answer=answer,
        low_confidence=low,
        suggested_pills=suggested_cards,
        suggested_questions=sug_q,
    )


# ─────────────────────────────────────────────────────────────
# Endpoint de streaming SSE
# ─────────────────────────────────────────────────────────────

def stream_lume(payload: LumeQueryIn) -> Generator[str, None, None]:
    """
    Gerador SSE para streaming palavra a palavra.

    Formato dos eventos:
      data: {"text": "..."}\\n\\n        — fragmento de texto
      data: {"done": true, "low_confidence": bool,
             "suggested_pills": [...], "suggested_questions": [...]}\\n\\n
    """
    q = payload.query.strip()

    # Guardrail (rápido, sem LLM)
    if payload.scenario != "pill" and not question_within_scope(q):
        _log_search(q, False)
        yield f"data: {json.dumps({'text': OUT_OF_SCOPE_REPLY_PT})}\n\n"
        yield f"data: {json.dumps({'done': True, 'low_confidence': True, 'suggested_pills': [], 'suggested_questions': []})}\n\n"
        return

    # Construção de contexto (síncrona, antes do stream)
    if payload.scenario == "pill" and payload.pill_id:
        row = _fetch_pill_row(payload.pill_id)
        prompt = _build_pill_prompt(row, q, payload.history)
        suggested_cards = [_row_to_card(row)]
        low = False
        sug_q: list[str] = []
        log_found = True
    else:
        prompt, low, suggested_cards, sug_q = _build_home_context(q, payload.history)
        log_found = bool(suggested_cards) and not low

    # Streaming da geração
    client = _genai_client()
    configs = [
        types.GenerateContentConfig(
            temperature=0.25,
            tools=[types.Tool(google_search=types.GoogleSearch())],
        ),
        types.GenerateContentConfig(temperature=0.25),
    ]

    streamed_any = False
    last_exc: Exception | None = None

    for idx, config in enumerate(configs):
        try:
            for chunk in client.models.generate_content_stream(
                model=_LUME_MODEL,
                contents=prompt,
                config=config,
            ):
                text = getattr(chunk, "text", None)
                if text:
                    yield f"data: {json.dumps({'text': text})}\n\n"
                    streamed_any = True
            if streamed_any:
                break
        except Exception as exc:
            last_exc = exc
            log.warning("stream_generate falhou (search=%s): %s", idx == 0, exc)
            if idx < len(configs) - 1:
                time.sleep(0.5)
                continue
            # Ambas as configs falharam
            yield f"data: {json.dumps({'text': 'A Lume não conseguiu gerar a resposta agora. Tente novamente em instantes.'})}\n\n"

    if last_exc and not streamed_any:
        log.error("stream_lume: todas as configs falharam: %s", last_exc)

    # Evento final com metadados
    meta = {
        "done": True,
        "low_confidence": low,
        "suggested_pills": [c.model_dump(mode="json") for c in suggested_cards],
        "suggested_questions": sug_q,
    }
    yield f"data: {json.dumps(meta)}\n\n"

    _log_search(q, log_found)


def apply_pill_embedding(pill_id: UUID, survival_text: str | None = None) -> None:
    """Gera embedding 768-D e persiste via RPC set_pill_embedding."""
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
