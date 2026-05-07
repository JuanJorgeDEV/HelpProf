from __future__ import annotations

from fastapi import APIRouter

from app.models.schemas import LumeQueryIn, LumeQueryOut
from app.services.ai.lume import run_lume

router = APIRouter(prefix="/lume", tags=["lume"])


@router.post("/query", response_model=LumeQueryOut)
def lume_query(payload: LumeQueryIn) -> LumeQueryOut:
    return run_lume(payload)
