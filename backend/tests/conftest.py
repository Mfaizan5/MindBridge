"""Shared test setup. Tests run only against the TEST database (TEST_DATABASE_URL), never the development one."""

import os
import uuid
from datetime import UTC, datetime, timedelta
from pathlib import Path

from dotenv import dotenv_values

_ENV = dotenv_values(Path(__file__).resolve().parents[1] / ".env")
_TEST_URL = os.environ.get("TEST_DATABASE_URL") or _ENV.get("TEST_DATABASE_URL")
if not _TEST_URL or "mindbridge_test" not in _TEST_URL:
    raise RuntimeError("TEST_DATABASE_URL must point at a database named mindbridge_test.")

# Must be set before the application modules are imported (settings and the engine are created on import).
os.environ["DATABASE_URL"] = _TEST_URL
os.environ["RATE_LIMIT_PER_MINUTE"] = "100000"
os.environ["LOG_PASSWORD_RESET_LINKS"] = "true"

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import text

from app.core.security import hash_password
from app.db.base import Base
from app.db.session import SessionLocal, engine
from app.main import app
from app.models import PsychologistProfile, Slot, User
from app.models.enums import Role, UserStatus

PASSWORD = "correct horse battery"


@pytest.fixture(autouse=True)
def clean_database():
    """Empties every table before each test, so tests cannot affect each other."""
    tables = ", ".join(f'"{t.name}"' for t in reversed(Base.metadata.sorted_tables))
    with engine.begin() as conn:
        conn.execute(text(f"TRUNCATE {tables} RESTART IDENTITY CASCADE"))
    yield


class Api:
    """A logged-in browser stand-in: holds one cookie jar and the CSRF token, like the real frontend."""

    def __init__(self) -> None:
        self.client = TestClient(app, base_url="http://localhost")
        self.csrf: str | None = None
        self.user: dict | None = None

    def login(self, email: str, password: str = PASSWORD, role: str | None = None):
        body = {"email": email, "password": password}
        if role:
            body["role"] = role
        response = self.client.post("/api/v1/auth/login", json=body)
        if response.status_code == 200:
            self.csrf = response.json()["csrf_token"]
            self.user = response.json()["user"]
        return response

    def signup(self, name: str, email: str, role: str = "student", password: str = PASSWORD):
        response = self.client.post(
            "/api/v1/auth/signup",
            json={
                "name": name,
                "email": email,
                "password": password,
                "role": role,
                "terms": True,
            },
        )
        if response.status_code == 201:
            self.csrf = response.json()["csrf_token"]
            self.user = response.json()["user"]
        return response

    def _headers(self) -> dict[str, str]:
        return {"X-CSRF-Token": self.csrf} if self.csrf else {}

    def get(self, url: str, **kwargs):
        return self.client.get(url, **kwargs)

    def post(self, url: str, **kwargs):
        return self.client.post(url, headers=self._headers(), **kwargs)

    def put(self, url: str, **kwargs):
        return self.client.put(url, headers=self._headers(), **kwargs)

    def patch(self, url: str, **kwargs):
        return self.client.patch(url, headers=self._headers(), **kwargs)

    def delete(self, url: str, **kwargs):
        return self.client.delete(url, headers=self._headers(), **kwargs)


@pytest.fixture
def api() -> Api:
    return Api()


def make_user(
    email: str,
    role: Role,
    name: str = "Test User",
    status: UserStatus = UserStatus.active,
) -> uuid.UUID:
    """Creates an account directly in the database (used for the administrator, which sign-up cannot create)."""
    db = SessionLocal()
    try:
        user = User(
            name=name,
            email=email.lower(),
            password_hash=hash_password(PASSWORD),
            role=role,
            status=status,
        )
        db.add(user)
        db.flush()
        if role == Role.psychologist:
            db.add(
                PsychologistProfile(
                    user_id=user.id,
                    specialization="Testing",
                    bio="",
                    experience_years=1,
                )
            )
        db.commit()
        return user.id
    finally:
        db.close()


def make_admin(email: str = "admin@example.com") -> uuid.UUID:
    return make_user(email, Role.admin, name="Test Admin")


def make_verified_psychologist(email: str, name: str = "Dr Test") -> uuid.UUID:
    """A psychologist who is verified and published, so students can book with them."""
    user_id = make_user(email, Role.psychologist, name=name)
    db = SessionLocal()
    try:
        profile = db.get(PsychologistProfile, user_id)
        profile.verified = True
        profile.verified_at = datetime.now(UTC)
        profile.published = True
        db.commit()
    finally:
        db.close()
    return user_id


def make_slot(psychologist_id: uuid.UUID, starts_in: timedelta, minutes: int = 50) -> uuid.UUID:
    """Creates a slot directly in the database. Used for past times and for times close to the start."""
    db = SessionLocal()
    try:
        start = datetime.now(UTC) + starts_in
        slot = Slot(
            psychologist_id=psychologist_id,
            starts_at=start,
            ends_at=start + timedelta(minutes=minutes),
        )
        db.add(slot)
        db.commit()
        return slot.id
    finally:
        db.close()


def db_session():
    return SessionLocal()
