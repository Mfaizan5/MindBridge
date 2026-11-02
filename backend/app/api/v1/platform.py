import uuid

from fastapi import APIRouter, Query, Response, status
from sqlalchemy import select

from app.api.deps import AdminDep, CsrfUserDep, CurrentUserDep, DbDep
from app.core.errors import conflict, forbidden, not_found
from app.models import AuditLog, Notification, PsychologistProfile, Qualification, User
from app.models.enums import ConsentScope, QualificationStatus, Role
from app.schemas.auth import UserOut
from app.schemas.platform import (
    AccountStatusIn,
    AuditOut,
    ConsentIn,
    ConsentOut,
    NotificationOut,
    PublishIn,
    QualificationReviewIn,
    SettingsIn,
    SettingsOut,
    VerificationIn,
)
from app.schemas.wellbeing import ResourceIn, ResourceOut
from app.services import privacy, professionals, wellbeing
from app.services.platform import (
    audit,
    cancellation_window_hours,
    list_notifications,
    now_utc,
    set_cancellation_window_hours,
)

consent_router = APIRouter(prefix="/consent", tags=["consent"])
notifications_router = APIRouter(prefix="/notifications", tags=["notifications"])
admin_router = APIRouter(prefix="/admin", tags=["admin"])
platform_router = APIRouter(prefix="/platform", tags=["platform"])


@platform_router.get("/settings", response_model=SettingsOut)
def public_settings(current: CurrentUserDep, db: DbDep) -> SettingsOut:
    """The only platform setting students can read: the cancellation window they are shown when booking."""
    return SettingsOut(cancellation_window_hours=cancellation_window_hours(db))


# ---------- consent (student only) ----------


@consent_router.get("", response_model=list[ConsentOut])
def my_consents(student: CurrentUserDep, db: DbDep) -> list[ConsentOut]:
    if student.role != Role.student:
        raise forbidden()
    return [
        ConsentOut(
            psychologist_id=c.psychologist_id,
            scope=c.scope,
            granted=c.granted,
            updated_at=c.updated_at,
        )
        for c in privacy.list_consents(db, student.id)
    ]


@consent_router.put("", response_model=ConsentOut)
def set_my_consent(payload: ConsentIn, student: CsrfUserDep, db: DbDep) -> ConsentOut:
    if student.role != Role.student:
        raise forbidden()
    c = privacy.set_consent(
        db,
        student.user,
        payload.psychologist_id,
        ConsentScope(payload.scope),
        payload.granted,
    )
    return ConsentOut(
        psychologist_id=c.psychologist_id,
        scope=c.scope,
        granted=c.granted,
        updated_at=c.updated_at,
    )


# ---------- notifications (in-app only, A-13) ----------


@notifications_router.get("", response_model=list[NotificationOut])
def my_notifications(current: CurrentUserDep, db: DbDep) -> list[NotificationOut]:
    return [
        NotificationOut(
            id=n.id,
            title=n.title,
            body=n.body,
            read=n.read_at is not None,
            created_at=n.created_at,
        )
        for n in list_notifications(db, current.id)
    ]


@notifications_router.post("/read-all", status_code=status.HTTP_204_NO_CONTENT)
def read_all(current: CsrfUserDep, db: DbDep) -> Response:
    db.query(Notification).filter(Notification.user_id == current.id, Notification.read_at.is_(None)).update(
        {"read_at": now_utc()}
    )
    db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)


# ---------- administration (every route requires the administrator role) ----------


@admin_router.get("/users", response_model=list[UserOut])
def list_users(admin: AdminDep, db: DbDep, role: Role | None = Query(default=None)) -> list[UserOut]:
    query = select(User).order_by(User.name)
    if role is not None:
        query = query.where(User.role == role)
    return [UserOut.model_validate(u, from_attributes=True) for u in db.scalars(query.limit(500))]


@admin_router.patch("/users/{user_id}/status", response_model=UserOut)
def set_user_status(user_id: uuid.UUID, payload: AccountStatusIn, admin: AdminDep, db: DbDep) -> UserOut:
    if user_id == admin.user.id:
        raise conflict("You cannot change the status of your own account.")
    target = db.get(User, user_id)
    if target is None:
        raise not_found("User not found.")
    if target.role == Role.admin:
        raise forbidden("Administrator accounts cannot be suspended from this screen.")
    target.status = payload.status
    audit(
        db,
        admin.user,
        "user.status_changed",
        "user",
        str(user_id),
        {"status": payload.status.value},
    )
    db.commit()
    db.refresh(target)
    return UserOut.model_validate(target, from_attributes=True)


