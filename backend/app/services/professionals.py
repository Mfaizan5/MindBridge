import uuid

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.errors import conflict, invalid, not_found
from app.models import PsychologistProfile, Qualification, User
from app.models.enums import QualificationStatus
from app.schemas.professional import PsychologistProfileIn, QualificationIn
from app.services.platform import audit, now_utc


def profile_for(db: Session, psychologist: User) -> PsychologistProfile:
    profile = db.get(PsychologistProfile, psychologist.id)
    if profile is None:
        raise not_found("Profile not found.")
    return profile


def qualifications_for(db: Session, psychologist_id: uuid.UUID) -> list[Qualification]:
    return list(
        db.scalars(
            select(Qualification).where(Qualification.psychologist_id == psychologist_id).order_by(Qualification.year.desc())
        )
    )


def update_profile(db: Session, psychologist: User, payload: PsychologistProfileIn) -> PsychologistProfile:
    profile = profile_for(db, psychologist)
    profile.specialization = payload.specialization.strip()
    profile.bio = payload.bio.strip()
    profile.experience_years = payload.experience_years
    profile.format = payload.format
    if payload.fee_amount is None:
        profile.fee_amount = None
        profile.fee_currency = None
    else:
        if payload.fee_currency is None:
            raise invalid("Choose a currency for the fee.")
        profile.fee_amount = payload.fee_amount
        profile.fee_currency = payload.fee_currency
    db.commit()
    db.refresh(profile)
    return profile


def submit_qualification(db: Session, psychologist: User, payload: QualificationIn) -> Qualification:
    if payload.year > now_utc().year:
        raise invalid("The year cannot be in the future.")
    qualification = Qualification(
        psychologist_id=psychologist.id,
        title=payload.title.strip(),
        institution=payload.institution.strip(),
        year=payload.year,
        status=QualificationStatus.submitted,
    )
    db.add(qualification)
    db.commit()
    db.refresh(qualification)
    return qualification


def review_qualification(db: Session, admin: User, qualification_id: uuid.UUID, status: QualificationStatus) -> Qualification:
    qualification = db.get(Qualification, qualification_id)
    if qualification is None:
        raise not_found("Qualification not found.")
    qualification.status = status
    qualification.reviewed_by = admin.id
    qualification.reviewed_at = now_utc()
    audit(
        db,
        admin,
        f"qualification.{status.value.lower()}",
        "qualification",
        str(qualification.id),
        {"psychologist_id": str(qualification.psychologist_id)},
    )
    db.commit()
    db.refresh(qualification)
    return qualification


def set_verified(db: Session, admin: User, psychologist_id: uuid.UUID, verified: bool) -> PsychologistProfile:
    profile = db.get(PsychologistProfile, psychologist_id)
    if profile is None:
        raise not_found("Psychologist not found.")
    profile.verified = verified
    profile.verified_at = now_utc() if verified else None
    if not verified:
        # A profile cannot stay published once its verification is removed (VR-11).
        profile.published = False
    audit(
        db,
        admin,
        "psychologist.verified" if verified else "psychologist.unverified",
        "psychologist",
        str(psychologist_id),
    )
    db.commit()
    db.refresh(profile)
    return profile


def set_published(db: Session, admin: User, psychologist_id: uuid.UUID, published: bool) -> PsychologistProfile:
    profile = db.get(PsychologistProfile, psychologist_id)
    if profile is None:
        raise not_found("Psychologist not found.")
    if published and not profile.verified:
        raise conflict("Verify credentials before publishing a profile.")
    profile.published = published
    audit(
        db,
        admin,
        "psychologist.published" if published else "psychologist.hidden",
        "psychologist",
        str(psychologist_id),
    )
    db.commit()
    db.refresh(profile)
    return profile


def directory(
    db: Session,
) -> list[tuple[PsychologistProfile, User, list[Qualification]]]:
    """Only published profiles are listed (VR-11). Verified credentials are marked separately (VR-10)."""
    rows = db.execute(
        select(PsychologistProfile, User)
        .join(User, User.id == PsychologistProfile.user_id)
        .where(PsychologistProfile.published.is_(True))
    ).all()
    result = []
    for profile, user in rows:
        result.append((profile, user, qualifications_for(db, profile.user_id)))
    return result


def public_profile(db: Session, psychologist_id: uuid.UUID) -> tuple[PsychologistProfile, User, list[Qualification]]:
    row = db.execute(
        select(PsychologistProfile, User)
        .join(User, User.id == PsychologistProfile.user_id)
        .where(
            PsychologistProfile.user_id == psychologist_id,
            PsychologistProfile.published.is_(True),
        )
    ).one_or_none()
    if row is None:
        raise not_found("Profile not available.")
    profile, user = row
    return profile, user, qualifications_for(db, profile.user_id)
