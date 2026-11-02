import uuid
from datetime import UTC, datetime, timedelta

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.errors import invalid, not_found
from app.core.security import decrypt_text, encrypt_text
from app.models import (
    Appointment,
    Consent,
    JournalEntry,
    MoodRecord,
    Notification,
    PsychologistProfile,
    QuestionnaireResult,
    User,
)
from app.models.enums import ConsentScope, Role
from app.services.platform import now_utc

# ---------- consent (student decides, psychologist can only see what is granted) ----------


def set_consent(
    db: Session,
    student: User,
    psychologist_id: uuid.UUID,
    scope: ConsentScope,
    granted: bool,
) -> Consent:
    profile = db.get(PsychologistProfile, psychologist_id)
    if profile is None or not profile.published:
        raise invalid("You can only share information with a listed psychologist.")
    consent = db.get(Consent, (student.id, psychologist_id, scope))
    if consent is None:
        consent = Consent(
            student_id=student.id,
            psychologist_id=psychologist_id,
            scope=scope,
            granted=granted,
        )
        db.add(consent)
    else:
        consent.granted = granted
    db.commit()
    db.refresh(consent)
    return consent


def has_consent(db: Session, student_id: uuid.UUID, psychologist_id: uuid.UUID, scope: ConsentScope) -> bool:
    consent = db.get(Consent, (student_id, psychologist_id, scope))
    return bool(consent and consent.granted)


def list_consents(db: Session, student_id: uuid.UUID) -> list[Consent]:
    return list(db.scalars(select(Consent).where(Consent.student_id == student_id)))


def psychologist_can_see_student(db: Session, psychologist: User, student_id: uuid.UUID) -> bool:
    """A psychologist sees a student only through an appointment that the student has allowed (least privilege)."""
    booked = db.scalar(
        select(func.count())
        .select_from(Appointment)
        .where(
            Appointment.psychologist_id == psychologist.id,
            Appointment.student_id == student_id,
        )
    )
    return bool(booked) and has_consent(db, student_id, psychologist.id, ConsentScope.appointment_history)


def mood_summary_for_psychologist(db: Session, psychologist: User, student_id: uuid.UUID) -> dict | None:
    """Aggregate only (30 days). Individual entries are never exposed to psychologists."""
    if not has_consent(db, student_id, psychologist.id, ConsentScope.mood_records):
        return None
    since = now_utc() - timedelta(days=30)
    rows = list(db.scalars(select(MoodRecord).where(MoodRecord.student_id == student_id, MoodRecord.recorded_at >= since)))
    if not rows:
        return {"count": 0, "average_stress": None, "average_sleep_hours": None}
    return {
        "count": len(rows),
        "average_stress": round(sum(r.stress for r in rows) / len(rows), 1),
        "average_sleep_hours": round(float(sum(r.sleep_hours for r in rows)) / len(rows), 1),
    }


# ---------- student data export and account deletion ----------


def export_student_data(db: Session, student: User) -> dict:
    moods = list(db.scalars(select(MoodRecord).where(MoodRecord.student_id == student.id).order_by(MoodRecord.recorded_at)))
    journal = list(
        db.scalars(select(JournalEntry).where(JournalEntry.student_id == student.id).order_by(JournalEntry.created_at))
    )
    results = list(db.scalars(select(QuestionnaireResult).where(QuestionnaireResult.student_id == student.id)))
    appointments = list(db.scalars(select(Appointment).where(Appointment.student_id == student.id)))
    consents = list_consents(db, student.id)
    return {
        "exported_at": datetime.now(UTC).isoformat(),
        "profile": {"name": student.name, "email": student.email},
        "mood_records": [
            {
                "mood": m.mood.value,
                "stress": m.stress,
                "sleep_hours": str(m.sleep_hours),
                "note": m.note,
                "recorded_at": m.recorded_at.isoformat(),
            }
            for m in moods
        ],
        "journal_entries": [
            {
                "content": decrypt_text(j.content_encrypted),
                "created_at": j.created_at.isoformat(),
                "updated_at": j.updated_at.isoformat(),
            }
            for j in journal
        ],
        "questionnaire_results": [
            {
                "questionnaire_version": r.questionnaire_version,
                "answers": r.answers,
                "completed_at": r.completed_at.isoformat(),
            }
            for r in results
        ],
        "appointments": [{"status": a.status.value, "created_at": a.created_at.isoformat()} for a in appointments],
        "sharing_choices": [
            {
                "scope": c.scope.value,
                "psychologist_id": str(c.psychologist_id),
                "granted": c.granted,
            }
            for c in consents
        ],
    }


def delete_student_account(db: Session, student: User) -> None:
    """Removes the student and everything owned by them. Foreign keys cascade, and booked times are released."""
    if student.role != Role.student:
        raise invalid("Professional and administrator accounts are managed by an administrator.")
    db.query(Notification).filter(Notification.user_id == student.id).delete()
    db.delete(student)
    db.commit()


# ---------- journal (private) ----------


def journal_for(db: Session, student_id: uuid.UUID) -> list[JournalEntry]:
    return list(
        db.scalars(select(JournalEntry).where(JournalEntry.student_id == student_id).order_by(JournalEntry.updated_at.desc()))
    )


def journal_entry_for(db: Session, student_id: uuid.UUID, entry_id: uuid.UUID) -> JournalEntry:
    entry = db.scalar(select(JournalEntry).where(JournalEntry.id == entry_id, JournalEntry.student_id == student_id))
    if entry is None:
        raise not_found("Entry not found.")
    return entry


def read_journal(entry: JournalEntry) -> str:
    return decrypt_text(entry.content_encrypted)


def store_journal(content: str) -> str:
    return encrypt_text(content)
