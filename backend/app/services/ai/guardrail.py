from __future__ import annotations

import json
import logging
import re
import time

from google import genai
from google.genai import types

from app.config import get_settings
from app.core.errors import ServiceUnavailableError

log = logging.getLogger("helpprof.gemini.guardrail")

OUT_OF_SCOPE_REPLY_PT = (
    "Professor, sou a Lume, assistente técnica do HelpProf. "
    "Só consigo ajudar com ferramentas escolares como OneDrive, Excel, etc. "
    "Como posso auxiliar nessas ferramentas?"
)

_GUARDRAIL_INSTRUCTION = """Você é um classificador de escopo para suporte tecnológico a professores da rede pública.

Decida se a pergunta tem relação com: ferramentas digitais (Office, Google Workspace, OneDrive, SED, Moodle, reprodução de vídeo em sala, projetor, impressora escolar), educação em ambiente escolar ou suporte a uso de tecnologia na escola.

Responda SOMENTE um JSON válido no formato exato:
{"dentro_escopo": true}
ou
{"dentro_escopo": false}

Pergunta do professor:
"""


def question_within_scope(question: str) -> bool:
    settings = get_settings()
    if not settings.gemini_api_key:
        raise ServiceUnavailableError("GEMINI_API_KEY não configurada.")

    client = genai.Client(api_key=settings.gemini_api_key)
    t0 = time.perf_counter()
    try:
        resp = client.models.generate_content(
            model="gemini-2.5-flash",
            contents=_GUARDRAIL_INSTRUCTION + question.strip(),
            config=types.GenerateContentConfig(temperature=0.0),
        )
    except Exception as exc:
        log.exception("Falha no guardrail Gemini: %s", exc)
        raise ServiceUnavailableError("Triagem de escopo indisponível no momento.") from exc

    ms = (time.perf_counter() - t0) * 1000
    log.debug("Guardrail Gemini em %.1f ms", ms)

    text = (getattr(resp, "text", None) or "").strip()
    if not text:
        return True  # falha segura para não bloquear suporte legítimo em caso de timeout vazio

    try:
        data = json.loads(text)
        return bool(data.get("dentro_escopo"))
    except json.JSONDecodeError:
        m = re.search(r"\{[^}]*dentro_escopo[^}]*\}", text, re.I)
        if m:
            try:
                data = json.loads(m.group(0))
                return bool(data.get("dentro_escopo"))
            except json.JSONDecodeError:
                pass

    low = text.lower()
    if "false" in low and "dentro_escopo" in low.replace(" ", ""):
        return False
    return True
