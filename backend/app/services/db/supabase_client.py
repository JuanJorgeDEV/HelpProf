from __future__ import annotations

import logging
import time
from functools import lru_cache
from typing import Any

from supabase import Client, create_client

from app.config import get_settings
from app.core.errors import ServiceUnavailableError

log = logging.getLogger("helpprof.supabase")


def _require_url_key() -> tuple[str, str]:
    settings = get_settings()
    url = settings.supabase_url
    key = settings.supabase_service_role_key
    if not url or not key:
        raise ServiceUnavailableError("Supabase não está configurado.")
    return url, key


@lru_cache
def get_service_client() -> Client:
    """Cliente com service_role — bypass RLS; uso exclusivo no backend."""
    url, key = _require_url_key()
    return create_client(url, key)


def get_anon_client() -> Client:
    """Cliente anon — respeita RLS em leituras públicas (requer SUPABASE_ANON_KEY)."""
    settings = get_settings()
    if not settings.supabase_url or not settings.supabase_anon_key:
        raise ServiceUnavailableError("SUPABASE_ANON_KEY não configurada para leituras públicas.")
    return create_client(settings.supabase_url, settings.supabase_anon_key)


def supabase_call(name: str, fn) -> Any:
    t0 = time.perf_counter()
    try:
        return fn()
    finally:
        ms = (time.perf_counter() - t0) * 1000
        log.debug("Supabase %s concluído em %.1f ms", name, ms)
