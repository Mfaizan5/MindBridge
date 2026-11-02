import uuid
from datetime import datetime, timedelta

from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.errors import conflict, invalid, not_found
from app.models import Appointment, PsychologistProfile, Slot, User
from app.models.enums import AppointmentStatus, Role
from app.services.platform import audit, cancellation_window_hours, notify, now_utc

ACTIVE = (AppointmentStatus.pending, AppointmentStatus.confirmed)
MIN_SLOT = timedelta(minutes=15)
MAX_SLOT = timedelta(hours=4)
EXCLUSION_VIOLATION = "23P01"
UNIQUE_VIOLATION = "23505"

# Allowed status changes. Cancelling is handled by cancel_appointment so the same rules apply.
TRANSITIONS: dict[AppointmentStatus, set[AppointmentStatus]] = {
    AppointmentStatus.pending: {
        AppointmentStatus.confirmed,
        AppointmentStatus.cancelled,
    },
    AppointmentStatus.confirmed: {
        AppointmentStatus.completed,
        AppointmentStatus.cancelled,
    },
    AppointmentStatus.completed: set(),
    AppointmentStatus.cancelled: set(),
}


def _sqlstate(exc: IntegrityError) -> str | None:
    # psycopg 3 exposes the PostgreSQL error code as sqlstate (psycopg 2 used pgcode).
    return getattr(exc.orig, "sqlstate", None) or getattr(exc.orig, "pgcode", None)


def _aware(value: datetime) -> datetime:
    if value.tzinfo is None:
        raise invalid("Send times with a timezone offset.")
    return value


def _live_booking(db: Session, slot_id: uuid.UUID) -> Appointment | None:
    return db.scalar(select(Appointment).where(Appointment.slot_id == slot_id, Appointment.status.in_(ACTIVE)))


def is_booked(db: Session, slot_id: uuid.UUID) -> bool:
    return _live_booking(db, slot_id) is not None


# ---------- availability (psychologist) ----------


def add_slot(db: Session, psychologist: User, starts_at: datetime, ends_at: datetime) -> Slot:
    starts_at, ends_at = _aware(starts_at), _aware(ends_at)
    if starts_at <= now_utc():
        raise invalid("A time must be in the future.")
    duration = ends_at - starts_at
    if duration < MIN_SLOT or duration > MAX_SLOT:
        raise invalid("A slot must be between 15 minutes and 4 hours long.")
    slot = Slot(psychologist_id=psychologist.id, starts_at=starts_at, ends_at=ends_at)
    db.add(slot)
    try:
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        if _sqlstate(exc) == EXCLUSION_VIOLATION:
            raise conflict("This time overlaps one of your existing times.") from exc
        raise conflict("This time could not be saved. Please try a different time.") from exc
    db.refresh(slot)
    return slot


def remove_slot(db: Session, psychologist: User, slot_id: uuid.UUID) -> None:
    slot = db.scalar(select(Slot).where(Slot.id == slot_id, Slot.psychologist_id == psychologist.id))
    if slot is None:
        raise not_found("Time not found.")
    if is_booked(db, slot.id):
        raise conflict("Booked times cannot be removed. Cancel the appointment first.")
    db.delete(slot)
    db.commit()


def my_slots(db: Session, psychologist_id: uuid.UUID) -> list[tuple[Slot, bool]]:
    slots = list(
        db.scalars(select(Slot).where(Slot.psychologist_id == psychologist_id, Slot.ends_at > now_utc()).order_by(Slot.starts_at))
    )
    return [(slot, is_booked(db, slot.id)) for slot in slots]


def open_slots(db: Session, psychologist_id: uuid.UUID) -> list[Slot]:
    slots = list(
        db.scalars(
            select(Slot).where(Slot.psychologist_id == psychologist_id, Slot.starts_at > now_utc()).order_by(Slot.starts_at)
        )
    )
    return [slot for slot in slots if not is_booked(db, slot.id)]


# ---------- booking (student) ----------


