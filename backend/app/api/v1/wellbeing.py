import uuid
from datetime import datetime

from fastapi import APIRouter, Query, Response, status
from sqlalchemy.orm import Session

from app.api.deps import CurrentUserDep, DbDep, StudentDep
from app.core.security import decrypt_text, encrypt_text
from app.models import JournalEntry
from app.schemas.wellbeing import (
    JournalIn,
    JournalOut,
    MoodIn,
    MoodOut,
    QuestionnaireOut,
    QuestionnaireResultIn,
    QuestionnaireResultOut,
    ResourceOut,
)
from app.services import privacy, wellbeing

router = APIRouter(tags=["wellbeing"])


# ---------- moods, stress and sleep (student only) ----------


@router.get("/moods", response_model=list[MoodOut])
def list_moods(
    student: StudentDep,
    db: DbDep,
    start: datetime | None = Query(default=None),
    end: datetime | None = Query(default=None),
) -> list[MoodOut]:
    return [MoodOut.model_validate(r, from_attributes=True) for r in wellbeing.list_moods(db, student.user, start, end)]


@router.post("/moods", status_code=status.HTTP_201_CREATED, response_model=MoodOut)
def create_mood(payload: MoodIn, student: StudentDep, db: DbDep) -> MoodOut:
    return MoodOut.model_validate(wellbeing.create_mood(db, student.user, payload), from_attributes=True)


@router.put("/moods/{record_id}", response_model=MoodOut)
def update_mood(record_id: uuid.UUID, payload: MoodIn, student: StudentDep, db: DbDep) -> MoodOut:
    return MoodOut.model_validate(
        wellbeing.update_mood(db, student.user, record_id, payload),
        from_attributes=True,
    )


@router.delete("/moods/{record_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_mood(record_id: uuid.UUID, student: StudentDep, db: DbDep) -> Response:
    wellbeing.delete_mood(db, student.user, record_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


# ---------- private journal (owner only; no administrator or psychologist route exists) ----------


def _journal_out(entry: JournalEntry) -> JournalOut:
    return JournalOut(
        id=entry.id,
        content=decrypt_text(entry.content_encrypted),
        created_at=entry.created_at,
        updated_at=entry.updated_at,
    )


@router.get("/journal", response_model=list[JournalOut])
def list_journal(student: StudentDep, db: DbDep) -> list[JournalOut]:
    return [_journal_out(e) for e in privacy.journal_for(db, student.user.id)]


@router.post("/journal", status_code=status.HTTP_201_CREATED, response_model=JournalOut)
def create_journal(payload: JournalIn, student: StudentDep, db: DbDep) -> JournalOut:
    entry = JournalEntry(student_id=student.user.id, content_encrypted=encrypt_text(payload.content))
    db.add(entry)
    db.commit()
    db.refresh(entry)
    return _journal_out(entry)


@router.put("/journal/{entry_id}", response_model=JournalOut)
def update_journal(entry_id: uuid.UUID, payload: JournalIn, student: StudentDep, db: DbDep) -> JournalOut:
    entry = privacy.journal_entry_for(db, student.user.id, entry_id)
    entry.content_encrypted = encrypt_text(payload.content)
    db.commit()
    db.refresh(entry)
    return _journal_out(entry)


@router.delete("/journal/{entry_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_journal(entry_id: uuid.UUID, student: StudentDep, db: DbDep) -> Response:
    entry = privacy.journal_entry_for(db, student.user.id, entry_id)
    db.delete(entry)
    db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)


# ---------- questionnaires (approved content only) ----------


def _questionnaire_out(db: Session, questionnaire) -> QuestionnaireOut:  # type: ignore[no-untyped-def]
    questions = wellbeing.questions_for(db, questionnaire.id)
    return QuestionnaireOut(
        id=questionnaire.id,
        name=questionnaire.name,
        version=questionnaire.version,
        purpose=questionnaire.purpose,
        approx_minutes=questionnaire.approx_minutes,
        questions=[q.text for q in questions],
        options=[q.options for q in questions],
    )


@router.get("/questionnaires", response_model=list[QuestionnaireOut])
def list_questionnaires(current: CurrentUserDep, db: DbDep) -> list[QuestionnaireOut]:
    return [_questionnaire_out(db, q) for q in wellbeing.approved_questionnaires(db)]


@router.get("/questionnaires/results/{result_id}", response_model=QuestionnaireResultOut)
def get_result(result_id: uuid.UUID, student: StudentDep, db: DbDep) -> QuestionnaireResultOut:
    result = wellbeing.owned_result(db, student.user, result_id)
    return QuestionnaireResultOut.model_validate(result, from_attributes=True)


@router.get("/questionnaires/{questionnaire_id}", response_model=QuestionnaireOut)
def get_questionnaire(questionnaire_id: uuid.UUID, current: CurrentUserDep, db: DbDep) -> QuestionnaireOut:
    return _questionnaire_out(db, wellbeing.approved_questionnaire(db, questionnaire_id))


@router.post(
    "/questionnaires/{questionnaire_id}/results",
    status_code=status.HTTP_201_CREATED,
    response_model=QuestionnaireResultOut,
)
def submit_result(
    questionnaire_id: uuid.UUID,
    payload: QuestionnaireResultIn,
    student: StudentDep,
    db: DbDep,
) -> QuestionnaireResultOut:
    result = wellbeing.submit_questionnaire(db, student.user, questionnaire_id, payload.answers)
    return QuestionnaireResultOut.model_validate(result, from_attributes=True)


# ---------- resources (published only) ----------


@router.get("/resources", response_model=list[ResourceOut])
def list_resources(current: CurrentUserDep, db: DbDep) -> list[ResourceOut]:
    return [ResourceOut.model_validate(r, from_attributes=True) for r in wellbeing.published_resources(db)]


@router.get("/resources/{resource_id}", response_model=ResourceOut)
def get_resource(resource_id: uuid.UUID, current: CurrentUserDep, db: DbDep) -> ResourceOut:
    return ResourceOut.model_validate(wellbeing.published_resource(db, resource_id), from_attributes=True)
