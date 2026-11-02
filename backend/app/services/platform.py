import uuid
from datetime import UTC, datetime

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.models import AuditLog, Notification, PlatformSetting, User

CANCELLATION_KEY = "cancellation_window_hours"


def now_utc() -> datetime:
    return datetime.now(UTC)


def audit(
    db: Session,
    actor: User | uuid.UUID | None,
    action: str,
    target_type: str,
    target_id: str | None,
    details: dict | None = None,
) -> None:
    """Records a sensitive action. Details must never contain wellbeing content or journal text."""
    actor_id = actor.id if isinstance(actor, User) else actor
    db.add(
        AuditLog(
            actor_id=actor_id,
            action=action,
            target_type=target_type,
            target_id=target_id,
            details=details or {},
        )
    )


def notify(db: Session, user_id: uuid.UUID, title: str, body: str) -> None:
    db.add(Notification(user_id=user_id, title=title, body=body))


def cancellation_window_hours(db: Session) -> int:
    row = db.get(PlatformSetting, CANCELLATION_KEY)
    if row is None:
        return get_settings().default_cancellation_window_hours
    return int(row.value["hours"])


def set_cancellation_window_hours(db: Session, hours: int) -> None:
    row = db.get(PlatformSetting, CANCELLATION_KEY)
    if row is None:
        db.add(PlatformSetting(key=CANCELLATION_KEY, value={"hours": hours}))
    else:
        row.value = {"hours": hours}
        row.updated_at = now_utc()


def list_notifications(db: Session, user_id: uuid.UUID) -> list[Notification]:
    return list(
        db.scalars(
            select(Notification).where(Notification.user_id == user_id).order_by(Notification.created_at.desc()).limit(200)
        )
    )
