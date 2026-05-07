from __future__ import annotations

from typing import Any


class HelpProfError(Exception):
    status_code: int = 400
    code: str = "helpprof_error"

    def __init__(self, message: str = "Erro ao processar a solicitação.", detail: Any | None = None):
        self.message = message
        self.detail = detail
        super().__init__(message)


class NotFoundError(HelpProfError):
    status_code = 404
    code = "not_found"


class UnauthorizedError(HelpProfError):
    status_code = 401
    code = "unauthorized"


class ForbiddenError(HelpProfError):
    status_code = 403
    code = "forbidden"


class ServiceUnavailableError(HelpProfError):
    status_code = 503
    code = "service_unavailable"


class InternalServerHelpProfError(HelpProfError):
    status_code = 500
    code = "internal"
