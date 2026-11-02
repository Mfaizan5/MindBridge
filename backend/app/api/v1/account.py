from fastapi import APIRouter, Response, status

from app.api.deps import CsrfUserDep, CurrentUserDep, DbDep
from app.core.errors import conflict, invalid
from app.schemas.auth import UserOut
from app.schemas.platform import AccountUpdateIn
from app.services import privacy
from app.services.accounts import find_user_by_email

router = APIRouter(prefix="/users/me", tags=["account"])


@router.get("", response_model=UserOut)
def get_me(current: CurrentUserDep) -> UserOut:
    return UserOut.model_validate(current.user, from_attributes=True)


@router.patch("", response_model=UserOut)
def update_me(payload: AccountUpdateIn, current: CsrfUserDep, db: DbDep) -> UserOut:
    email = payload.email.strip().lower()
    if "@" not in email or "." not in email.split("@")[-1]:
        raise invalid("Enter a valid email address.")
    other = find_user_by_email(db, email)
    if other is not None and other.id != current.id:
        raise conflict("That email is already in use.")
    current.user.name = payload.name.strip()
    current.user.email = email
    db.commit()
    db.refresh(current.user)
    return UserOut.model_validate(current.user, from_attributes=True)


@router.get("/export")
def export_me(current: CurrentUserDep, db: DbDep) -> dict:
    """Your own data, as JSON. Includes your journal, which only you can read."""
    if current.user.role.value != "student":
        raise invalid("Data export is available for student accounts.")
    return privacy.export_student_data(db, current.user)


@router.delete("", status_code=status.HTTP_204_NO_CONTENT)
def delete_me(current: CsrfUserDep, db: DbDep) -> Response:
    """Deletes a student account and its data. Booked times are released automatically."""
    privacy.delete_student_account(db, current.user)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
