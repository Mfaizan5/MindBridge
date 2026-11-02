import uuid
from datetime import datetime

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.errors import invalid, not_found
from app.models import (
    MoodRecord,
    Questionnaire,
    QuestionnaireQuestion,
    QuestionnaireResult,
    Resource,
    User,
)
from app.models.enums import QuestionnaireStatus
from app.schemas.wellbeing import MoodIn, ResourceIn
from app.services.platform import audit, now_utc

FUTURE_TOLERANCE_SECONDS = 60


# ---------- mood, stress and sleep ----------


def _check_not_future(recorded_at: datetime) -> None:
    if (recorded_at - now_utc()).total_seconds() > FUTURE_TOLERANCE_SECONDS:
        raise invalid("A check-in cannot be recorded for a time in the future.")


def list_moods(db: Session, student: User, start: datetime | None, end: datetime | None) -> list[MoodRecord]:
    query = select(MoodRecord).where(MoodRecord.student_id == student.id)
    if start is not None:
        query = query.where(MoodRecord.recorded_at >= start)
    if end is not None:
        query = query.where(MoodRecord.recorded_at <= end)
    return list(db.scalars(query.order_by(MoodRecord.recorded_at.desc()).limit(1000)))


def create_mood(db: Session, student: User, payload: MoodIn) -> MoodRecord:
    _check_not_future(payload.recorded_at)
    record = MoodRecord(
        student_id=student.id,
        mood=payload.mood,
        stress=payload.stress,
        sleep_hours=payload.sleep_hours,
        note=payload.note.strip(),
        recorded_at=payload.recorded_at,
    )
    db.add(record)
    db.commit()
    db.refresh(record)
    return record


def _owned_mood(db: Session, student: User, record_id: uuid.UUID) -> MoodRecord:
    record = db.scalar(select(MoodRecord).where(MoodRecord.id == record_id, MoodRecord.student_id == student.id))
    if record is None:
        raise not_found("Record not found.")
    return record


def update_mood(db: Session, student: User, record_id: uuid.UUID, payload: MoodIn) -> MoodRecord:
    record = _owned_mood(db, student, record_id)
    _check_not_future(payload.recorded_at)
    record.mood = payload.mood
    record.stress = payload.stress
    record.sleep_hours = payload.sleep_hours
    record.note = payload.note.strip()
    record.recorded_at = payload.recorded_at
    db.commit()
    db.refresh(record)
    return record


def delete_mood(db: Session, student: User, record_id: uuid.UUID) -> None:
    record = _owned_mood(db, student, record_id)
    db.delete(record)
    db.commit()


# ---------- resources ----------


def published_resources(db: Session) -> list[Resource]:
    return list(db.scalars(select(Resource).where(Resource.published.is_(True)).order_by(Resource.title)))


def published_resource(db: Session, resource_id: uuid.UUID) -> Resource:
    resource = db.scalar(select(Resource).where(Resource.id == resource_id, Resource.published.is_(True)))
    if resource is None:
        raise not_found("Resource not found.")
    return resource


def all_resources(db: Session) -> list[Resource]:
    return list(db.scalars(select(Resource).order_by(Resource.title)))


def save_resource(db: Session, admin: User, resource_id: uuid.UUID | None, payload: ResourceIn) -> Resource:
    if resource_id is None:
        resource = Resource(**payload.model_dump())
        db.add(resource)
        action = "resource.created"
    else:
        resource = db.get(Resource, resource_id)
        if resource is None:
            raise not_found("Resource not found.")
        for field, value in payload.model_dump().items():
            setattr(resource, field, value)
        action = "resource.updated"
    db.flush()
    audit(
        db,
        admin,
        action,
        "resource",
        str(resource.id),
        {"published": resource.published},
    )
    db.commit()
    db.refresh(resource)
    return resource


# ---------- questionnaires (only reviewed content is shown) ----------


def approved_questionnaires(db: Session) -> list[Questionnaire]:
    return list(db.scalars(select(Questionnaire).where(Questionnaire.status == QuestionnaireStatus.approved)))


def approved_questionnaire(db: Session, questionnaire_id: uuid.UUID) -> Questionnaire:
    questionnaire = db.scalar(
        select(Questionnaire).where(
            Questionnaire.id == questionnaire_id,
            Questionnaire.status == QuestionnaireStatus.approved,
        )
    )
    if questionnaire is None:
        raise not_found("Questionnaire not found.")
    return questionnaire


def questions_for(db: Session, questionnaire_id: uuid.UUID) -> list[QuestionnaireQuestion]:
    return list(
        db.scalars(
            select(QuestionnaireQuestion)
            .where(QuestionnaireQuestion.questionnaire_id == questionnaire_id)
            .order_by(QuestionnaireQuestion.position)
        )
    )


def submit_questionnaire(db: Session, student: User, questionnaire_id: uuid.UUID, answers: list[str]) -> QuestionnaireResult:
    questionnaire = approved_questionnaire(db, questionnaire_id)
    questions = questions_for(db, questionnaire.id)
    if not questions:
        raise invalid("This questionnaire is not available yet.")
    if len(answers) != len(questions):
        raise invalid("Answer every question before submitting.")
    for question, answer in zip(questions, answers, strict=True):
        if answer not in question.options:
            raise invalid("One or more answers are not valid options.")
    # No score is calculated: scoring needs approved rules (A-05). The summary stays empty.
    result = QuestionnaireResult(
        student_id=student.id,
        questionnaire_id=questionnaire.id,
        questionnaire_version=questionnaire.version,
        answers=answers,
        summary=None,
    )
    db.add(result)
    db.commit()
    db.refresh(result)
    return result


def owned_result(db: Session, student: User, result_id: uuid.UUID) -> QuestionnaireResult:
    result = db.scalar(
        select(QuestionnaireResult).where(
            QuestionnaireResult.id == result_id,
            QuestionnaireResult.student_id == student.id,
        )
    )
    if result is None:
        raise not_found("Result not found.")
    return result