def book(db: Session, student: User, slot_id: uuid.UUID) -> Appointment:
    """Books a slot inside one transaction. The slot row is locked, and the partial unique index is the last guard."""
    slot = db.scalar(select(Slot).where(Slot.id == slot_id).with_for_update())
    if slot is None:
        raise not_found("Time not found.")
    profile = db.get(PsychologistProfile, slot.psychologist_id)
    if profile is None or not (profile.published and profile.verified):
        raise conflict("This psychologist is not accepting bookings.")
    if slot.starts_at <= now_utc():
        raise conflict("That time has already passed.")
    if _live_booking(db, slot.id) is not None:
        raise conflict("That time has just been taken. Please choose another time.")
    appointment = Appointment(
        slot_id=slot.id,
        psychologist_id=slot.psychologist_id,
        student_id=student.id,
        status=AppointmentStatus.pending,
    )
    db.add(appointment)
    try:
        db.flush()
    except IntegrityError as exc:
        db.rollback()
        if _sqlstate(exc) == UNIQUE_VIOLATION:
            raise conflict("That time has just been taken. Please choose another time.") from exc
        raise
    _record_event(db, appointment, None, AppointmentStatus.pending, student.id)
    notify(
        db,
        student.id,
        "Appointment requested",
        "Your request is waiting for the psychologist to confirm it.",
    )
    notify(
        db,
        slot.psychologist_id,
        "New appointment request",
        "A student has requested a time. Please confirm or cancel it.",
    )
    db.commit()
    db.refresh(appointment)
    return appointment


def _record_event(
    db: Session,
    appointment: Appointment,
    previous: AppointmentStatus | None,
    current: AppointmentStatus,
    actor_id: uuid.UUID,
) -> None:
    from app.models import AppointmentEvent

    db.add(
        AppointmentEvent(
            appointment_id=appointment.id,
            from_status=previous.value if previous else None,
            to_status=current.value,
            actor_id=actor_id,
        )
    )


def _slot_for(db: Session, appointment: Appointment) -> Slot:
    slot = db.get(Slot, appointment.slot_id)
    if slot is None:
        raise not_found("Time not found.")
    return slot


def cancel_appointment(db: Session, actor: User, appointment_id: uuid.UUID) -> Appointment:
    appointment = db.get(Appointment, appointment_id)
    if appointment is None:
        raise not_found("Appointment not found.")
    is_student = actor.role == Role.student and appointment.student_id == actor.id
    is_psychologist = actor.role == Role.psychologist and appointment.psychologist_id == actor.id
    if not (is_student or is_psychologist):
        raise not_found("Appointment not found.")
    if appointment.status not in ACTIVE:
        raise conflict(f"This appointment is already {appointment.status.value.lower()}.")
    slot = _slot_for(db, appointment)
    now = now_utc()
    if slot.starts_at <= now:
        raise conflict("Past appointments cannot be cancelled.")
    if is_student:
        window = timedelta(hours=cancellation_window_hours(db))
        if slot.starts_at - now < window:
            raise conflict(
                f"Cancellation is only possible up to {int(window.total_seconds() // 3600)} hours before the appointment."
            )
    previous = appointment.status
    appointment.status = AppointmentStatus.cancelled
    _record_event(db, appointment, previous, AppointmentStatus.cancelled, actor.id)
    other = appointment.psychologist_id if is_student else appointment.student_id
    notify(db, other, "Appointment cancelled", "An appointment has been cancelled.")
    db.commit()
    db.refresh(appointment)
    return appointment


def set_status(
    db: Session,
    psychologist: User,
    appointment_id: uuid.UUID,
    target: AppointmentStatus,
) -> Appointment:
    appointment = db.scalar(
        select(Appointment).where(
            Appointment.id == appointment_id,
            Appointment.psychologist_id == psychologist.id,
        )
    )
    if appointment is None:
        raise not_found("Appointment not found.")
    if target == AppointmentStatus.cancelled:
        return cancel_appointment(db, psychologist, appointment_id)
    if target not in TRANSITIONS[appointment.status]:
        raise conflict(f"Cannot change an appointment from {appointment.status.value} to {target.value}.")
    slot = _slot_for(db, appointment)
    if target == AppointmentStatus.completed and slot.starts_at > now_utc():
        raise conflict("An appointment can only be completed after it has started.")
    previous = appointment.status
    appointment.status = target
    _record_event(db, appointment, previous, target, psychologist.id)
    notify(
        db,
        appointment.student_id,
        f"Appointment {target.value.lower()}",
        "Your appointment status has changed.",
    )
    audit(
        db,
        psychologist,
        "appointment.status_changed",
        "appointment",
        str(appointment.id),
        {"to": target.value},
    )
    db.commit()
    db.refresh(appointment)
    return appointment
