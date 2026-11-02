import uuid

from fastapi import APIRouter, Response, status

from app.api.deps import CurrentUserDep, DbDep, PsychologistDep
from app.models import PsychologistProfile, Qualification, User
from app.models.enums import QualificationStatus
from app.schemas.professional import (
    DirectoryItem,
    PsychologistProfileIn,
    PsychologistProfileOut,
    QualificationIn,
    QualificationOut,
    SlotIn,
    SlotOut,
)
from app.services import professionals, scheduling

router = APIRouter(prefix="/psychologists", tags=["psychologists"])


def _profile_out(profile: PsychologistProfile, user: User, qualifications: list[Qualification]) -> PsychologistProfileOut:
    return PsychologistProfileOut(
        user_id=profile.user_id,
        name=user.name,
        specialization=profile.specialization,
        bio=profile.bio,
        experience_years=profile.experience_years,
        fee_amount=profile.fee_amount,
        fee_currency=profile.fee_currency,
        format=profile.format,
        verified=profile.verified,
        published=profile.published,
        qualifications=[QualificationOut.model_validate(q, from_attributes=True) for q in qualifications],
    )


def _directory_item(profile: PsychologistProfile, user: User, qualifications: list[Qualification]) -> DirectoryItem:
    return DirectoryItem(
        user_id=profile.user_id,
        name=user.name,
        specialization=profile.specialization,
        experience_years=profile.experience_years,
        verified=profile.verified,
        fee_amount=profile.fee_amount if profile.verified else None,
        fee_currency=profile.fee_currency if profile.verified else None,
        format=profile.format if profile.verified else None,
        verified_qualifications=[q.title for q in qualifications if q.status == QualificationStatus.verified],
    )


# ---------- the signed-in psychologist's own workspace ----------


@router.get("/me/profile", response_model=PsychologistProfileOut)
def my_profile(psychologist: PsychologistDep, db: DbDep) -> PsychologistProfileOut:
    profile = professionals.profile_for(db, psychologist.user)
    return _profile_out(
        profile,
        psychologist.user,
        professionals.qualifications_for(db, profile.user_id),
    )


@router.put("/me/profile", response_model=PsychologistProfileOut)
def update_my_profile(payload: PsychologistProfileIn, psychologist: PsychologistDep, db: DbDep) -> PsychologistProfileOut:
    profile = professionals.update_profile(db, psychologist.user, payload)
    return _profile_out(
        profile,
        psychologist.user,
        professionals.qualifications_for(db, profile.user_id),
    )


@router.post(
    "/me/qualifications",
    status_code=status.HTTP_201_CREATED,
    response_model=QualificationOut,
)
def submit_qualification(payload: QualificationIn, psychologist: PsychologistDep, db: DbDep) -> QualificationOut:
    return QualificationOut.model_validate(
        professionals.submit_qualification(db, psychologist.user, payload),
        from_attributes=True,
    )


@router.get("/me/slots", response_model=list[SlotOut])
def my_slots(psychologist: PsychologistDep, db: DbDep) -> list[SlotOut]:
    return [
        SlotOut(
            id=s.id,
            psychologist_id=s.psychologist_id,
            starts_at=s.starts_at,
            ends_at=s.ends_at,
            booked=booked,
        )
        for s, booked in scheduling.my_slots(db, psychologist.user.id)
    ]


@router.post("/me/slots", status_code=status.HTTP_201_CREATED, response_model=SlotOut)
def add_slot(payload: SlotIn, psychologist: PsychologistDep, db: DbDep) -> SlotOut:
    slot = scheduling.add_slot(db, psychologist.user, payload.starts_at, payload.ends_at)
    return SlotOut(
        id=slot.id,
        psychologist_id=slot.psychologist_id,
        starts_at=slot.starts_at,
        ends_at=slot.ends_at,
        booked=False,
    )


@router.delete("/me/slots/{slot_id}", status_code=status.HTTP_204_NO_CONTENT)
def remove_slot(slot_id: uuid.UUID, psychologist: PsychologistDep, db: DbDep) -> Response:
    scheduling.remove_slot(db, psychologist.user, slot_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


# ---------- public directory (students and anyone logged in) ----------


@router.get("", response_model=list[DirectoryItem])
def directory(current: CurrentUserDep, db: DbDep) -> list[DirectoryItem]:
    return [_directory_item(p, u, q) for p, u, q in professionals.directory(db)]


@router.get("/{psychologist_id}", response_model=PsychologistProfileOut)
def public_profile(psychologist_id: uuid.UUID, current: CurrentUserDep, db: DbDep) -> PsychologistProfileOut:
    profile, user, qualifications = professionals.public_profile(db, psychologist_id)
    return _profile_out(profile, user, qualifications)


@router.get("/{psychologist_id}/slots", response_model=list[SlotOut])
def open_slots(psychologist_id: uuid.UUID, current: CurrentUserDep, db: DbDep) -> list[SlotOut]:
    professionals.public_profile(db, psychologist_id)  # 404 unless the profile is published
    return [
        SlotOut(
            id=s.id,
            psychologist_id=s.psychologist_id,
            starts_at=s.starts_at,
            ends_at=s.ends_at,
            booked=False,
        )
        for s in scheduling.open_slots(db, psychologist_id)
    ]
