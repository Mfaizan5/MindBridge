from datetime import UTC, datetime, timedelta

from sqlalchemy import delete, func, select
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.core.errors import AppError
from app.models import RateLimitHit


def enforce_rate_limit(db: Session, bucket: str) -> None:
    """Fixed one-minute window per bucket, stored in the database so every worker shares the count.

    Raises 429 once the window is full. Old rows are removed as a side effect.
    """
    now = datetime.now(UTC)
    window_start = now - timedelta(minutes=1)
    db.execute(delete(RateLimitHit).where(RateLimitHit.hit_at < window_start - timedelta(minutes=5)))
    count = db.scalar(
        select(func.count()).select_from(RateLimitHit).where(RateLimitHit.bucket == bucket, RateLimitHit.hit_at >= window_start)
    )
    if (count or 0) >= get_settings().rate_limit_per_minute:
        raise AppError(
            429,
            "rate_limited",
            "Too many attempts. Please wait a minute and try again.",
        )
    db.add(RateLimitHit(bucket=bucket, hit_at=now))
    db.commit()
