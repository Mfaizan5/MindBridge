"""Creates development demonstration data. Safe to run more than once (existing records are kept).

Usage (from the backend folder, with the virtual environment active):
    python scripts/seed_demo.py

Passwords come from SEED_ADMIN_PASSWORD and SEED_DEMO_PASSWORD in backend/.env. Never run this against production.
All people and details below are fictional.
"""

import sys
from datetime import UTC, datetime, timedelta
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from sqlalchemy import select

from app.core.config import get_settings
from app.core.security import hash_password
from app.db.session import SessionLocal
from app.models import (
    AuditLog,
    MoodRecord,
    PsychologistProfile,
    Qualification,
    Questionnaire,
    Resource,
    Slot,
    User,
)
from app.models.enums import (
    ConsultationFormat,
    Mood,
    QualificationStatus,
    QuestionnaireStatus,
    ResourceCategory,
    Role,
    UserStatus,
)

PLACEHOLDER = "Placeholder content. Real material needs professional review before release (A-17)."


def _get_or_create_user(db, email: str, name: str, role: Role, password: str) -> User:
    user = db.scalar(select(User).where(User.email == email.lower()))
    if user is None:
        user = User(
            name=name,
            email=email.lower(),
            password_hash=hash_password(password),
            role=role,
            status=UserStatus.active,
        )
        db.add(user)
        db.flush()
    return user


