import threading
from datetime import UTC, datetime, timedelta

import pytest
from sqlalchemy import select

from app.db.session import SessionLocal
from app.models import Appointment, AppointmentEvent, MoodRecord, Slot
from app.models.enums import AppointmentStatus, Role
from tests.conftest import Api, make_slot, make_user, make_verified_psychologist


def _signed_in_student(email: str) -> Api:
    session = Api()
    make_user(email, Role.student)
    assert session.login(email).status_code == 200
    return session


def _mood(**overrides):
    payload = {
        "mood": "Okay",
        "stress": 5,
        "sleep_hours": 7.5,
        "note": "",
        "recorded_at": (datetime.now(UTC) - timedelta(hours=1)).isoformat(),
    }
    payload.update(overrides)
    return payload


# ---------- mood, stress and sleep: validation and persistence ----------


def test_valid_check_in_is_saved_and_listed_back():
    student = _signed_in_student("mood@example.com")
    created = student.post("/api/v1/moods", json=_mood(note="Long day"))
    assert created.status_code == 201
    listed = student.get("/api/v1/moods").json()
    assert len(listed) == 1
    assert listed[0]["stress"] == 5 and listed[0]["note"] == "Long day"


@pytest.mark.parametrize(
    "overrides",
    [
        {"stress": 0},
        {"stress": 11},
        {"stress": 4.5},
        {"sleep_hours": 25},
        {"sleep_hours": 7.25},
        {"sleep_hours": -1},
        {"mood": "Elated"},
        {"note": "x" * 501},
        {"recorded_at": (datetime.now(UTC) + timedelta(days=2)).isoformat()},
        {"recorded_at": "2026-11-01T10:00:00"},  # no timezone offset
    ],
)
def test_invalid_check_ins_are_refused(overrides):
    student = _signed_in_student("invalid@example.com")
    response = student.post("/api/v1/moods", json=_mood(**overrides))
    assert response.status_code == 422


def test_check_in_can_be_corrected_and_deleted():
    student = _signed_in_student("edit@example.com")
    record_id = student.post("/api/v1/moods", json=_mood()).json()["id"]
    assert student.put(f"/api/v1/moods/{record_id}", json=_mood(stress=8)).json()["stress"] == 8
    assert student.delete(f"/api/v1/moods/{record_id}").status_code == 204
    assert student.get("/api/v1/moods").json() == []


def test_database_refuses_out_of_range_stress_even_if_the_api_check_is_bypassed():
    from sqlalchemy.exc import IntegrityError

    student = _signed_in_student("dbcheck@example.com")
    student_id = student.user["id"]
    db = SessionLocal()
    try:
        db.add(
            MoodRecord(
                student_id=student_id,
                mood="Okay",
                stress=42,
                sleep_hours=7,
                note="",
                recorded_at=datetime.now(UTC),
            )
        )
        with pytest.raises(IntegrityError):
            db.commit()
    finally:
        db.rollback()
        db.close()


def test_mood_list_can_be_filtered_by_date_range():
    student = _signed_in_student("range@example.com")
    student.post(
        "/api/v1/moods",
        json=_mood(recorded_at=(datetime.now(UTC) - timedelta(days=10)).isoformat()),
    )
    student.post(
        "/api/v1/moods",
        json=_mood(recorded_at=(datetime.now(UTC) - timedelta(days=1)).isoformat()),
    )
    start = (datetime.now(UTC) - timedelta(days=5)).isoformat()
    recent = student.get("/api/v1/moods", params={"start": start}).json()
    assert len(recent) == 1


# ---------- availability ----------


def test_psychologist_can_add_a_time_and_overlaps_are_refused_by_the_database():
    psychologist = Api()
    make_verified_psychologist("psy@example.com")
    assert psychologist.login("psy@example.com").status_code == 200
    start = datetime.now(UTC) + timedelta(days=2)
    body = {
        "starts_at": start.isoformat(),
        "ends_at": (start + timedelta(minutes=50)).isoformat(),
    }
    assert psychologist.post("/api/v1/psychologists/me/slots", json=body).status_code == 201
    overlapping = {
        "starts_at": (start + timedelta(minutes=20)).isoformat(),
        "ends_at": (start + timedelta(minutes=70)).isoformat(),
    }
    response = psychologist.post("/api/v1/psychologists/me/slots", json=overlapping)
    assert response.status_code == 409
    assert "overlaps" in response.json()["error"]["message"]


