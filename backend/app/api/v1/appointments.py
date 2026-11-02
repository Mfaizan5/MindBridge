import uuid

from fastapi import APIRouter, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import CsrfUserDep, DbDep, PsychologistDep, StudentDep
from app.core.errors import not_found
from app.models import Appointment, Slot, User
from app.models.enums import ConsentScope
from app.schemas.professional import AppointmentIn, AppointmentOut, AppointmentStatusIn
from app.services import privacy, scheduling

router = APIRouter(prefix="/appointments", tags=["appointments"])


def _out(db: Session, appointment: Appointment) -> AppointmentOut:
    slot = db.get(Slot, appointment.slot_id)
    psychologist = db.get(User, appointment.psychologist_id)
    if slot is None or psychologist is None:
        raise not_found("Appointment not found.")
    return AppointmentOut(
        id=appointment.id,
        slot_id=appointment.slot_id,
        psychologist_id=appointment.psychologist_id,
        psychologist_name=psychologist.name,
        student_id=appointment.student_id,
        status=appointment.status,
        starts_at=slot.starts_at,
        ends_at=slot.ends_at,
        created_at=appointment.created_at,
        updated_at=appointment.updated_at,
    )


@router.post("", status_code=status.HTTP_201_CREATED, response_model=AppointmentOut)
def book(payload: AppointmentIn, student: StudentDep, db: DbDep) -> AppointmentOut:
    appointment = scheduling.book(db, student.user, payload.slot_id)
    return _out(db, appointment)


@router.get("/me", response_model=list[AppointmentOut])
def my_appointments(student: StudentDep, db: DbDep) -> list[AppointmentOut]:
    rows = db.scalars(
        select(Appointment).where(Appointment.student_id == student.user.id).order_by(Appointment.created_at.desc())
    )
    return [_out(db, a) for a in rows]


@router.post("/{appointment_id}/cancel", response_model=AppointmentOut)
def cancel(appointment_id: uuid.UUID, current: CsrfUserDep, db: DbDep) -> AppointmentOut:
    appointment = scheduling.cancel_appointment(db, current.user, appointment_id)
    return _out(db, appointment)


@router.get("/psychologist/list", response_model=list[AppointmentOut])
def psychologist_appointments(psychologist: PsychologistDep, db: DbDep) -> list[AppointmentOut]:
    rows = db.scalars(
        select(Appointment).where(Appointment.psychologist_id == psychologist.user.id).order_by(Appointment.created_at.desc())
    )
    return [_out(db, a) for a in rows]


@router.get("/psychologist/{appointment_id}")
def psychologist_detail(appointment_id: uuid.UUID, psychologist: PsychologistDep, db: DbDep) -> dict:
    """Student identity and mood summary are included only with the student's consent (least privilege)."""
    appointment = db.scalar(
        select(Appointment).where(
            Appointment.id == appointment_id,
            Appointment.psychologist_id == psychologist.user.id,
        )
    )
    if appointment is None:
        raise not_found("Appointment not found.")
    student = db.get(User, appointment.student_id)
    shares_identity = privacy.has_consent(
        db,
        appointment.student_id,
        psychologist.user.id,
        ConsentScope.appointment_history,
    )
    return {
        "appointment": _out(db, appointment).model_dump(mode="json"),
        "student": {"name": student.name, "email": student.email} if (student and shares_identity) else None,
        "mood_summary": privacy.mood_summary_for_psychologist(db, psychologist.user, appointment.student_id),
    }


@router.patch("/psychologist/{appointment_id}/status", response_model=AppointmentOut)
def change_status(
    appointment_id: uuid.UUID,
    payload: AppointmentStatusIn,
    psychologist: PsychologistDep,
    db: DbDep,
) -> AppointmentOut:
    appointment = scheduling.set_status(db, psychologist.user, appointment_id, payload.status)
    return _out(db, appointment)
