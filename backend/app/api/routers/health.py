from __future__ import annotations

from fastapi import APIRouter

from app.config import get_settings
from app.models.schemas import HealthOut

router = APIRouter(tags=["health"])


@router.get("/health", response_model=HealthOut)
def health() -> HealthOut:
    settings = get_settings()
    deps = {
        "supabase_url": "ok" if settings.supabase_url else "missing",
        "supabase_service_role_key": "ok" if settings.supabase_service_role_key else "missing",
        "gemini_api_key": "ok" if settings.gemini_api_key else "missing",
    }
    ok = settings.supabase_url and settings.supabase_service_role_key and settings.gemini_api_key
    return HealthOut(status="ok" if ok else "degraded", dependencies=deps)
