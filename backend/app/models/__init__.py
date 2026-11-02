"""Import every model so Alembic and SQLAlchemy see the full schema."""

from app.models.identity import AuthSession, PasswordResetToken, RateLimitHit, User
from app.models.platform import AuditLog, Notification, PlatformSetting
from app.models.professionals import (
    Appointment,
    AppointmentEvent,
    PsychologistProfile,
    Qualification,
    Slot,
)
from app.models.wellbeing import (
    Consent,
    JournalEntry,
    MoodRecord,
    Questionnaire,
    QuestionnaireQuestion,
    QuestionnaireResult,
    Resource,
)

__all__ = [
    "Appointment",
    "AppointmentEvent",
    "AuditLog",
    "AuthSession",
    "Consent",
    "JournalEntry",
    "MoodRecord",
    "Notification",
    "PasswordResetToken",
    "PlatformSetting",
    "PsychologistProfile",
    "Qualification",
    "Questionnaire",
    "QuestionnaireQuestion",
    "QuestionnaireResult",
    "RateLimitHit",
    "Resource",
    "Slot",
    "User",
]
