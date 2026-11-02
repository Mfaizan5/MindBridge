import uuid
from datetime import datetime
from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field

from app.models.enums import ConsentScope, UserStatus


class ConsentIn(BaseModel):
    model_config = ConfigDict(extra="forbid")

    psychologist_id: uuid.UUID
    scope: ConsentScope
    granted: bool


class ConsentOut(BaseModel):
    psychologist_id: uuid.UUID
    scope: ConsentScope
    granted: bool
    updated_at: datetime


class NotificationOut(BaseModel):
    id: uuid.UUID
    title: str
    body: str
    read: bool
    created_at: datetime


class AccountUpdateIn(BaseModel):
    model_config = ConfigDict(extra="forbid")

    name: str = Field(min_length=1, max_length=100)
    email: str = Field(min_length=3, max_length=254)


class AccountStatusIn(BaseModel):
    model_config = ConfigDict(extra="forbid")

    status: UserStatus


class SettingsIn(BaseModel):
    model_config = ConfigDict(extra="forbid")

    cancellation_window_hours: int = Field(ge=0, le=168)


class SettingsOut(BaseModel):
    cancellation_window_hours: int


class AuditOut(BaseModel):
    id: uuid.UUID
    actor_name: str | None
    action: str
    target_type: str
    target_id: str | None
    details: dict[str, Any]
    created_at: datetime


class VerificationIn(BaseModel):
    model_config = ConfigDict(extra="forbid")

    verified: bool


class PublishIn(BaseModel):
    model_config = ConfigDict(extra="forbid")

    published: bool


class QualificationReviewIn(BaseModel):
    model_config = ConfigDict(extra="forbid")

    status: Literal["Verified", "Rejected"]
