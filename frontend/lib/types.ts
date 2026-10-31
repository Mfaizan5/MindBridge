export type Role = "student" | "psychologist" | "admin";

export const MOOD_OPTIONS = [
  "Happy",
  "Okay",
  "Low",
  "Anxious",
  "Stressed",
] as const;
export type Mood = (typeof MOOD_OPTIONS)[number];

export type UserStatus = "active" | "suspended";

// Accounts. No password is stored in the frontend; real credentials arrive with the backend (Phase 4).
export type ManagedUser = {
  id: string;
  name: string;
  email: string;
  role: Role;
  status: UserStatus;
  createdAt: string;
};

// Every student-owned record carries ownerId. Reads are filtered by the signed-in user.
export type MoodRecord = {
  id: string;
  ownerId: string;
  mood: Mood;
  stress: number;
  sleepHours: number;
  note: string;
  recordedOn: string; // YYYY-MM-DD, local calendar date
  recordedTime: string; // HH:mm, local time
};

export type JournalEntry = {
  id: string;
  ownerId: string;
  content: string;
  createdAt: string;
  updatedAt: string;
};

export const RESOURCE_CATEGORIES = [
  "Stress",
  "Sleep",
  "Exam anxiety",
  "Breathing",
  "Self-care",
  "Professional support",
] as const;
export type ResourceCategory = (typeof RESOURCE_CATEGORIES)[number];

export type Resource = {
  id: string;
  title: string;
  category: ResourceCategory;
  summary: string;
  body: string[];
  source: string;
  readingMinutes: number;
  published: boolean;
  updatedAt: string;
};

export type Questionnaire = {
  id: string;
  name: string;
  version: number;
  purpose: string;
  approxMinutes: number;
  options: string[];
  questions: string[];
};

export type QuestionnaireResult = {
  id: string;
  ownerId: string;
  questionnaireId: string;
  questionnaireVersion: number;
  completedAt: string;
  answers: string[];
  summary: string;
};

export type QualificationStatus = "Submitted" | "Verified" | "Rejected";

export type Qualification = {
  id: string;
  title: string;
  institution: string;
  year: number;
  status: QualificationStatus;
};

export type Psychologist = {
  id: string;
  userId: string;
  name: string;
  qualifications: Qualification[];
  specialization: string;
  experienceYears: number;
  bio: string;
  verified: boolean;
  approvedProfile: boolean;
  fee: { amount: number; currency: string } | null;
  format: "Online" | "In person" | null;
};

export type Slot = {
  id: string;
  psychologistId: string;
  date: string; // YYYY-MM-DD
  startTime: string; // HH:mm
  endTime: string; // HH:mm
  bookedBy: string | null; // student user id
};

export type AppointmentStatus =
  "Pending" | "Confirmed" | "Completed" | "Cancelled";

export type Appointment = {
  id: string;
  slotId: string;
  psychologistId: string;
  studentId: string;
  status: AppointmentStatus;
  createdAt: string;
  updatedAt: string;
};

export type ConsentScope =
  "Mood records" | "Questionnaire results" | "Appointment history";

export type Consent = {
  studentId: string;
  scope: ConsentScope;
  recipientId: string; // psychologist profile id
  granted: boolean;
  updatedAt: string;
};

export type Notification = {
  id: string;
  userId: string;
  at: string;
  title: string;
  body: string;
  read: boolean;
};

export type AuditEntry = {
  id: string;
  at: string;
  actorId: string;
  actor: string;
  action: string;
};

export type PlatformSettings = {
  // A-15 placeholder: cancellation allowed until this many hours before the appointment.
  cancellationWindowHours: number;
};

export const CONSENT_SCOPES = [
  "Mood records",
  "Questionnaire results",
  "Appointment history",
] as const satisfies readonly ConsentScope[];
