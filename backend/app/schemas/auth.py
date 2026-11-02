import uuid
from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator

from app.models.enums import Role, UserStatus

PASSWORD_MIN = 8
PASSWORD_MAX = 128


class SignUpIn(BaseModel):
    model_config = ConfigDict(extra="forbid")

    name: str = Field(min_length=1, max_length=100)
    email: EmailStr
    password: str = Field(min_length=PASSWORD_MIN, max_length=PASSWORD_MAX)
    # Administrators are never self-created (VR-12). The schema only accepts the two self-service roles.
    role: Literal["student", "psychologist"]
    terms: bool

    @field_validator("name")
    @classmethod
    def strip_name(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("Enter your name.")
        return value

    @field_validator("terms")
    @classmethod
    def terms_accepted(cls, value: bool) -> bool:
        if value is not True:
            raise ValueError("Please accept the terms and privacy notice to continue.")
        return value


class LoginIn(BaseModel):
    model_config = ConfigDict(extra="forbid")

    email: EmailStr
    password: str = Field(min_length=1, max_length=PASSWORD_MAX)
    role: Role | None = None


class ResetRequestIn(BaseModel):
    model_config = ConfigDict(extra="forbid")

    email: EmailStr


class ResetConfirmIn(BaseModel):
    model_config = ConfigDict(extra="forbid")

    token: str = Field(min_length=20, max_length=200)
    password: str = Field(min_length=PASSWORD_MIN, max_length=PASSWORD_MAX)


class UserOut(BaseModel):
    id: uuid.UUID
    name: str
    email: str
    role: Role
    status: UserStatus
    created_at: datetime


class SessionOut(BaseModel):
    user: UserOut
    csrf_token: str
