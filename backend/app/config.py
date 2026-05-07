from __future__ import annotations

import logging
from functools import lru_cache
from pathlib import Path

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


log = logging.getLogger("helpprof.settings")

_BACKEND_DIR = Path(__file__).resolve().parent.parent
# Carrega sempre backend/.env, e também `.env` no diretório de trabalho atual (fallback).
_ENV_FILES = (_BACKEND_DIR / ".env", Path(".env"))


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=_ENV_FILES,
        env_file_encoding="utf-8",
        extra="ignore",
    )

    environment: str = Field(default="development", alias="ENVIRONMENT")
    supabase_url: str | None = Field(default=None, alias="SUPABASE_URL")
    supabase_service_role_key: str | None = Field(default=None, alias="SUPABASE_SERVICE_ROLE_KEY")
    supabase_anon_key: str | None = Field(default=None, alias="SUPABASE_ANON_KEY")
    supabase_jwt_secret: str | None = Field(default=None, alias="SUPABASE_JWT_SECRET")

    gemini_api_key: str | None = Field(default=None, alias="GEMINI_API_KEY")

    # Triad Support — e-mails autorizados (opcional); vazio permite qualquer usuário JWT autenticado
    admin_emails_csv: str = Field(default="", alias="ADMIN_EMAILS")

    embed_webhook_secret: str | None = Field(default=None, alias="EMBED_WEBHOOK_SECRET")

    lume_similarity_floor: float = Field(default=0.28, alias="LUME_SIMILARITY_FLOOR")
    lume_lexical_fallback_limit: int = Field(default=8, alias="LUME_LEXICAL_FALLBACK_LIMIT")
    cors_origins_csv: str = Field(default="", alias="CORS_ORIGINS")

    @property
    def admin_emails(self) -> frozenset[str]:
        return frozenset(
            e.strip().lower()
            for e in self.admin_emails_csv.replace(";", ",").split(",")
            if e.strip()
        )

    @property
    def cors_origins(self) -> list[str]:
        origins = [o.strip() for o in self.cors_origins_csv.split(",") if o.strip()]
        return origins


@lru_cache
def get_settings() -> Settings:
    settings = Settings()
    missing = []
    if not settings.supabase_url:
        missing.append("SUPABASE_URL")
    if not settings.supabase_service_role_key:
        missing.append("SUPABASE_SERVICE_ROLE_KEY")
    if not settings.gemini_api_key:
        missing.append("GEMINI_API_KEY")

    if missing:
        log.warning(
            "Variáveis críticas ausentes — rotas IA e CRUD bypass podem ficar indisponíveis: %s",
            ", ".join(missing),
        )
    return settings


def clear_settings_cache() -> None:
    get_settings.cache_clear()