def test_past_and_too_short_slots_are_refused():
    psychologist = Api()
    make_verified_psychologist("psy2@example.com")
    psychologist.login("psy2@example.com")
    past = datetime.now(UTC) - timedelta(hours=1)
    assert (
        psychologist.post(
            "/api/v1/psychologists/me/slots",
            json={
                "starts_at": past.isoformat(),
                "ends_at": (past + timedelta(minutes=50)).isoformat(),
            },
        ).status_code
        == 422
    )
    future = datetime.now(UTC) + timedelta(days=3)
    assert (
        psychologist.post(
            "/api/v1/psychologists/me/slots",
            json={
                "starts_at": future.isoformat(),
                "ends_at": (future + timedelta(minutes=5)).isoformat(),
            },
        ).status_code
        == 422
    )


def test_booked_time_cannot_be_removed():
    psy_id = make_verified_psychologist("psy3@example.com")
    slot_id = make_slot(psy_id, timedelta(days=2))
    student = _signed_in_student("booker@example.com")
    assert student.post("/api/v1/appointments", json={"slot_id": str(slot_id)}).status_code == 201
    psychologist = Api()
    psychologist.login("psy3@example.com")
    assert psychologist.delete(f"/api/v1/psychologists/me/slots/{slot_id}").status_code == 409


# ---------- booking ----------


def test_student_books_an_open_time_and_both_sides_are_notified():
    psy_id = make_verified_psychologist("psy4@example.com")
    slot_id = make_slot(psy_id, timedelta(days=2))
    student = _signed_in_student("student4@example.com")
    response = student.post("/api/v1/appointments", json={"slot_id": str(slot_id)})
    assert response.status_code == 201
    assert response.json()["status"] == "Pending"
    assert [n["title"] for n in student.get("/api/v1/notifications").json()] == ["Appointment requested"]
    psychologist = Api()
    psychologist.login("psy4@example.com")
    assert [n["title"] for n in psychologist.get("/api/v1/notifications").json()] == ["New appointment request"]


def test_second_booking_of_the_same_time_is_refused():
    psy_id = make_verified_psychologist("psy5@example.com")
    slot_id = make_slot(psy_id, timedelta(days=2))
    first = _signed_in_student("first@example.com")
    second = _signed_in_student("second@example.com")
    assert first.post("/api/v1/appointments", json={"slot_id": str(slot_id)}).status_code == 201
    response = second.post("/api/v1/appointments", json={"slot_id": str(slot_id)})
    assert response.status_code == 409
    assert "just been taken" in response.json()["error"]["message"]


def test_simultaneous_booking_attempts_result_in_exactly_one_booking():
    """Ten students race for one time. The row lock and the unique index must let exactly one succeed."""
    psy_id = make_verified_psychologist("racepsy@example.com")
    slot_id = make_slot(psy_id, timedelta(days=2))
    students = []
    for i in range(10):
        session = Api()
        make_user(f"racer{i}@example.com", Role.student)
        session.login(f"racer{i}@example.com")
        students.append(session)

    barrier = threading.Barrier(len(students))
    statuses: list[int] = []
    lock = threading.Lock()

    def attempt(session: Api) -> None:
        barrier.wait()
        response = session.post("/api/v1/appointments", json={"slot_id": str(slot_id)})
        with lock:
            statuses.append(response.status_code)

    threads = [threading.Thread(target=attempt, args=(s,)) for s in students]
    for t in threads:
        t.start()
    for t in threads:
        t.join(timeout=60)

    assert sorted(statuses) == [201] + [409] * 9
    db = SessionLocal()
    try:
        live = db.scalars(
            select(Appointment).where(
                Appointment.slot_id == slot_id,
                Appointment.status == AppointmentStatus.pending,
            )
        ).all()
        assert len(live) == 1
    finally:
        db.close()


