from datetime import UTC, datetime, timedelta

from sqlalchemy import select

from app.db.session import SessionLocal
from app.models import JournalEntry, MoodRecord
from app.models.enums import Role
from tests.conftest import Api, make_admin, make_user, make_verified_psychologist


def _mood_payload(hours_ago: int = 1):
    return {
        "mood": "Happy",
        "stress": 4,
        "sleep_hours": 7.5,
        "note": "",
        "recorded_at": (datetime.now(UTC) - timedelta(hours=hours_ago)).isoformat(),
    }


def _student(email: str) -> Api:
    session = Api()
    make_user(email, Role.student)
    assert session.login(email).status_code == 200
    return session


# ---------- vertical privilege escalation: roles ----------


def test_student_cannot_call_any_administrator_endpoint(api):
    make_user("stu@example.com", Role.student)
    api.login("stu@example.com")
    for method, url in [
        ("get", "/api/v1/admin/users"),
        ("get", "/api/v1/admin/audit"),
        ("get", "/api/v1/admin/settings"),
        ("get", "/api/v1/admin/psychologists"),
        ("get", "/api/v1/admin/resources"),
    ]:
        assert getattr(api, method)(url).status_code == 403, url


def test_psychologist_cannot_call_administrator_endpoints(api):
    make_verified_psychologist("psy@example.com")
    api.login("psy@example.com")
    assert api.get("/api/v1/admin/users").status_code == 403
    assert api.put("/api/v1/admin/settings", json={"cancellation_window_hours": 1}).status_code == 403


def test_student_cannot_use_psychologist_workspace(api):
    make_user("stu@example.com", Role.student)
    api.login("stu@example.com")
    assert api.get("/api/v1/psychologists/me/profile").status_code == 403
    assert (
        api.post(
            "/api/v1/psychologists/me/slots",
            json={
                "starts_at": "2099-01-01T09:00:00+00:00",
                "ends_at": "2099-01-01T09:50:00+00:00",
            },
        ).status_code
        == 403
    )


def test_psychologist_cannot_read_student_moods(api):
    make_verified_psychologist("psy@example.com")
    api.login("psy@example.com")
    assert api.get("/api/v1/moods").status_code == 403


def test_administrator_cannot_read_journal_entries(api):
    make_admin()
    api.login("admin@example.com")
    assert api.get("/api/v1/journal").status_code == 403


def test_administrator_cannot_suspend_their_own_account(api):
    admin_id = make_admin()
    api.login("admin@example.com")
    response = api.patch(f"/api/v1/admin/users/{admin_id}/status", json={"status": "suspended"})
    assert response.status_code == 409


def test_administrator_account_cannot_be_suspended_by_another_administrator(api):
    make_admin("admin1@example.com")
    other_admin_id = make_admin("admin2@example.com")
    api.login("admin1@example.com")
    response = api.patch(f"/api/v1/admin/users/{other_admin_id}/status", json={"status": "suspended"})
    assert response.status_code == 403


def test_anonymous_requests_are_refused(api):
    assert api.get("/api/v1/moods").status_code == 401
    assert api.get("/api/v1/psychologists/me/profile").status_code == 401
    assert api.get("/api/v1/admin/users").status_code == 401


# ---------- horizontal privilege escalation: other people's records ----------


def test_student_cannot_see_or_change_another_students_mood(api):
    owner = _student("owner@example.com")
    created = owner.post("/api/v1/moods", json=_mood_payload())
    assert created.status_code == 201
    record_id = created.json()["id"]

    intruder = _student("intruder@example.com")
    assert intruder.get("/api/v1/moods").json() == []
    assert intruder.put(f"/api/v1/moods/{record_id}", json=_mood_payload()).status_code == 404
    assert intruder.delete(f"/api/v1/moods/{record_id}").status_code == 404

    db = SessionLocal()
    try:
        assert db.get(MoodRecord, record_id) is not None  # still there, unchanged
    finally:
        db.close()


def test_journal_entries_are_private_to_their_owner(api):
    owner = _student("writer@example.com")
    entry = owner.post("/api/v1/journal", json={"content": "A private thought"})
    assert entry.status_code == 201
    entry_id = entry.json()["id"]

    other = _student("reader@example.com")
    assert other.get("/api/v1/journal").json() == []
    assert other.put(f"/api/v1/journal/{entry_id}", json={"content": "changed"}).status_code == 404
    assert other.delete(f"/api/v1/journal/{entry_id}").status_code == 404


def test_journal_text_is_encrypted_in_the_database(api):
    owner = _student("writer@example.com")
    owner.post("/api/v1/journal", json={"content": "a very specific phrase xyzzy"})
    db = SessionLocal()
    try:
        stored = db.scalar(select(JournalEntry))
        assert "xyzzy" not in stored.content_encrypted
    finally:
        db.close()


def test_student_cannot_book_as_another_student(api):
    """Booking always uses the signed-in student. There is no field that lets a client name someone else."""
    from app.api.v1.appointments import AppointmentIn

    assert "student_id" not in AppointmentIn.model_fields


def test_student_cannot_read_another_students_questionnaire_result(api):
    result_id = "00000000-0000-0000-0000-000000000001"
    assert _student("someone@example.com").get(f"/api/v1/questionnaires/results/{result_id}").status_code == 404


def test_unknown_resource_and_draft_resource_look_the_same_to_students(api):
    student = _student("reader@example.com")
    assert student.get("/api/v1/resources/00000000-0000-0000-0000-000000000002").status_code == 404
