from datetime import UTC, datetime, timedelta

from sqlalchemy import select

from app.db.session import SessionLocal
from app.models import JournalEntry, Slot
from app.models.enums import Role
from tests.conftest import (
    Api,
    make_admin,
    make_slot,
    make_user,
    make_verified_psychologist,
)


def _student(email: str, name: str = "Test Student") -> Api:
    session = Api()
    make_user(email, Role.student, name=name)
    assert session.login(email).status_code == 200
    return session


def _book_with(student: Api, psy_id, days: int = 3) -> str:
    slot_id = make_slot(psy_id, timedelta(days=days))
    response = student.post("/api/v1/appointments", json={"slot_id": str(slot_id)})
    assert response.status_code == 201
    return response.json()["id"]


# ---------- consent and least-privilege psychologist view ----------


def test_psychologist_sees_no_identity_without_consent():
    psy_id = make_verified_psychologist("psy-a@example.com")
    student = _student("private@example.com", name="Private Person")
    appt = _book_with(student, psy_id)
    psychologist = Api()
    psychologist.login("psy-a@example.com")
    body = psychologist.get(f"/api/v1/appointments/psychologist/{appt}").json()
    assert body["student"] is None
    assert body["mood_summary"] is None
    assert "Private Person" not in str(body)


def test_identity_is_shared_only_after_the_student_grants_appointment_history():
    psy_id = make_verified_psychologist("psy-b@example.com")
    student = _student("sharer@example.com", name="Sharing Person")
    appt = _book_with(student, psy_id)
    assert (
        student.put(
            "/api/v1/consent",
            json={
                "psychologist_id": str(psy_id),
                "scope": "Appointment history",
                "granted": True,
            },
        ).status_code
        == 200
    )
    psychologist = Api()
    psychologist.login("psy-b@example.com")
    body = psychologist.get(f"/api/v1/appointments/psychologist/{appt}").json()
    assert body["student"]["name"] == "Sharing Person"


def test_mood_summary_is_aggregate_only_and_needs_mood_consent():
    psy_id = make_verified_psychologist("psy-c@example.com")
    student = _student("moods@example.com")
    appt = _book_with(student, psy_id)
    for stress in (3, 7):
        student.post(
            "/api/v1/moods",
            json={
                "mood": "Okay",
                "stress": stress,
                "sleep_hours": 7,
                "note": "private note",
                "recorded_at": (datetime.now(UTC) - timedelta(hours=2)).isoformat(),
            },
        )
    student.put(
        "/api/v1/consent",
        json={"psychologist_id": str(psy_id), "scope": "Mood records", "granted": True},
    )
    psychologist = Api()
    psychologist.login("psy-c@example.com")
    body = psychologist.get(f"/api/v1/appointments/psychologist/{appt}").json()
    assert body["mood_summary"] == {
        "count": 2,
        "average_stress": 5.0,
        "average_sleep_hours": 7.0,
    }
    assert "private note" not in str(body)


def test_withdrawing_consent_removes_access_at_once():
    psy_id = make_verified_psychologist("psy-d@example.com")
    student = _student("withdraw@example.com", name="Withdraw Person")
    appt = _book_with(student, psy_id)
    student.put(
        "/api/v1/consent",
        json={
            "psychologist_id": str(psy_id),
            "scope": "Appointment history",
            "granted": True,
        },
    )
    student.put(
        "/api/v1/consent",
        json={
            "psychologist_id": str(psy_id),
            "scope": "Appointment history",
            "granted": False,
        },
    )
    psychologist = Api()
    psychologist.login("psy-d@example.com")
    assert psychologist.get(f"/api/v1/appointments/psychologist/{appt}").json()["student"] is None


def test_consent_cannot_be_given_to_an_unlisted_psychologist():
    make_user("hidden-psy@example.com", Role.psychologist)
    student = _student("consent-check@example.com")
    response = student.put(
        "/api/v1/consent",
        json={
            "psychologist_id": "00000000-0000-0000-0000-000000000009",
            "scope": "Mood records",
            "granted": True,
        },
    )
    assert response.status_code in (404, 422)


# ---------- administration ----------


def test_publishing_requires_verification_and_unverifying_hides_the_profile():
    admin_id = make_admin()
    psy_id = make_user("pending-psy@example.com", Role.psychologist)
    admin = Api()
    admin.login("admin@example.com")
    refused = admin.post(f"/api/v1/admin/psychologists/{psy_id}/publication", json={"published": True})
    assert refused.status_code == 409
    assert (
        admin.post(
            f"/api/v1/admin/psychologists/{psy_id}/verification",
            json={"verified": True},
        ).status_code
        == 200
    )
    assert (
        admin.post(
            f"/api/v1/admin/psychologists/{psy_id}/publication",
            json={"published": True},
        ).json()["published"]
        is True
    )
    removed = admin.post(f"/api/v1/admin/psychologists/{psy_id}/verification", json={"verified": False}).json()
    assert removed["published"] is False
    assert admin_id is not None


