import uuid
from datetime import datetime
from decimal import Decimal

from sqlalchemy import (
    CheckConstraint,
    DateTime,
    Enum,
    ForeignKey,
    Index,
    Integer,
    Numeric,
    String,
    func,
    text,
)
from sqlalchemy.dialects.postgresql import UUID, ExcludeConstraint
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base
from app.models.enums import (
    ENUM_VALUES,
    AppointmentStatus,
    ConsultationFormat,
    QualificationStatus,
)


class PsychologistProfile(Base):
    """Professional details for a psychologist account. Verification and publishing are separate decisions (VR-10, VR-11)."""

    __tablename__ = "psychologist_profiles"

    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)
    specialization: Mapped[str] = mapped_column(String(200), default="")
    bio: Mapped[str] = mapped_column(String(1000), default="")
    experience_years: Mapped[int] = mapped_column(Integer, default=0)
    fee_amount: Mapped[Decimal | None] = mapped_column(Numeric(10, 2), nullable=True)
    fee_currency: Mapped[str | None] = mapped_column(String(3), nullable=True)
    format: Mapped[ConsultationFormat | None] = mapped_column(
        Enum(ConsultationFormat, name="consultation_format", values_callable=ENUM_VALUES),
        nullable=True,
    )
    verified: Mapped[bool] = mapped_column(default=False, server_default=text("false"))
    verified_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    published: Mapped[bool] = mapped_column(default=False, server_default=text("false"))

    __table_args__ = (
        # A profile can only be published once it is verified (VR-11).
        CheckConstraint("NOT published OR verified", name="published_requires_verified"),
        CheckConstraint("experience_years BETWEEN 0 AND 70", name="experience_range"),
        CheckConstraint("fee_amount IS NULL OR fee_amount >= 0", name="fee_non_negative"),
        CheckConstraint(
            "(fee_amount IS NULL) = (fee_currency IS NULL)",
            name="fee_and_currency_together",
        ),
    )


class Qualification(Base):
    __tablename__ = "qualifications"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    psychologist_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("psychologist_profiles.user_id", ondelete="CASCADE"), index=True
    )
    title: Mapped[str] = mapped_column(String(200))
    institution: Mapped[str] = mapped_column(String(200))
    year: Mapped[int] = mapped_column(Integer)
    status: Mapped[QualificationStatus] = mapped_column(
        Enum(
            QualificationStatus,
            name="qualification_status",
            values_callable=ENUM_VALUES,
        ),
        default=QualificationStatus.submitted,
    )
    reviewed_by: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    reviewed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    __table_args__ = (CheckConstraint("year BETWEEN 1950 AND 2100", name="year_range"),)


class Slot(Base):
    """A bookable time owned by a psychologist. Stored as timezone-aware timestamps (UTC in the database)."""

    __tablename__ = "slots"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    psychologist_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("psychologist_profiles.user_id", ondelete="CASCADE"), index=True
    )
    starts_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    ends_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    __table_args__ = (
        CheckConstraint("ends_at > starts_at", name="ends_after_start"),
        CheckConstraint(
            "ends_at - starts_at BETWEEN interval '15 minutes' AND interval '4 hours'",
            name="duration_range",
        ),
        # Overlapping slots for the same psychologist are rejected by the database itself (requires btree_gist).
        ExcludeConstraint(
            ("psychologist_id", "="),
            (text("tstzrange(starts_at, ends_at, '[)')"), "&&"),
            using="gist",
            name="slots_no_overlap",
        ),
    )


class Appointment(Base):
    __tablename__ = "appointments"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    slot_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("slots.id", ondelete="RESTRICT"))
    psychologist_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id", ondelete="RESTRICT"), index=True)
    student_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    status: Mapped[AppointmentStatus] = mapped_column(
        Enum(AppointmentStatus, name="appointment_status", values_callable=ENUM_VALUES),
        default=AppointmentStatus.pending,
    )
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    __table_args__ = (
        # A slot can have at most one live booking (double-booking protection, VR-08).
        Index(
            "uq_appointments_active_slot",
            "slot_id",
            unique=True,
            postgresql_where=text("status IN ('Pending', 'Confirmed')"),
        ),
    )


class AppointmentEvent(Base):
    """Audit trail of appointment status changes (who changed what, and when)."""

    __tablename__ = "appointment_events"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    appointment_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("appointments.id", ondelete="CASCADE"), index=True)
    from_status: Mapped[str | None] = mapped_column(String(20), nullable=True)
    to_status: Mapped[str] = mapped_column(String(20))
    actor_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
