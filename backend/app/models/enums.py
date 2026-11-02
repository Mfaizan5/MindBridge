import enum


def _values(enum_cls: type[enum.Enum]) -> list[str]:
    """Store the enum's text value in PostgreSQL, so migrations and raw SQL stay readable."""
    return [member.value for member in enum_cls]


class Role(enum.StrEnum):
    student = "student"
    psychologist = "psychologist"
    admin = "admin"


class UserStatus(enum.StrEnum):
    active = "active"
    suspended = "suspended"


class Mood(enum.StrEnum):
    happy = "Happy"
    okay = "Okay"
    low = "Low"
    anxious = "Anxious"
    stressed = "Stressed"


class QualificationStatus(enum.StrEnum):
    submitted = "Submitted"
    verified = "Verified"
    rejected = "Rejected"


class AppointmentStatus(enum.StrEnum):
    pending = "Pending"
    confirmed = "Confirmed"
    completed = "Completed"
    cancelled = "Cancelled"


class ConsentScope(enum.StrEnum):
    mood_records = "Mood records"
    questionnaire_results = "Questionnaire results"
    appointment_history = "Appointment history"


class ResourceCategory(enum.StrEnum):
    stress = "Stress"
    sleep = "Sleep"
    exam_anxiety = "Exam anxiety"
    breathing = "Breathing"
    self_care = "Self-care"
    professional_support = "Professional support"


class ConsultationFormat(enum.StrEnum):
    online = "Online"
    in_person = "In person"


class QuestionnaireStatus(enum.StrEnum):
    draft = "draft"
    approved = "approved"


ENUM_VALUES = _values