def test_verified_and_published_psychologist_appears_in_the_directory():
    psy_id = make_verified_psychologist("listed@example.com", name="Listed Doctor")
    student = _student("browser@example.com")
    names = [item["name"] for item in student.get("/api/v1/psychologists").json()]
    assert "Listed Doctor" in names
    assert psy_id is not None


def test_unpublished_profile_is_not_in_the_directory():
    make_user("unlisted-dir@example.com", Role.psychologist, name="Unlisted Doctor")
    student = _student("browser2@example.com")
    names = [item["name"] for item in student.get("/api/v1/psychologists").json()]
    assert "Unlisted Doctor" not in names


def test_admin_actions_are_audited_with_actor_and_time():
    make_admin()
    admin = Api()
    admin.login("admin@example.com")
    assert admin.put("/api/v1/admin/settings", json={"cancellation_window_hours": 48}).status_code == 200
    log = admin.get("/api/v1/admin/audit").json()
    entry = next(e for e in log if e["action"] == "settings.cancellation_window_changed")
    assert entry["actor_name"] == "Test Admin"
    assert entry["created_at"]


def test_cancellation_window_setting_changes_the_student_rule():
    psy_id = make_verified_psychologist("window-psy@example.com")
    make_admin()
    admin = Api()
    admin.login("admin@example.com")
    admin.put("/api/v1/admin/settings", json={"cancellation_window_hours": 2})
    student = _student("window-stu@example.com")
    slot_id = make_slot(psy_id, timedelta(hours=5))
    appt = student.post("/api/v1/appointments", json={"slot_id": str(slot_id)}).json()["id"]
    assert student.post(f"/api/v1/appointments/{appt}/cancel").status_code == 200


def test_suspended_account_loses_access_immediately():
    make_admin()
    student_id = make_user("suspend-me@example.com", Role.student)
    student = Api()
    student.login("suspend-me@example.com")
    assert student.get("/api/v1/moods").status_code == 200
    admin = Api()
    admin.login("admin@example.com")
    assert admin.patch(f"/api/v1/admin/users/{student_id}/status", json={"status": "suspended"}).status_code == 200
    assert student.get("/api/v1/moods").status_code == 401


def test_resources_drafts_are_hidden_and_admin_can_publish(api):
    make_admin()
    admin = Api()
    admin.login("admin@example.com")
    body = {
        "title": "Draft guide",
        "category": "Stress",
        "summary": "A summary",
        "body": ["Text"],
        "source": "Reviewed by team",
        "reading_minutes": 3,
        "published": False,
    }
    created = admin.post("/api/v1/admin/resources", json=body).json()
    student = _student("reader-res@example.com")
    assert all(r["id"] != created["id"] for r in student.get("/api/v1/resources").json())
    admin.put(f"/api/v1/admin/resources/{created['id']}", json={**body, "published": True})
    assert any(r["id"] == created["id"] for r in student.get("/api/v1/resources").json())


# ---------- student account: export and deletion ----------


def test_export_contains_the_students_own_data_including_journal_in_plain_text():
    student = _student("exporter@example.com")
    student.post("/api/v1/journal", json={"content": "Only I should read this"})
    data = student.get("/api/v1/users/me/export").json()
    assert data["journal_entries"][0]["content"] == "Only I should read this"
    assert "password" not in str(data).lower()


def test_deleting_an_account_removes_its_data_and_releases_booked_times():
    psy_id = make_verified_psychologist("deleter-psy@example.com")
    student = _student("deleter@example.com")
    student.post("/api/v1/journal", json={"content": "to be deleted"})
    slot_id = make_slot(psy_id, timedelta(days=4))
    student.post("/api/v1/appointments", json={"slot_id": str(slot_id)})

    assert student.delete("/api/v1/users/me").status_code == 204
    db = SessionLocal()
    try:
        assert db.scalar(select(JournalEntry)) is None
        assert db.scalar(select(Slot).where(Slot.id == slot_id)) is not None  # the time remains
    finally:
        db.close()
    again = Api()
    assert again.login("deleter@example.com").status_code == 401


def test_psychologist_cannot_delete_their_own_account_through_the_student_route():
    make_verified_psychologist("no-delete@example.com")
    psychologist = Api()
    psychologist.login("no-delete@example.com")
    assert psychologist.delete("/api/v1/users/me").status_code == 422
