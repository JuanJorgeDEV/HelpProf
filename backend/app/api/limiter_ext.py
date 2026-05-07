from __future__ import annotations

from slowapi import Limiter
from slowapi.util import get_remote_address
from starlette.requests import Request

limiter = Limiter(key_func=get_remote_address)


def pill_view_key(request: Request) -> str:
    pill = request.path_params.get("pill_id", "")
    return f"{pill}|{get_remote_address(request)}"
