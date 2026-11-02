from typing import Annotated

from fastapi import APIRouter, Cookie, Request, Response, status

from app.api.deps import SESSION_COOKIE, CurrentUserDep, DbDep
from app.core.config import get_settings
from app.core.ratelimit import enforce_rate_limit
from app.models import User
from app.schemas.auth import (
    LoginIn,
    ResetConfirmIn,
    ResetRequestIn,
    SessionOut,
    SignUpIn,
    UserOut,
)
from app.services import accounts

router = APIRouter(prefix="/auth", tags=["auth"])


def _client_ip(request: Request) -> str:
    return request.client.host if request.client else "unknown"


def _set_session_cookie(response: Response, token: str) -> None:
    settings = get_settings()
    response.set_cookie(
        key=SESSION_COOKIE,
        value=token,
        max_age=settings.session_max_hours * 3600,
        httponly=True,
        secure=settings.cookie_secure,
        samesite="lax",
        path="/",
    )


def _session_payload(user: User, csrf: str) -> SessionOut:
    return SessionOut(user=UserOut.model_validate(user, from_attributes=True), csrf_token=csrf)


@router.post("/signup", status_code=status.HTTP_201_CREATED, response_model=SessionOut)
def signup(payload: SignUpIn, request: Request, response: Response, db: DbDep) -> SessionOut:
    enforce_rate_limit(db, f"signup:{_client_ip(request)}")
    user = accounts.sign_up(db, payload)
    token, csrf = accounts.open_session(db, user)
    _set_session_cookie(response, token)
    return _session_payload(user, csrf)


@router.post("/login", response_model=SessionOut)
def login(payload: LoginIn, request: Request, response: Response, db: DbDep) -> SessionOut:
    enforce_rate_limit(db, f"login-ip:{_client_ip(request)}")
    enforce_rate_limit(db, f"login-email:{payload.email.lower()}")
    user = accounts.authenticate(db, payload.email, payload.password, payload.role)
    token, csrf = accounts.open_session(db, user)
    _set_session_cookie(response, token)
    return _session_payload(user, csrf)


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
def logout(
    response: Response,
    db: DbDep,
    mb_session: Annotated[str | None, Cookie(alias=SESSION_COOKIE)] = None,
) -> Response:
    accounts.revoke_session(db, mb_session)
    response.delete_cookie(SESSION_COOKIE, path="/")
    response.status_code = status.HTTP_204_NO_CONTENT
    return response


@router.get("/me", response_model=SessionOut)
def me(current: CurrentUserDep) -> SessionOut:
    return _session_payload(current.user, current.csrf_token)


@router.post("/password-reset/request", status_code=status.HTTP_202_ACCEPTED)
def request_reset(payload: ResetRequestIn, request: Request, db: DbDep) -> dict[str, str]:
    enforce_rate_limit(db, f"reset-ip:{_client_ip(request)}")
    accounts.request_password_reset(db, payload.email)
    # Same answer whether or not the account exists.
    return {"message": "If an account exists for that email, a reset link has been sent."}


@router.post("/password-reset/confirm", status_code=status.HTTP_204_NO_CONTENT)
def confirm_reset(payload: ResetConfirmIn, request: Request, db: DbDep) -> Response:
    enforce_rate_limit(db, f"reset-confirm-ip:{_client_ip(request)}")
    accounts.confirm_password_reset(db, payload.token, payload.password)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
