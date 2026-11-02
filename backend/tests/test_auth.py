from datetime import UTC, datetime, timedelta

from sqlalchemy import select

from app.db.session import SessionLocal
from app.models import AuthSession, PasswordResetToken, User
from app.models.enums import Role, UserStatus
from tests.conftest import PASSWORD, make_user


def test_student_can_sign_up_and_is_logged_in(api):
    response = api.signup("Ada Student", "ada@example.com")
    assert response.status_code == 201
    body = response.json()
    assert body["user"]["role"] == "student"
    assert "password" not in body["user"] and "password_hash" not in body["user"]
    assert api.get("/api/v1/auth/me").status_code == 200


def test_session_cookie_is_http_only_and_same_site(api):
    response = api.signup("Ada Student", "ada@example.com")
    cookie = response.headers["set-cookie"].lower()
    assert "httponly" in cookie
    assert "samesite=lax" in cookie
    assert "mb_session=" in cookie


def test_password_is_stored_as_a_hash_not_plain_text(api):
    api.signup("Ada Student", "ada@example.com")
    db = SessionLocal()
    try:
        user = db.scalar(select(User).where(User.email == "ada@example.com"))
        assert user.password_hash.startswith("$argon2")
        assert PASSWORD not in user.password_hash
    finally:
        db.close()


def test_wrong_password_is_refused_with_a_generic_message(api):
    api.signup("Ada Student", "ada@example.com")
    other = api.__class__()
    response = other.login("ada@example.com", "not the password")
    assert response.status_code == 401
    assert response.json()["error"]["message"] == "Email or password is incorrect."


def test_unknown_email_gets_the_same_message_as_wrong_password(api):
    response = api.login("nobody@example.com", "whatever password")
    assert response.status_code == 401
    assert response.json()["error"]["message"] == "Email or password is incorrect."


def test_duplicate_email_is_refused_regardless_of_case(api):
    api.signup("Ada Student", "ada@example.com")
    second = api.__class__().signup("Ada Again", "ADA@example.com")
    assert second.status_code == 409


def test_administrator_cannot_be_self_created(api):
    response = api.signup("Mallory", "mallory@example.com", role="admin")
    assert response.status_code == 422
    db = SessionLocal()
    try:
        assert db.scalar(select(User).where(User.email == "mallory@example.com")) is None
    finally:
        db.close()


def test_psychologist_sign_up_starts_unverified_and_unpublished(api):
    response = api.signup("Dr New", "new.psy@example.com", role="psychologist")
    assert response.status_code == 201
    assert response.json()["user"]["role"] == "psychologist"
    profile = api.get("/api/v1/psychologists/me/profile")
    assert profile.status_code == 200
    assert profile.json()["verified"] is False
    assert profile.json()["published"] is False


def test_role_must_match_the_account_at_login(api):
    make_user("pro@example.com", Role.psychologist)
    response = api.login("pro@example.com", role="student")
    assert response.status_code == 403
    assert "does not belong to a student account" in response.json()["error"]["message"]


def test_logout_ends_the_session(api):
    api.signup("Ada Student", "ada@example.com")
    assert api.post("/api/v1/auth/logout").status_code == 204
    assert api.get("/api/v1/auth/me").status_code == 401


def test_suspended_account_cannot_log_in(api):
    make_user("sus@example.com", Role.student, status=UserStatus.suspended)
    response = api.login("sus@example.com")
    assert response.status_code == 403
    assert "suspended" in response.json()["error"]["message"]


def test_session_expires_after_idle_timeout(api):
    api.signup("Ada Student", "ada@example.com")
    db = SessionLocal()
    try:
        session = db.scalar(select(AuthSession))
        session.last_seen_at = datetime.now(UTC) - timedelta(minutes=31)
        db.commit()
    finally:
        db.close()
    assert api.get("/api/v1/auth/me").status_code == 401


def test_session_expires_after_absolute_lifetime(api):
    api.signup("Ada Student", "ada@example.com")
    db = SessionLocal()
    try:
        session = db.scalar(select(AuthSession))
        session.expires_at = datetime.now(UTC) - timedelta(minutes=1)
        db.commit()
    finally:
        db.close()
    assert api.get("/api/v1/auth/me").status_code == 401


def test_state_changes_without_csrf_token_are_refused(api):
    api.signup("Ada Student", "ada@example.com")
    response = api.client.post(
        "/api/v1/moods",
        json={
            "mood": "Happy",
            "stress": 3,
            "sleep_hours": 7,
            "recorded_at": datetime.now(UTC).isoformat(),
        },
    )
    assert response.status_code == 403


def test_state_changes_with_a_wrong_csrf_token_are_refused(api):
    api.signup("Ada Student", "ada@example.com")
    response = api.client.post(
        "/api/v1/moods",
        headers={"X-CSRF-Token": "forged"},
        json={
            "mood": "Happy",
            "stress": 3,
            "sleep_hours": 7,
            "recorded_at": datetime.now(UTC).isoformat(),
        },
    )
    assert response.status_code == 403


def test_password_reset_request_gives_the_same_answer_for_unknown_email(api):
    make_user("known@example.com", Role.student)
    known = api.post("/api/v1/auth/password-reset/request", json={"email": "known@example.com"})
    unknown = api.post("/api/v1/auth/password-reset/request", json={"email": "unknown@example.com"})
    assert known.status_code == unknown.status_code == 202
    assert known.json() == unknown.json()


def test_password_reset_stores_only_a_hash_and_is_single_use(api, caplog):
    make_user("reset@example.com", Role.student)
    api.post("/api/v1/auth/password-reset/request", json={"email": "reset@example.com"})
    link = next(r.getMessage() for r in caplog.records if "DEV password reset link" in r.getMessage())
    token = link.split("token=")[1]

    db = SessionLocal()
    try:
        record = db.scalar(select(PasswordResetToken))
        assert token not in record.token_hash  # only the hash is stored
    finally:
        db.close()

    other = api.__class__()
    ok = other.client.post(
        "/api/v1/auth/password-reset/confirm",
        json={"token": token, "password": "a brand new password"},
    )
    assert ok.status_code == 204
    again = other.client.post(
        "/api/v1/auth/password-reset/confirm",
        json={"token": token, "password": "another password 1"},
    )
    assert again.status_code == 422
    assert other.login("reset@example.com", "a brand new password").status_code == 200


def test_password_reset_ends_existing_sessions(api, caplog):
    api.signup("Ada Student", "ada@example.com")
    api.post("/api/v1/auth/password-reset/request", json={"email": "ada@example.com"})
    link = next(r.getMessage() for r in caplog.records if "DEV password reset link" in r.getMessage())
    token = link.split("token=")[1]
    api.client.post(
        "/api/v1/auth/password-reset/confirm",
        json={"token": token, "password": "a brand new password"},
    )
    assert api.get("/api/v1/auth/me").status_code == 401


def test_login_is_rate_limited(monkeypatch, api):
    from app.core import config

    make_user("limit@example.com", Role.student)
    monkeypatch.setattr(config.get_settings(), "rate_limit_per_minute", 3)
    statuses = [api.login("limit@example.com", "wrong password").status_code for _ in range(5)]
    assert 429 in statuses
    monkeypatch.setattr(config.get_settings(), "rate_limit_per_minute", 100000)