def test_unpublished_psychologist_cannot_be_booked():
    make_user("unlisted@example.com", Role.psychologist)
    db = SessionLocal()
    try:
        from app.models import PsychologistProfile

        user_id = db.scalar(select(PsychologistProfile.user_id))
        start = datetime.now(UTC) + timedelta(days=2)
        db.add(
            Slot(
                psychologist_id=user_id,
                starts_at=start,
                ends_at=start + timedelta(minutes=50),
            )
        )
        db.commit()
        slot_id = db.scalar(select(Slot.id).where(Slot.psychologist_id == user_id))
    finally:
        db.close()
    student = _signed_in_student("blocked@example.com")
    assert student.post("/api/v1/appointments", json={"slot_id": str(slot_id)}).status_code == 409


def test_student_cancellation_respects_the_window():
    psy_id = make_verified_psychologist("psy6@example.com")
    soon = make_slot(psy_id, timedelta(hours=3))
    later = make_slot(psy_id, timedelta(days=3))
    student = _signed_in_student("window@example.com")
    too_soon = student.post("/api/v1/appointments", json={"slot_id": str(soon)}).json()["id"]
    refused = student.post(f"/api/v1/appointments/{too_soon}/cancel")
    assert refused.status_code == 409
    assert "up to 24 hours" in refused.json()["error"]["message"]

    fine = student.post("/api/v1/appointments", json={"slot_id": str(later)}).json()["id"]
    assert student.post(f"/api/v1/appointments/{fine}/cancel").status_code == 200


def test_cancelled_time_is_released_for_someone_else():
    psy_id = make_verified_psychologist("psy7@example.com")
    slot_id = make_slot(psy_id, timedelta(days=3))
    first = _signed_in_student("rel1@example.com")
    appt = first.post("/api/v1/appointments", json={"slot_id": str(slot_id)}).json()["id"]
    first.post(f"/api/v1/appointments/{appt}/cancel")
    second = _signed_in_student("rel2@example.com")
    assert second.post("/api/v1/appointments", json={"slot_id": str(slot_id)}).status_code == 201


def test_status_transitions_are_enforced_and_recorded():
    psy_id = make_verified_psychologist("psy8@example.com")
    slot_id = make_slot(psy_id, timedelta(days=2))
    student = _signed_in_student("flow@example.com")
    appt = student.post("/api/v1/appointments", json={"slot_id": str(slot_id)}).json()["id"]
    psychologist = Api()
    psychologist.login("psy8@example.com")

    skip = psychologist.patch(f"/api/v1/appointments/psychologist/{appt}/status", json={"status": "Completed"})
    assert skip.status_code == 409  # Pending cannot jump straight to Completed

    assert (
        psychologist.patch(
            f"/api/v1/appointments/psychologist/{appt}/status",
            json={"status": "Confirmed"},
        ).status_code
        == 200
    )
    early = psychologist.patch(f"/api/v1/appointments/psychologist/{appt}/status", json={"status": "Completed"})
    assert early.status_code == 409  # cannot complete before it starts

    db = SessionLocal()
    try:
        events = db.scalars(select(AppointmentEvent).where(AppointmentEvent.appointment_id == appt)).all()
        assert [e.to_status for e in events] == ["Pending", "Confirmed"]
    finally:
        db.close()


def test_psychologist_cannot_change_another_psychologists_appointment():
    psy_id = make_verified_psychologist("owner-psy@example.com")
    slot_id = make_slot(psy_id, timedelta(days=2))
    student = _signed_in_student("owned@example.com")
    appt = student.post("/api/v1/appointments", json={"slot_id": str(slot_id)}).json()["id"]
    make_verified_psychologist("other-psy@example.com")
    intruder = Api()
    intruder.login("other-psy@example.com")
    assert (
        intruder.patch(
            f"/api/v1/appointments/psychologist/{appt}/status",
            json={"status": "Confirmed"},
        ).status_code
        == 404
    )


# ---------- questionnaires and resources ----------


def test_wellness_check_is_unavailable_until_content_is_approved():
    student = _signed_in_student("check@example.com")
    assert student.get("/api/v1/questionnaires").json() == []
    assert student.get("/api/v1/resources").status_code == 200
