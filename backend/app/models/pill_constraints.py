"""Sanitização e validação da URL incorporada do Google Slides."""

from __future__ import annotations

import re
from typing import Any
from urllib.parse import urlparse, urlunparse

# Publicação na web (embed token), sempre salva como /pubembed para o iframe funcionar homogeneamente.
GOOGLE_SLIDES_EMBED_RE = re.compile(
    r"^https://docs\.google\.com/presentation/d/e/[^/\s#?]+/pubembed(\?[^\s#]*)?$",
    re.IGNORECASE,
)

EXPECTED_HOST = "docs.google.com"
EXPECTED_PATH_PREFIX = "/presentation/d/"
# Segurança: só links diretos para apresentações no domínio oficial.
SECURE_PREFIX = "https://docs.google.com/presentation/d/"

_IFRAME_SRC_QUOTED = re.compile(
    r"<iframe\b[^>]*?\bsrc\s*=\s*(['\"])(?P<src>.*?)\1",
    re.IGNORECASE | re.DOTALL,
)
_IFRAME_SRC_UNQUOTED = re.compile(
    r"<iframe\b[^>]*?\bsrc\s*=\s*(?P<src>[^>\s]+)",
    re.IGNORECASE,
)


def extract_iframe_src(raw: str) -> str:
    """Se for snippet de iframe (Google «Incorporar»), extrai só o valor de src."""
    s = raw.strip()
    stripped = s.lstrip()
    if not stripped.lower().startswith("<iframe"):
        return s
    m = _IFRAME_SRC_QUOTED.search(s)
    if m:
        return m.group("src").strip()
    m = _IFRAME_SRC_UNQUOTED.search(s)
    if m:
        return m.group("src").strip().strip("'\"")
    raise ValueError(
        "Código de iframe inválido: não foi encontrado o atributo src. "
        "Cole o link completo ou o HTML de incorporação do Google Slides.",
    )


def _pub_path_to_pubembed(path: str) -> str:
    path_trim = path.rstrip("/") or "/"
    lower = path_trim.lower()
    if lower.endswith("/pubembed"):
        return path_trim
    if lower.endswith("/pub"):
        return path_trim[:-4] + "/pubembed"
    # Caminho já pode estar correto ou será barrado pela regex final.
    return path_trim


def sanitize_google_slides_url(text: str) -> str | None:
    """
    Extrai src de iframe se necessário, força HTTPS, valida prefixo seguro,
    converte .../pub em .../pubembed e garante formato publicado (/d/e/.../pubembed).
    """
    s = extract_iframe_src(text)
    s = s.strip().strip('"').strip("'")
    if not s:
        return None

    if s.startswith("//"):
        s = "https:" + s
    elif len(s) > 7 and s.lower().startswith("http://"):
        s = "https://" + s[7:]

    if not s.lower().startswith(SECURE_PREFIX.lower()):
        raise ValueError(
            "URL do Google Slides inválida. O link deve começar com "
            f"`{SECURE_PREFIX}` e ser o de «Publicar na Web» ou «Incorporar»."
        )

    parsed = urlparse(s)
    if parsed.scheme.lower() != "https":
        raise ValueError("Apenas URLs HTTPS são permitidas para slides.")
    netloc = (parsed.netloc or "").split("@")[-1].lower()
    if ":" in netloc:
        host, _, _port = netloc.partition(":")
        netloc = host
    if netloc != EXPECTED_HOST:
        raise ValueError("Apenas links em docs.google.com são permitidos.")

    path = parsed.path or ""
    if not path.lower().startswith(EXPECTED_PATH_PREFIX):
        raise ValueError("Caminho da URL deve ser de uma apresentação em presentation/d/…")

    path = _pub_path_to_pubembed(path)
    normalized = urlunparse(
        (
            "https",
            EXPECTED_HOST,
            path,
            "",
            parsed.query,
            "",  # descarta fragment (#) por segurança/consistência do iframe
        )
    ).rstrip("?")

    if not GOOGLE_SLIDES_EMBED_RE.match(normalized):
        raise ValueError(
            "URL do Google Slides inválida. Use o link de «Publicar na Web» no formato "
            "…/presentation/d/e/…/pub ou /pubembed (código de incorporação)."
        )
    return normalized


def normalize_slides_url_incoming(value: Any) -> str | None:
    """Entrada da API (Pydantic): None, string vazia ou string a sanitizar."""
    if value is None:
        return None
    if not isinstance(value, str):
        raise TypeError("slides_url deve ser string ou nulo.")
    raw = value.strip()
    if not raw:
        return None
    return sanitize_google_slides_url(raw)
