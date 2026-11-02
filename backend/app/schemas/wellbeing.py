import uuid
from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.models.enums import Mood, ResourceCategory


class MoodIn(BaseModel):
    model_config = ConfigDict(extra="forbid")

    mood: Mood
    stress: int = Field(ge=1, le=10)
    sleep_hours: Decimal = Field(ge=0, le=24)
    note: str = Field(default="", max_length=500)
    # Timezone-aware instant from the browser. Stored in UTC.
    recorded_at: datetime

    @field_validator("sleep_hours")
    @classmethod
    def half_hour_steps(cls, value: Decimal) -> Decimal:
        if (value * 2) != (value * 2).to_integral_value():
            raise ValueError("Use half-hour steps for sleep, for example 7.5.")
        return value

    @field_validator("recorded_at")
    @classmethod
    def must_have_timezone(cls, value: datetime) -> datetime:
        if value.tzinfo is None:
            raise ValueError("Send the time with a timezone offset.")
        return value


class MoodOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    mood: Mood
    stress: int
    sleep_hours: Decimal
    note: str
    recorded_at: datetime


class JournalIn(BaseModel):
    model_config = ConfigDict(extra="forbid")

    content: str = Field(min_length=1, max_length=10000)

    @field_validator("content")
    @classmethod
    def not_blank(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("Write something before saving.")
        return value


class JournalOut(BaseModel):
    id: uuid.UUID
    content: str
    created_at: datetime
    updated_at: datetime


class QuestionnaireOut(BaseModel):
    id: uuid.UUID
    name: str
    version: int
    purpose: str
    approx_minutes: int
    questions: list[str]
    options: list[list[str]]


class QuestionnaireResultIn(BaseModel):
    model_config = ConfigDict(extra="forbid")

    answers: list[str]


class QuestionnaireResultOut(BaseModel):
    id: uuid.UUID
    questionnaire_id: uuid.UUID
    questionnaire_version: int
    completed_at: datetime
    answers: list[str]
    summary: str | None


class ResourceIn(BaseModel):
    model_config = ConfigDict(extra="forbid")

    title: str = Field(min_length=1, max_length=160)
    category: ResourceCategory
    summary: str = Field(min_length=1, max_length=300)
    body: list[str] = Field(default_factory=list, max_length=50)
    source: str = Field(min_length=1, max_length=200)
    reading_minutes: int = Field(ge=1, le=60)
    published: bool = False


class ResourceOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    title: str
    category: ResourceCategory
    summary: str
    body: list[str]
    source: str
    reading_minutes: int
    published: bool
    updated_at: datetime