@admin_router.get("/psychologists")
def list_psychologists(admin: AdminDep, db: DbDep) -> list[dict]:
    rows = db.execute(select(PsychologistProfile, User).join(User, User.id == PsychologistProfile.user_id)).all()
    out = []
    for profile, user in rows:
        out.append(
            {
                "user_id": str(profile.user_id),
                "name": user.name,
                "email": user.email,
                "specialization": profile.specialization,
                "verified": profile.verified,
                "published": profile.published,
                "qualifications": [
                    {
                        "id": str(q.id),
                        "title": q.title,
                        "institution": q.institution,
                        "year": q.year,
                        "status": q.status.value,
                    }
                    for q in professionals.qualifications_for(db, profile.user_id)
                ],
            }
        )
    return out


@admin_router.post("/psychologists/{psychologist_id}/verification", status_code=status.HTTP_200_OK)
def set_verification(psychologist_id: uuid.UUID, payload: VerificationIn, admin: AdminDep, db: DbDep) -> dict:
    profile = professionals.set_verified(db, admin.user, psychologist_id, payload.verified)
    return {
        "user_id": str(profile.user_id),
        "verified": profile.verified,
        "published": profile.published,
    }


@admin_router.post("/psychologists/{psychologist_id}/publication", status_code=status.HTTP_200_OK)
def set_publication(psychologist_id: uuid.UUID, payload: PublishIn, admin: AdminDep, db: DbDep) -> dict:
    profile = professionals.set_published(db, admin.user, psychologist_id, payload.published)
    return {
        "user_id": str(profile.user_id),
        "verified": profile.verified,
        "published": profile.published,
    }


@admin_router.post("/qualifications/{qualification_id}/review")
def review_qualification(
    qualification_id: uuid.UUID,
    payload: QualificationReviewIn,
    admin: AdminDep,
    db: DbDep,
) -> dict:
    q: Qualification = professionals.review_qualification(db, admin.user, qualification_id, QualificationStatus(payload.status))
    return {"id": str(q.id), "status": q.status.value}


@admin_router.get("/settings", response_model=SettingsOut)
def get_settings_route(admin: AdminDep, db: DbDep) -> SettingsOut:
    return SettingsOut(cancellation_window_hours=cancellation_window_hours(db))


@admin_router.put("/settings", response_model=SettingsOut)
def put_settings(payload: SettingsIn, admin: AdminDep, db: DbDep) -> SettingsOut:
    set_cancellation_window_hours(db, payload.cancellation_window_hours)
    audit(
        db,
        admin.user,
        "settings.cancellation_window_changed",
        "settings",
        None,
        {"hours": payload.cancellation_window_hours},
    )
    db.commit()
    return SettingsOut(cancellation_window_hours=payload.cancellation_window_hours)


@admin_router.get("/audit", response_model=list[AuditOut])
def audit_log(admin: AdminDep, db: DbDep, limit: int = Query(default=100, ge=1, le=500)) -> list[AuditOut]:
    rows = db.execute(
        select(AuditLog, User.name)
        .outerjoin(User, User.id == AuditLog.actor_id)
        .order_by(AuditLog.created_at.desc())
        .limit(limit)
    ).all()
    return [
        AuditOut(
            id=log.id,
            actor_name=name,
            action=log.action,
            target_type=log.target_type,
            target_id=log.target_id,
            details=log.details,
            created_at=log.created_at,
        )
        for log, name in rows
    ]


@admin_router.get("/resources", response_model=list[ResourceOut])
def admin_resources(admin: AdminDep, db: DbDep) -> list[ResourceOut]:
    return [ResourceOut.model_validate(r, from_attributes=True) for r in wellbeing.all_resources(db)]


@admin_router.post("/resources", status_code=status.HTTP_201_CREATED, response_model=ResourceOut)
def create_resource(payload: ResourceIn, admin: AdminDep, db: DbDep) -> ResourceOut:
    return ResourceOut.model_validate(wellbeing.save_resource(db, admin.user, None, payload), from_attributes=True)


@admin_router.put("/resources/{resource_id}", response_model=ResourceOut)
def update_resource(resource_id: uuid.UUID, payload: ResourceIn, admin: AdminDep, db: DbDep) -> ResourceOut:
    return ResourceOut.model_validate(
        wellbeing.save_resource(db, admin.user, resource_id, payload),
        from_attributes=True,
    )
