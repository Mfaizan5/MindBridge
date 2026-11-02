import logging
import uuid
from datetime import UTC, datetime, timedelta

from sqlalchemy import delete, func, select, update
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.core.errors import AppError, conflict, forbidden, invalid, unauthorized
from app.core.security import hash_password, hash_token, new_token, verify_password
from app.models import AuthSession, PasswordResetToken, PsychologistProfile, User
from app.models.enums import Role, UserStatus
from app.schemas.auth import SignUpIn

log = logging.getLogger("mindbridge.accounts")

# Used to keep login timing similar when the email is unknown (prevents account enumeration by timing).
_DUMMY_HASH = hash_password("timing-equaliser-not-a-real-password")
ROLE_LABEL = {
    Role.student: "student",
    Role.psychologist: "psychologist",
    Role.admin: "administrator",
}


def _now() -> datetime:
    return datetime.now(UTC)


def find_user_by_email(db: Session, email: str) -> User | None:
    return db.scalar(select(User).where(func.lower(User.email) == email.strip().lower()))


def sign_up(db: Session, payload: SignUpIn) -> User:
    """Creates a student or psychologist account. Psychologists start unverified and unpublished (VR-10, VR-11)."""
    if find_user_by_email(db, payload.email):
        raise conflict("An account with this email already exists.")
    role = Role(payload.role)
    user = User(
        name=payload.name,
        email=payload.email.strip().lower(),
        password_hash=hash_password(payload.password),
        role=role,
        status=UserStatus.active,
    )
    db.add(user)
    try:
        db.flush()
        if role == Role.psychologist:
            db.add(
                PsychologistProfile(
                    user_id=user.id,
                    specialization="",
                    bio="",
                    experience_years=0,
                    verified=False,
                    published=False,
                )
            )
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        raise conflict("An account with this email already exists.") from exc
    db.refresh(user)
    return user


def authenticate(db: Session, email: str, password: str, role: Role | None) -> User:
    """Checks the password first, then the role, then account status. Wrong passwords never reveal the role."""
    user = find_user_by_email(db, email)
    if user is None:
        verify_password(password, _DUMMY_HASH)
        raise unauthorized("Email or password is incorrect.")
    if not verify_password(password, user.password_hash):
        raise unauthorized("Email or password is incorrect.")
    if role is not None and user.role != role:
        raise forbidden(f"This email does not belong to a {ROLE_LABEL[role]} account. Choose the other option to log in.")
    if user.status != UserStatus.active:
        raise forbidden("This account is suspended. Please contact support.")
    return user


def open_session(db: Session, user: User) -> tuple[str, str]:
    """Creates a server-side session. Returns the raw cookie token and the CSRF token. Only hashes are stored."""
    token = new_token()
    csrf = new_token()
    now = _now()
    db.add(
        AuthSession(
            user_id=user.id,
            token_hash=hash_token(token),
            csrf_token=csrf,
            created_at=now,
            last_seen_at=now,
            expires_at=now + timedelta(hours=get_settings().session_max_hours),
        )
    )
    user.last_login_at = now
    db.commit()
    return token, csrf


def revoke_session(db: Session, token: str | None) -> None:
    if not token:
        return
    session = db.scalar(select(AuthSession).where(AuthSession.token_hash == hash_token(token)))
    if session and session.revoked_at is None:
        session.revoked_at = _now()
        db.commit()


def revoke_all_sessions(db: Session, user_id: uuid.UUID) -> None:
    db.execute(
        update(AuthSession).where(AuthSession.user_id == user_id, AuthSession.revoked_at.is_(None)).values(revoked_at=_now())
    )


def request_password_reset(db: Session, email: str) -> None:
    """Always returns the same answer, so the response never reveals whether the account exists."""
    user = find_user_by_email(db, email)
    if user is None or user.status != UserStatus.active:
        return
    token = new_token()
    db.add(
        PasswordResetToken(
            user_id=user.id,
            token_hash=hash_token(token),
            expires_at=_now() + timedelta(minutes=get_settings().password_reset_minutes),
        )
    )
    db.commit()
    # Email delivery is not configured (A-12). In development the link is written to the server log only.
    if get_settings().log_password_reset_links:
        log.warning(
            "DEV password reset link for %s: /reset-password?token=%s",
            user.email,
            token,
        )


def confirm_password_reset(db: Session, token: str, new_password: str) -> None:
    record = db.scalar(select(PasswordResetToken).where(PasswordResetToken.token_hash == hash_token(token)))
    if record is None or record.used_at is not None or _now() >= _as_utc(record.expires_at):
        raise invalid("This reset link is invalid or has expired. Request a new one.")
    user = db.get(User, record.user_id)
    if user is None:
        raise invalid("This reset link is invalid or has expired. Request a new one.")
    user.password_hash = hash_password(new_password)
    record.used_at = _now()
    revoke_all_sessions(db, user.id)
    db.commit()


def purge_expired_reset_tokens(db: Session) -> None:
    db.execute(delete(PasswordResetToken).where(PasswordResetToken.expires_at < _now() - timedelta(days=1)))
    db.commit()


def _as_utc(value: datetime) -> datetime:
    return value if value.tzinfo else value.replace(tzinfo=UTC)


__all__ = [
    "AppError",
    "authenticate",
    "confirm_password_reset",
    "find_user_by_email",
    "open_session",
    "request_password_reset",
    "revoke_all_sessions",
    "revoke_session",
    "sign_up",
]
