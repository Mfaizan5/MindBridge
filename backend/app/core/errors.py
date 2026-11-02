from fastapi import Request
from fastapi.responses import JSONResponse


class AppError(Exception):
    """An expected, user-facing error. Carries an HTTP status, a stable code, and a safe message.

    Never put SQL, stack traces, or personal data in the message.
    """

    def __init__(self, status_code: int, code: str, message: str) -> None:
        super().__init__(message)
        self.status_code = status_code
        self.code = code
        self.message = message


def unauthorized(message: str = "Please log in to continue.") -> AppError:
    return AppError(401, "unauthorized", message)


def forbidden(message: str = "You do not have permission to do this.") -> AppError:
    return AppError(403, "forbidden", message)


def not_found(message: str = "Not found.") -> AppError:
    return AppError(404, "not_found", message)


def conflict(message: str) -> AppError:
    return AppError(409, "conflict", message)


def invalid(message: str) -> AppError:
    return AppError(422, "invalid", message)


async def app_error_handler(_: Request, exc: AppError) -> JSONResponse:
    return JSONResponse(
        status_code=exc.status_code,
        content={"error": {"code": exc.code, "message": exc.message}},
    )
