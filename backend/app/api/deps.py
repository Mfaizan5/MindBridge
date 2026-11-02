import hmac
import uuid
from collections.abc import Callable
from dataclasses import dataclass
from datetime import UTC, datetime, timedelta
from typing import Annotated

from fastapi import Cookie, Depends, Header, Request
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.core.errors import forbidden, unauthorized
from app.core.security import hash_token
from app.db.session import get_db
from app.models import AuthSession, User
from app.models.enums import Role, UserStatus

SESSION_COOKIE = "mb_session"
CSRF_HEADER = "X-CSRF-Token"
UNSAFE_METHODS = {"POST", "PUT", "PATCH", "DELETE"}


@dataclass(frozen=True)
class CurrentUser:
    user: User
    session_id: uuid.UUID
    csrf_token: str

    @property
    def id(self) -> uuid.UUID:
        return self.user.id

    @property
    def role(self) -> Role:
        return self.user.role


def _as_utc(value: datetime) -> datetime:
    return value if value.tzinfo else value.replace(tzinfo=UTC)


def get_current_user(
    request: Request,
    db: Annotated[Session, Depends(get_db)],
    mb_session: Annotated[str | None, Cookie(alias=SESSION_COOKIE)] = None,
) -> CurrentUser:
    """Resolves the session cookie to a user. Enforces the idle timeout, the absolute lifetime and account status."""
    if not mb_session:
        raise unauthorized()
    session = db.scalar(select(AuthSession).where(AuthSession.token_hash == hash_token(mb_session)))
    now = datetime.now(UTC)
    settings = get_settings()
    if session is None or session.revoked_at is not None:
        raise unauthorized()
    if now >= _as_utc(session.expires_at) or now - _as_utc(session.last_seen_at) > timedelta(
        minutes=settings.session_idle_minutes
    ):
        session.revoked_at = now
        db.commit()
        raise unauthorized("Your session has ended. Please log in again.")
    user = db.get(User, session.user_id)
    if user is None or user.status != UserStatus.active:
        raise unauthorized("This account is not available. Please contact support.")
    session.last_seen_at = now
    db.commit()
    request.state.user_id = str(user.id)
    return CurrentUser(user=user, session_id=session.id, csrf_token=session.csrf_token)


CurrentUserDep = Annotated[CurrentUser, Depends(get_current_user)]


def require_csrf(
    request: Request,
    current: CurrentUserDep,
    x_csrf_token: Annotated[str | None, Header(alias=CSRF_HEADER)] = None,
) -> CurrentUser:
    """State-changing requests must echo the session's CSRF token in a header (double-submit style, token stored server-side)."""
    if request.method in UNSAFE_METHODS:
        if not x_csrf_token or not hmac.compare_digest(x_csrf_token, current.csrf_token):
            raise forbidden("Your request could not be verified. Refresh the page and try again.")
    return current


CsrfUserDep = Annotated[CurrentUser, Depends(require_csrf)]


def require_roles(*roles: Role) -> Callable[..., CurrentUser]:
    """Role gate. Use together with ownership checks in the service layer, which is still required."""

    def checker(current: CsrfUserDep) -> CurrentUser:
        if current.role not in roles:
            raise forbidden()
        return current

    return checker


StudentDep = Annotated[CurrentUser, Depends(require_roles(Role.student))]
PsychologistDep = Annotated[CurrentUser, Depends(require_roles(Role.psychologist))]
AdminDep = Annotated[CurrentUser, Depends(require_roles(Role.admin))]
DbDep = Annotated[Session, Depends(get_db)]
