import uuid
from datetime import datetime
from decimal import Decimal

from sqlalchemy import (
    Boolean,
    CheckConstraint,
    DateTime,
    Enum,
    ForeignKey,
    Integer,
    Numeric,
    String,
    Text,
    func,
    text,
)
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base
from app.models.enums import (
    ENUM_VALUES,
    ConsentScope,
    Mood,
    QuestionnaireStatus,
    ResourceCategory,
)


class MoodRecord(Base):
    """One check-in: mood, stress (1–10) and sleep hours. The brief keeps all three in one record (SCR-04)."""

    __tablename__ = "mood_records"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    student_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    mood: Mapped[Mood] = mapped_column(Enum(Mood, name="mood", values_callable=ENUM_VALUES))
    stress: Mapped[int] = mapped_column(Integer)
    sleep_hours: Mapped[Decimal] = mapped_column(Numeric(4, 1))
    note: Mapped[str] = mapped_column(String(500), default="", server_default="")
    recorded_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    __table_args__ = (
        CheckConstraint("stress BETWEEN 1 AND 10", name="stress_range"),
        # Sleep is 0–24 hours in half-hour steps (A-09).
        CheckConstraint("sleep_hours BETWEEN 0 AND 24", name="sleep_range"),
        CheckConstraint("(sleep_hours * 2) = floor(sleep_hours * 2)", name="sleep_half_hour_steps"),
    )


class JournalEntry(Base):
    """Private journal. The content is encrypted at rest with the application key (R-04)."""

    __tablename__ = "journal_entries"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    student_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    content_encrypted: Mapped[str] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())


class Questionnaire(Base):
    """A versioned wellness questionnaire. Only reviewed (approved) content is shown to students (A-05)."""

    __tablename__ = "questionnaires"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(String(200))
    version: Mapped[int] = mapped_column(Integer, default=1)
    purpose: Mapped[str] = mapped_column(Text)
    approx_minutes: Mapped[int] = mapped_column(Integer, default=0)
    status: Mapped[QuestionnaireStatus] = mapped_column(
        Enum(
            QuestionnaireStatus,
            name="questionnaire_status",
            values_callable=ENUM_VALUES,
        ),
        default=QuestionnaireStatus.draft,
    )
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    __table_args__ = (CheckConstraint("version >= 1", name="version_positive"),)


class QuestionnaireQuestion(Base):
    __tablename__ = "questionnaire_questions"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    questionnaire_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("questionnaires.id", ondelete="CASCADE"), index=True)
    position: Mapped[int] = mapped_column(Integer)
    text: Mapped[str] = mapped_column(Text)
    options: Mapped[list[str]] = mapped_column(JSONB)

    __table_args__ = (CheckConstraint("position >= 1", name="position_positive"),)


class QuestionnaireResult(Base):
    """A completed questionnaire. Stores the version it was answered against. No score is computed without approved rules."""

    __tablename__ = "questionnaire_results"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    student_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    questionnaire_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("questionnaires.id", ondelete="RESTRICT"))
    questionnaire_version: Mapped[int] = mapped_column(Integer)
    answers: Mapped[list[str]] = mapped_column(JSONB)
    summary: Mapped[str | None] = mapped_column(Text, nullable=True)
    completed_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class Resource(Base):
    __tablename__ = "resources"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    title: Mapped[str] = mapped_column(String(160))
    category: Mapped[ResourceCategory] = mapped_column(
        Enum(ResourceCategory, name="resource_category", values_callable=ENUM_VALUES)
    )
    summary: Mapped[str] = mapped_column(String(300))
    body: Mapped[list[str]] = mapped_column(JSONB, default=list)
    source: Mapped[str] = mapped_column(String(200))
    reading_minutes: Mapped[int] = mapped_column(Integer)
    published: Mapped[bool] = mapped_column(Boolean, default=False, server_default=text("false"))
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    __table_args__ = (
        CheckConstraint("reading_minutes BETWEEN 1 AND 60", name="reading_minutes_range"),
        CheckConstraint("length(source) > 0", name="source_required"),
    )


class Consent(Base):
    """Explicit sharing choice from a student to a psychologist, per category (VR-18, FR-08)."""

    __tablename__ = "consents"

    student_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)
    psychologist_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)
    scope: Mapped[ConsentScope] = mapped_column(
        Enum(ConsentScope, name="consent_scope", values_callable=ENUM_VALUES),
        primary_key=True,
    )
    granted: Mapped[bool] = mapped_column(Boolean, default=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
