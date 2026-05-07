from __future__ import annotations

import logging
from functools import lru_cache
from typing import Annotated

import jwt
from fastapi import Header
from jwt import PyJWKClient

from app.config import get_settings
from app.core.errors import ForbiddenError, UnauthorizedError, ServiceUnavailableError

log = logging.getLogger("helpprof.auth")

# Chaves assimétricas servidas pelo JWKS do Supabase (RSA + EC; ex.: RS256, ES256).
_JWKS_ALGORITHMS = frozenset(
    {"RS256", "RS384", "RS512", "ES256", "ES384", "ES512"},
)


@lru_cache(maxsize=8)
def _jwks_client(supabase_url_base: str) -> PyJWKClient:
    base = supabase_url_base.rstrip("/")
    return PyJWKClient(f"{base}/auth/v1/.well-known/jwks.json", cache_keys=True)


def _decode_supabase_access_token(token: str) -> dict:
    """Valida o JWT do Supabase Auth: HS256 (secret) ou algoritmos JWKS (ex. RS256, ES256)."""
    settings = get_settings()
    header = jwt.get_unverified_header(token)
    alg = (header.get("alg") or "HS256").upper()

    common = {
        "audience": "authenticated",
        "options": {"require": ["exp", "sub"]},
    }

    if alg in _JWKS_ALGORITHMS:
        if not settings.supabase_url:
            raise ServiceUnavailableError(
                "SUPABASE_URL necessário para validar tokens JWT assimétricos (JWKS do Supabase)."
            )
        jwks = _jwks_client(settings.supabase_url)
        signing_key = jwks.get_signing_key_from_jwt(token)
        return jwt.decode(
            token,
            signing_key.key,
            algorithms=[alg],
            audience=common["audience"],
            options=common["options"],
        )

    if alg == "HS256":
        if not settings.supabase_jwt_secret:
            raise ServiceUnavailableError("SUPABASE_JWT_SECRET necessário para tokens JWT HS256.")
        return jwt.decode(
            token,
            settings.supabase_jwt_secret,
            algorithms=["HS256"],
            audience=common["audience"],
            options=common["options"],
        )

    log.warning("JWT alg não suportado: %s", alg)
    raise UnauthorizedError(f"Algoritmo JWT não suportado: {alg}")


def require_supabase_user(authorization: Annotated[str | None, Header()] = None) -> dict:
    if not authorization or not authorization.lower().startswith("bearer "):
        raise UnauthorizedError("Cabeçalho Authorization Bearer ausente.")

    token = authorization.split(" ", 1)[1].strip()
    try:
        payload = _decode_supabase_access_token(token)
    except jwt.PyJWTError as exc:
        log.warning("JWT inválido (%s): %s", type(exc).__name__, exc)
        raise UnauthorizedError("Sessão inválida ou expirada.") from exc

    email = (payload.get("email") or "").strip().lower()
    allowed = get_settings().admin_emails
    if allowed and email not in allowed:
        raise ForbiddenError("Usuário sem permissão para o painel Triad Support.")

    return payload