def seed() -> None:
    settings = get_settings()
    if settings.app_env == "production":
        raise SystemExit("Refusing to seed demo data in production.")
    if not settings.seed_admin_password or not settings.seed_demo_password:
        raise SystemExit("Set SEED_ADMIN_PASSWORD and SEED_DEMO_PASSWORD in backend/.env first.")

    now = datetime.now(UTC)
    db = SessionLocal()
    try:
        admin = _get_or_create_user(
            db,
            "admin@mindbridge.com",
            "Demo Admin",
            Role.admin,
            settings.seed_admin_password,
        )
        amara = _get_or_create_user(
            db,
            "amara@mindbridge.demo",
            "Dr. Amara Osei",
            Role.psychologist,
            settings.seed_demo_password,
        )
        daniel = _get_or_create_user(
            db,
            "daniel@mindbridge.demo",
            "Daniel Reyes, MSc",
            Role.psychologist,
            settings.seed_demo_password,
        )
        mei = _get_or_create_user(
            db,
            "mei@mindbridge.demo",
            "Mei Lin Tan",
            Role.psychologist,
            settings.seed_demo_password,
        )
        student = _get_or_create_user(
            db,
            "student@mindbridge.demo",
            "Demo Student",
            Role.student,
            settings.seed_demo_password,
        )
        db.flush()

        for user, spec, years, verified, published, fee, fmt in [
            (
                amara,
                "Exam anxiety, stress management",
                9,
                True,
                True,
                40,
                ConsultationFormat.online,
            ),
            (daniel, "Sleep difficulties, low mood", 5, True, True, None, None),
            (mei, "General student wellbeing", 3, False, False, None, None),
        ]:
            if db.get(PsychologistProfile, user.id) is None:
                db.add(
                    PsychologistProfile(
                        user_id=user.id,
                        specialization=spec,
                        bio="Fictional demonstration profile.",
                        experience_years=years,
                        verified=verified,
                        published=published,
                        verified_at=now if verified else None,
                        fee_amount=fee,
                        fee_currency="USD" if fee else None,
                        format=fmt,
                    )
                )
        db.flush()

        if not db.scalar(select(Qualification).where(Qualification.psychologist_id == amara.id)):
            db.add(
                Qualification(
                    psychologist_id=amara.id,
                    title="PhD Clinical Psychology",
                    institution="Demo University",
                    year=2015,
                    status=QualificationStatus.verified,
                )
            )
        if not db.scalar(select(Qualification).where(Qualification.psychologist_id == daniel.id)):
            db.add(
                Qualification(
                    psychologist_id=daniel.id,
                    title="MSc Counselling Psychology",
                    institution="Demo University",
                    year=2019,
                    status=QualificationStatus.verified,
                )
            )
        if not db.scalar(select(Qualification).where(Qualification.psychologist_id == mei.id)):
            db.add(
                Qualification(
                    psychologist_id=mei.id,
                    title="Registration",
                    institution="Pending",
                    year=2024,
                    status=QualificationStatus.submitted,
                )
            )

        if not db.scalar(select(MoodRecord).where(MoodRecord.student_id == student.id)):
            stress = [6, 5, 7, 4, 5, 8, 6, 4, 3, 5]
            sleep = [6, 7, 5.5, 7.5, 7, 5, 6.5, 8, 7.5, 7]
            moods = list(Mood)
            for i, (s, h) in enumerate(zip(stress, sleep, strict=True)):
                db.add(
                    MoodRecord(
                        student_id=student.id,
                        mood=moods[(i * 2) % len(moods)],
                        stress=s,
                        sleep_hours=h,
                        note="",
                        recorded_at=now - timedelta(days=len(stress) - i, hours=2),
                    )
                )

        for slot_owner, days in [(amara, (1, 2, 4, 6)), (daniel, (3, 5))]:
            if not db.scalar(select(Slot).where(Slot.psychologist_id == slot_owner.id)):
                for day in days:
                    start = (now + timedelta(days=day)).replace(hour=9, minute=0, second=0, microsecond=0)
                    for offset_hours in (0, 1, 5):
                        s = start + timedelta(hours=offset_hours)
                        db.add(
                            Slot(
                                psychologist_id=slot_owner.id,
                                starts_at=s,
                                ends_at=s + timedelta(minutes=50),
                            )
                        )

        if not db.scalar(select(Resource.id)):
            resources = [
                (
                    "Understanding everyday stress",
                    ResourceCategory.stress,
                    "What stress is, and small first steps.",
                    4,
                    True,
                ),
                (
                    "A calmer wind-down routine",
                    ResourceCategory.sleep,
                    "Simple evening habits for better sleep.",
                    3,
                    True,
                ),
                (
                    "Preparing for exams without panic",
                    ResourceCategory.exam_anxiety,
                    "Plan study blocks and ask for help early.",
                    5,
                    True,
                ),
                (
                    "Box breathing",
                    ResourceCategory.breathing,
                    "A four-count breathing pattern you can use anywhere.",
                    2,
                    True,
                ),
                (
                    "Small self-care habits",
                    ResourceCategory.self_care,
                    "Low-effort routines that support mood.",
                    3,
                    True,
                ),
                (
                    "When to ask for professional support",
                    ResourceCategory.professional_support,
                    "Signs that talking to a psychologist might help.",
                    4,
                    False,
                ),
            ]
            for title, category, summary, minutes, published in resources:
                db.add(
                    Resource(
                        title=title,
                        category=category,
                        summary=summary,
                        body=[PLACEHOLDER],
                        source="MindBridge placeholder",
                        reading_minutes=minutes,
                        published=published,
                    )
                )

        if not db.scalar(select(Questionnaire).where(Questionnaire.name.like("Wellbeing check%"))):
            # Draft only: no reviewed questions exist yet (A-05). Students cannot see drafts.
            db.add(
                Questionnaire(
                    name="Wellbeing check (placeholder, not for use)",
                    version=1,
                    purpose="Placeholder. No reviewed instrument has been provided.",
                    approx_minutes=0,
                    status=QuestionnaireStatus.draft,
                )
            )

        if db.scalar(select(AuditLog.id)) is None:
            db.add(
                AuditLog(
                    actor_id=admin.id,
                    action="seed.created",
                    target_type="system",
                    target_id=None,
                    details={"note": "Demo data created"},
                )
            )

        db.commit()
        print("Demo data ready.")
        print("Administrator: admin@mindbridge.com (password from SEED_ADMIN_PASSWORD)")
        print("Demo accounts: student@, amara@, daniel@, mei@ mindbridge.demo (password from SEED_DEMO_PASSWORD)")
    finally:
        db.close()


if __name__ == "__main__":
    seed()
