import uuid
from datetime import datetime
from decimal import Decimal
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

from app.models.enums import AppointmentStatus, ConsultationFormat, QualificationStatus


class QualificationIn(BaseModel):
    model_config = ConfigDict(extra="forbid")

    title: str = Field(min_length=1, max_length=200)
    institution: str = Field(min_length=1, max_length=200)
    year: int = Field(ge=1950, le=2100)


class QualificationOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    title: str
    institution: str
    year: int
    status: QualificationStatus


class PsychologistProfileIn(BaseModel):
    model_config = ConfigDict(extra="forbid")

    specialization: str = Field(min_length=1, max_length=200)
    bio: str = Field(default="", max_length=1000)
    experience_years: int = Field(ge=0, le=70)
    fee_amount: Decimal | None = Field(default=None, ge=0, le=10000)
    fee_currency: Literal["USD", "EUR", "GBP"] | None = None
    format: ConsultationFormat | None = None


class PsychologistProfileOut(BaseModel):
    user_id: uuid.UUID
    name: str
    specialization: str
    bio: str
    experience_years: int
    fee_amount: Decimal | None
    fee_currency: str | None
    format: ConsultationFormat | None
    verified: bool
    published: bool
    qualifications: list[QualificationOut]


class DirectoryItem(BaseModel):
    user_id: uuid.UUID
    name: str
    specialization: str
    experience_years: int
    verified: bool
    fee_amount: Decimal | None
    fee_currency: str | None
    format: ConsultationFormat | None
    verified_qualifications: list[str]


class SlotIn(BaseModel):
    model_config = ConfigDict(extra="forbid")

    starts_at: datetime
    ends_at: datetime


class SlotOut(BaseModel):
    id: uuid.UUID
    psychologist_id: uuid.UUID
    starts_at: datetime
    ends_at: datetime
    booked: bool


class AppointmentIn(BaseModel):
    model_config = ConfigDict(extra="forbid")

    slot_id: uuid.UUID


class AppointmentStatusIn(BaseModel):
    model_config = ConfigDict(extra="forbid")

    status: AppointmentStatus


class AppointmentOut(BaseModel):
    id: uuid.UUID
    slot_id: uuid.UUID
    psychologist_id: uuid.UUID
    psychologist_name: str
    student_id: uuid.UUID
    status: AppointmentStatus
    starts_at: datetime
    ends_at: datetime
    created_at: datetime
    updated_at: datetime
