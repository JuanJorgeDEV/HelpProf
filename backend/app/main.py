from __future__ import annotations

import logging
import traceback
from typing import Any

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from slowapi.errors import RateLimitExceeded

from app.api.limiter_ext import limiter
from app.api.routers import admin, categories, domain_guides_public, embed_webhook, health, lume_router, pills
from app.config import get_settings
from app.core.errors import HelpProfError

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(name)s %(message)s",
)
logger = logging.getLogger("helpprof")


def create_app() -> FastAPI:
    settings = get_settings()

    application = FastAPI(
        title="HelpProf API",
        description=(
            "MVP backend — Micro-learning Dual Guide | pílulas (Sobrevivência) "
            "+ guias de domínio + Lume (IA) com Gemini e Supabase/pgvector."
        ),
        version="0.1.0",
        docs_url="/docs",
        openapi_url="/openapi.json",
        redoc_url="/redoc",
    )

    application.state.limiter = limiter

    @application.exception_handler(RateLimitExceeded)
    async def rate_limit(_: Request, exc: RateLimitExceeded) -> JSONResponse:
        return JSONResponse(
            status_code=429,
            content={
                "error": {
                    "code": "rate_limited",
                    "message": getattr(exc, "detail", "Muitas requisições. Tente novamente em instantes."),
                },
            },
        )

    @application.exception_handler(HelpProfError)
    async def handle_helpprof(_: Request, exc: HelpProfError) -> JSONResponse:
        body: dict[str, Any] = {"error": {"code": exc.code, "message": exc.message}}
        if exc.detail is not None:
            body["error"]["detail"] = exc.detail
        return JSONResponse(status_code=exc.status_code, content=body)

    @application.exception_handler(RequestValidationError)
    async def handle_validation(_: Request, exc: RequestValidationError) -> JSONResponse:
        def _safe(v: Any) -> Any:
            if isinstance(v, dict):
                return {k: _safe(w) for k, w in v.items()}
            if isinstance(v, list):
                return [_safe(i) for i in v]
            if isinstance(v, (str, int, float, bool)) or v is None:
                return v
            return str(v)

        return JSONResponse(
            status_code=422,
            content={
                "error": {
                    "code": "validation_error",
                    "message": "Parâmetros inválidos.",
                    "detail": [_safe(e) for e in exc.errors()],
                },
            },
        )

    @application.exception_handler(Exception)
    async def handle_unhandled(_: Request, exc: Exception) -> JSONResponse:
        logger.exception("Erro não tratado: %s", exc)
        if settings.environment.lower() == "production":
            return JSONResponse(
                status_code=500,
                content={"error": {"code": "internal", "message": "Erro interno no servidor."}},
            )
        return JSONResponse(
            status_code=500,
            content={
                "error": {
                    "code": "internal",
                    "message": "Erro interno no servidor.",
                    "detail": str(exc),
                    "traceback": traceback.format_exc(),
                },
            },
        )

    _default_origins = [
        "http://localhost:3000",
        "http://127.0.0.1:5500",
        "http://localhost:5500",
        "http://127.0.0.1:5503",
        "http://localhost:5503",
        "null",
    ]
    cors = list({*_default_origins, *settings.cors_origins})
    application.add_middleware(
        CORSMiddleware,
        allow_origins=cors,
        allow_credentials=False,
        allow_methods=["*"],
        allow_headers=["*"],
        expose_headers=["*"],
    )

    api_prefix = "/api/v1"
    application.include_router(health.router, prefix=api_prefix)
    application.include_router(pills.router, prefix=api_prefix)
    application.include_router(categories.router, prefix=api_prefix)
    application.include_router(domain_guides_public.router, prefix=api_prefix)
    application.include_router(lume_router.router, prefix=api_prefix)
    application.include_router(admin.router, prefix=api_prefix)
    application.include_router(embed_webhook.router, prefix=api_prefix)

    @application.get("/", include_in_schema=False)
    async def root() -> dict[str, str]:
        return {"service": "helpprof-api", "docs": "/docs"}

    return application


app = create_app()
