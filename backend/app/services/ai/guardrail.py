"""
Guardrail rápido por palavras-chave — sem chamada LLM.

Bloqueia apenas tópicos claramente fora do universo escolar/tecnológico.
O padrão é LIBERAR: professores merecem o benefício da dúvida.
Remove ~2-4 s de latência por query eliminando a segunda chamada ao Gemini.
"""
from __future__ import annotations

import re

OUT_OF_SCOPE_REPLY_PT = (
    "Professor, sou a Lume, assistente técnica do HelpProf. "
    "Só consigo ajudar com ferramentas e tecnologia escolar (Word, Excel, OneDrive, "
    "SED, CMSP, Canva, WhatsApp e outras). Como posso ajudar?"
)

# Pares (nome_legível, padrão_regex).
# Matching é case-insensitive. Delimitadores \b evitam falsos positivos.
_BLOCK_RULES: list[tuple[str, str]] = [
    (
        "culinária",
        r"\b(receita(s)?\s+de|culin[áa]ri[ao]|gastronomia|ingrediente(s)?\s+para|como\s+cozinhar|tempero)\b",
    ),
    (
        "esportes",
        r"\b(futebol|basquete|v[oô]lei|t[êe]nis\s+de\s+campo|natação|campeonato\s+brasileiro|gol\s+do|pelada)\b",
    ),
    (
        "política-partidária",
        r"\b(elei[çc][aã]o\s+(para|de)|partido\s+pol[íi]tico|deputado\s+federal|senador\s+(da|de)|presidente\s+da\s+rep[uú]blica)\b",
    ),
    (
        "apostas",
        r"\b(apostas?\s+esportiva(s)?|bet365|betano|loteria\s+federal|jogo\s+do\s+bicho)\b",
    ),
    (
        "entretenimento-puro",
        r"\b(netflix|prime\s+video|disney\s*\+|hbo\s+max|filmografia\s+de|série\s+policial)\b",
    ),
]

# Termos que salvam a pergunta de ser bloqueada mesmo que contenha palavra suspeita.
_SCHOOL_RESCUE: list[str] = [
    r"\b(escola|aluno|turma|aula|professor|sala\s+de\s+aula|rede\s+p[uú]blica|pedagog)\b",
    r"\b(sed|cmsp|onedrive|word|excel|canva|kahoot|teams|classroom|google)\b",
]


def question_within_scope(question: str) -> bool:
    """
    Retorna False somente quando a pergunta claramente não tem relação com
    tecnologia escolar. Qualquer dúvida sobre o universo educacional passa.
    """
    q = question.strip()
    if not q:
        return True

    q_lower = q.lower()

    # Se há indício escolar explícito, não bloqueia independente do resto.
    for rescue in _SCHOOL_RESCUE:
        if re.search(rescue, q_lower, re.IGNORECASE):
            return True

    for _name, pattern in _BLOCK_RULES:
        if re.search(pattern, q_lower, re.IGNORECASE):
            return False

    return True
