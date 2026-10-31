import {
  localDateKey,
  isEmail,
  isMood,
  isValidSleep,
  isValidStress,
  MAX_JOURNAL_LENGTH,
  MAX_NOTE_LENGTH,
} from "../validation";
import type {
  Appointment,
  AppointmentStatus,
  ConsentScope,
  ManagedUser,
  Mood,
  Questionnaire,
  Resource,
  ResourceCategory,
  Role,
  Slot,
} from "../types";
import { RESOURCE_CATEGORIES } from "../types";
import type { AppState } from "./state";

// Pure business rules. The React store only calls these and persists the result.
// Every function takes the current state and returns a new state plus an outcome.
// Ownership is enforced here: every student-owned lookup is scoped by the acting user's id.

export type Outcome<T> = { ok: true; value: T } | { ok: false; error: string };
export type Step<T> = { state: AppState; outcome: Outcome<T> };

const ok = <T>(state: AppState, value: T): Step<T> => ({
  state,
  outcome: { ok: true, value },
});
const fail = <T>(state: AppState, error: string): Step<T> => ({
  state,
  outcome: { ok: false, error },
});

const MIN_SLOT_MINUTES = 15;
const MAX_SLOT_MINUTES = 240;
const DATE_KEY = /^\d{4}-\d{2}-\d{2}$/;
const TIME_KEY = /^([01]\d|2[0-3]):[0-5]\d$/;

export const toMinutes = (time: string) => {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
};

// Local-time start of a slot. Slots are stored as local calendar date plus local time (see A-07 / time-zone note).
export const slotStart = (slot: Pick<Slot, "date" | "startTime">) =>
  new Date(`${slot.date}T${slot.startTime}:00`);

const timeKey = (now: Date) =>
  `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;

export const overlaps = (
  a: { startTime: string; endTime: string },
  b: { startTime: string; endTime: string },
) =>
  toMinutes(a.startTime) < toMinutes(b.endTime) &&
  toMinutes(b.startTime) < toMinutes(a.endTime);

function notify(
  state: AppState,
  userId: string,
  title: string,
  body: string,
  now: Date,
): AppState {
  return {
    ...state,
    notifications: [
      {
        id: newId("note"),
        userId,
        at: now.toISOString(),
        title,
        body,
        read: false,
      },
      ...state.notifications,
    ],
  };
}

function audit(
  state: AppState,
  actorId: string,
  action: string,
  now: Date,
): AppState {
  const actor = state.users.find((u) => u.id === actorId);
  return {
    ...state,
    audit: [
      {
        id: newId("aud"),
        at: now.toISOString(),
        actorId,
        actor: actor?.name ?? "Unknown",
        action,
      },
      ...state.audit,
    ],
  };
}

let counter = 0;
export function newId(prefix: string): string {
  counter += 1;
  return `${prefix}-${Date.now().toString(36)}-${counter.toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
}

const isStudentActive = (state: AppState, userId: string) =>
  state.users.some(
    (u) => u.id === userId && u.role === "student" && u.status === "active",
  );

// ---------- accounts ----------

export function signUp(
  state: AppState,
  input: { name: string; email: string },
  now: Date,
): Step<ManagedUser> {
  const email = input.email.trim().toLowerCase();
  if (!input.name.trim()) return fail(state, "Enter your name.");
  if (!isEmail(email)) return fail(state, "Enter a valid email address.");
  if (state.users.some((u) => u.email === email))
    return fail(state, "An account with this email already exists.");
  const user: ManagedUser = {
    id: newId("user"),
    name: input.name.trim(),
    email,
    role: "student",
    status: "active",
    createdAt: now.toISOString(),
  };
  return ok({ ...state, users: [...state.users, user] }, user);
}

// Prototype sign-in: finds an existing account by email. There is no password check until the backend exists (Phase 4).
export function signIn(state: AppState, email: string): Step<ManagedUser> {
  const user = state.users.find((u) => u.email === email.trim().toLowerCase());
  if (!user)
    return fail(
      state,
      "No account was found for this email. Create an account first.",
    );
  if (user.status === "suspended")
    return fail(state, "This account is suspended. Please contact support.");
  return ok(state, user);
}

export function updateProfile(
  state: AppState,
  userId: string,
  input: { name: string; email: string },
): Step<ManagedUser> {
  const email = input.email.trim().toLowerCase();
  if (!input.name.trim()) return fail(state, "Enter your name.");
  if (!isEmail(email)) return fail(state, "Enter a valid email address.");
  if (state.users.some((u) => u.email === email && u.id !== userId))
    return fail(state, "That email is already in use.");
  const users = state.users.map((u) =>
    u.id === userId ? { ...u, name: input.name.trim(), email } : u,
  );
  return ok(
    { ...state, users },
    users.find((u) => u.id === userId)!,
  );
}

// Removes a student's own data. Psychologist and admin accounts are managed by an administrator.
export function deleteStudentAccount(
  state: AppState,
  userId: string,
): Step<true> {
  const user = state.users.find((u) => u.id === userId);
  if (!user) return fail(state, "Account not found.");
  if (user.role !== "student")
    return fail(
      state,
      "Professional and admin accounts are managed by an administrator.",
    );
  const freedSlotIds = state.appointments
    .filter((a) => a.studentId === userId && a.status !== "Cancelled")
    .map((a) => a.slotId);
  return ok(
    {
      ...state,
      users: state.users.filter((u) => u.id !== userId),
      moods: state.moods.filter((m) => m.ownerId !== userId),
      journal: state.journal.filter((j) => j.ownerId !== userId),
      questionnaireResults: state.questionnaireResults.filter(
        (r) => r.ownerId !== userId,
      ),
      consents: state.consents.filter((c) => c.studentId !== userId),
      notifications: state.notifications.filter((n) => n.userId !== userId),
      appointments: state.appointments.filter((a) => a.studentId !== userId),
      slots: state.slots.map((s) =>
        freedSlotIds.includes(s.id) ? { ...s, bookedBy: null } : s,
      ),
    },
    true,
  );
}

// ---------- mood / stress / sleep ----------

export type MoodInput = {
  mood: string;
  stress: number;
  sleepHours: number;
  note: string;
  recordedOn: string;
  recordedTime: string;
};

export function validateMoodInput(
  input: MoodInput,
  now: Date,
): Record<string, string> {
  const errors: Record<string, string> = {};
  if (!isMood(input.mood)) errors.mood = "Choose how you feel today.";
  if (!isValidStress(input.stress))
    errors.stress = "Stress must be a whole number from 1 to 10.";
  if (!isValidSleep(input.sleepHours))
    errors.sleepHours =
      "Sleep must be between 0 and 24 hours, in half-hour steps.";
  if (input.note.length > MAX_NOTE_LENGTH)
    errors.note = `Keep notes under ${MAX_NOTE_LENGTH} characters.`;
  if (!DATE_KEY.test(input.recordedOn))
    errors.recordedOn = "Enter a valid date.";
  else if (input.recordedOn > localDateKey(now))
    errors.recordedOn = "Choose today or an earlier date.";
  if (!TIME_KEY.test(input.recordedTime))
    errors.recordedTime = "Enter a valid time.";
  else if (
    input.recordedOn === localDateKey(now) &&
    input.recordedTime > timeKey(now)
  )
    errors.recordedTime = "Time cannot be in the future.";
  return errors;
}

export function addMood(
  state: AppState,
  ownerId: string,
  input: MoodInput,
  now: Date,
): Step<string> {
  const errors = validateMoodInput(input, now);
  if (Object.keys(errors).length) return fail(state, Object.values(errors)[0]);
  const id = newId("mood");
  const record = {
    id,
    ownerId,
    mood: input.mood as Mood,
    stress: input.stress,
    sleepHours: input.sleepHours,
    note: input.note.trim(),
    recordedOn: input.recordedOn,
    recordedTime: input.recordedTime,
  };
  return ok({ ...state, moods: [record, ...state.moods] }, id);
}

export function updateMood(
  state: AppState,
  ownerId: string,
  id: string,
  input: MoodInput,
  now: Date,
): Step<true> {
  const existing = state.moods.find(
    (m) => m.id === id && m.ownerId === ownerId,
  );
  if (!existing) return fail(state, "Record not found.");
  const errors = validateMoodInput(input, now);
  if (Object.keys(errors).length) return fail(state, Object.values(errors)[0]);
  const moods = state.moods.map((m) =>
    m.id === id
      ? {
          ...m,
          mood: input.mood as Mood,
          stress: input.stress,
          sleepHours: input.sleepHours,
          note: input.note.trim(),
          recordedOn: input.recordedOn,
          recordedTime: input.recordedTime,
        }
      : m,
  );
  return ok({ ...state, moods }, true);
}

export function deleteMood(
  state: AppState,
  ownerId: string,
  id: string,
): Step<true> {
  if (!state.moods.some((m) => m.id === id && m.ownerId === ownerId))
    return fail(state, "Record not found.");
  return ok(
    {
      ...state,
      moods: state.moods.filter((m) => !(m.id === id && m.ownerId === ownerId)),
    },
    true,
  );
}

// ---------- journal (private: only the owner can read or change entries) ----------

export function addJournal(
  state: AppState,
  ownerId: string,
  content: string,
  now: Date,
): Step<string> {
  const text = content.trim();
  if (!text) return fail(state, "Write something before saving.");
  if (text.length > MAX_JOURNAL_LENGTH)
    return fail(state, `Keep entries under ${MAX_JOURNAL_LENGTH} characters.`);
  const id = newId("jrn");
  const stamp = now.toISOString();
  return ok(
    {
      ...state,
      journal: [
        { id, ownerId, content: text, createdAt: stamp, updatedAt: stamp },
        ...state.journal,
      ],
    },
    id,
  );
}

export function updateJournal(
  state: AppState,
  ownerId: string,
  id: string,
  content: string,
  now: Date,
): Step<true> {
  const text = content.trim();
  if (!text) return fail(state, "Write something before saving.");
  if (text.length > MAX_JOURNAL_LENGTH)
    return fail(state, `Keep entries under ${MAX_JOURNAL_LENGTH} characters.`);
  if (!state.journal.some((j) => j.id === id && j.ownerId === ownerId))
    return fail(state, "Entry not found.");
  const journal = state.journal.map((j) =>
    j.id === id && j.ownerId === ownerId
      ? { ...j, content: text, updatedAt: now.toISOString() }
      : j,
  );
  return ok({ ...state, journal }, true);
}

export function deleteJournal(
  state: AppState,
  ownerId: string,
  id: string,
): Step<true> {
  if (!state.journal.some((j) => j.id === id && j.ownerId === ownerId))
    return fail(state, "Entry not found.");
  return ok(
    {
      ...state,
      journal: state.journal.filter(
        (j) => !(j.id === id && j.ownerId === ownerId),
      ),
    },
    true,
  );
}

// ---------- questionnaires ----------

export function saveQuestionnaireResult(
  state: AppState,
  ownerId: string,
  questionnaire: Questionnaire,
  answers: string[],
  now: Date,
): Step<string> {
  if (questionnaire.questions.length === 0)
    return fail(state, "This questionnaire is not available yet.");
  if (answers.length !== questionnaire.questions.length)
    return fail(state, "Answer every question before submitting.");
  if (answers.some((a) => !questionnaire.options.includes(a)))
    return fail(state, "One or more answers are not valid options.");
  const id = newId("qres");
  // No scoring is calculated: scoring rules need a reviewed instrument (A-05). Summary stays empty.
  const result = {
    id,
    ownerId,
    questionnaireId: questionnaire.id,
    questionnaireVersion: questionnaire.version,
    completedAt: now.toISOString(),
    answers,
    summary: "",
  };
  return ok(
    { ...state, questionnaireResults: [result, ...state.questionnaireResults] },
    id,
  );
}

// ---------- resources (admin) ----------

export type ResourceInput = Omit<Resource, "id" | "updatedAt"> & {
  id?: string;
};

export function validateResource(input: ResourceInput): string | null {
  if (!input.title.trim()) return "Enter a title.";
  if (!RESOURCE_CATEGORIES.includes(input.category as ResourceCategory))
    return "Choose a category.";
  if (!input.summary.trim()) return "Enter a short summary.";
  if (!input.source.trim()) return "Enter a source. Every resource needs one.";
  if (
    !Number.isInteger(input.readingMinutes) ||
    input.readingMinutes < 1 ||
    input.readingMinutes > 60
  )
    return "Reading time must be 1 to 60 minutes.";
  return null;
}

export function saveResource(
  state: AppState,
  adminId: string,
  input: ResourceInput,
  now: Date,
): Step<string> {
  const error = validateResource(input);
  if (error) return fail(state, error);
  const cleaned = {
    ...input,
    title: input.title.trim(),
    summary: input.summary.trim(),
    source: input.source.trim(),
    body: input.body.filter((p) => p.trim()),
  };
  if (input.id) {
    if (!state.resources.some((r) => r.id === input.id))
      return fail(state, "Resource not found.");
    const resources = state.resources.map((r) =>
      r.id === input.id
        ? { ...r, ...cleaned, updatedAt: now.toISOString() }
        : r,
    );
    return ok(
      audit(
        { ...state, resources },
        adminId,
        `Updated resource: ${cleaned.title}`,
        now,
      ),
      input.id,
    );
  }
  const id = newId("res");
  const resource: Resource = { ...cleaned, id, updatedAt: now.toISOString() };
  return ok(
    audit(
      { ...state, resources: [resource, ...state.resources] },
      adminId,
      `Added resource: ${cleaned.title}`,
      now,
    ),
    id,
  );
}

// ---------- platform settings and user management (admin) ----------

export function saveSettings(
  state: AppState,
  adminId: string,
  settings: { cancellationWindowHours: number },
  now: Date,
): Step<true> {
  const hours = settings.cancellationWindowHours;
  if (!Number.isInteger(hours) || hours < 0 || hours > 168)
    return fail(
      state,
      "Cancellation window must be a whole number of hours from 0 to 168.",
    );
  const next = audit(
    {
      ...state,
      settings: { ...state.settings, cancellationWindowHours: hours },
    },
    adminId,
    `Set cancellation window to ${hours} hours`,
    now,
  );
  return ok(next, true);
}

export function setUserStatus(
  state: AppState,
  adminId: string,
  userId: string,
  status: "active" | "suspended",
  now: Date,
): Step<true> {
  const target = state.users.find((u) => u.id === userId);
  if (!target) return fail(state, "User not found.");
  if (userId === adminId)
    return fail(state, "You cannot change the status of your own account.");
  if (target.role === "admin")
    return fail(
      state,
      "Administrator accounts cannot be suspended from this screen.",
    );
  const users = state.users.map((u) =>
    u.id === userId ? { ...u, status } : u,
  );
  return ok(
    audit(
      { ...state, users },
      adminId,
      `${status === "suspended" ? "Suspended" : "Reactivated"} account: ${target.email}`,
      now,
    ),
    true,
  );
}

// ---------- psychologist profiles and verification ----------

export type ProfileInput = {
  specialization: string;
  bio: string;
  experienceYears: number;
  fee: { amount: number; currency: string } | null;
  format: "Online" | "In person" | null;
};

export function updatePsychologistProfile(
  state: AppState,
  psychologistId: string,
  input: ProfileInput,
): Step<true> {
  if (!input.specialization.trim())
    return fail(state, "Enter your specialization.");
  if (
    !Number.isInteger(input.experienceYears) ||
    input.experienceYears < 0 ||
    input.experienceYears > 70
  )
    return fail(state, "Experience must be a whole number of years.");
  if (input.fee && (!Number.isFinite(input.fee.amount) || input.fee.amount < 0))
    return fail(state, "Fee must be zero or more.");
  const psychologists = state.psychologists.map((p) =>
    p.id === psychologistId
      ? {
          ...p,
          specialization: input.specialization.trim(),
          bio: input.bio.trim(),
          experienceYears: input.experienceYears,
          fee: input.fee,
          format: input.format,
        }
      : p,
  );
  return ok({ ...state, psychologists }, true);
}

export function submitQualification(
  state: AppState,
  psychologistId: string,
  input: { title: string; institution: string; year: number },
  now: Date,
): Step<string> {
  if (!input.title.trim())
    return fail(state, "Enter the qualification or registration title.");
  if (!input.institution.trim())
    return fail(state, "Enter the awarding institution or registering body.");
  const thisYear = now.getFullYear();
  if (
    !Number.isInteger(input.year) ||
    input.year < 1950 ||
    input.year > thisYear
  )
    return fail(state, `Year must be between 1950 and ${thisYear}.`);
  const id = newId("qual");
  const psychologists = state.psychologists.map((p) =>
    p.id === psychologistId
      ? {
          ...p,
          qualifications: [
            ...p.qualifications,
            {
              id,
              title: input.title.trim(),
              institution: input.institution.trim(),
              year: input.year,
              status: "Submitted" as const,
            },
          ],
        }
      : p,
  );
  return ok({ ...state, psychologists }, id);
}

export function setQualificationStatus(
  state: AppState,
  adminId: string,
  psychologistId: string,
  qualificationId: string,
  status: "Verified" | "Rejected",
  now: Date,
): Step<true> {
  const psych = state.psychologists.find((p) => p.id === psychologistId);
  if (!psych || !psych.qualifications.some((q) => q.id === qualificationId))
    return fail(state, "Qualification not found.");
  const psychologists = state.psychologists.map((p) =>
    p.id === psychologistId
      ? {
          ...p,
          qualifications: p.qualifications.map((q) =>
            q.id === qualificationId ? { ...q, status } : q,
          ),
        }
      : p,
  );
  const label = psych.qualifications.find(
    (q) => q.id === qualificationId,
  )!.title;
  return ok(
    audit(
      { ...state, psychologists },
      adminId,
      `${status} qualification "${label}" for ${psych.name}`,
      now,
    ),
    true,
  );
}

export function setPsychologistVerified(
  state: AppState,
  adminId: string,
  psychologistId: string,
  verified: boolean,
  now: Date,
): Step<true> {
  const psych = state.psychologists.find((p) => p.id === psychologistId);
  if (!psych) return fail(state, "Psychologist not found.");
  const psychologists = state.psychologists.map((p) =>
    p.id === psychologistId ? { ...p, verified } : p,
  );
  return ok(
    audit(
      { ...state, psychologists },
      adminId,
      `${verified ? "Verified credentials" : "Removed verification"}: ${psych.name}`,
      now,
    ),
    true,
  );
}

export function setProfilePublished(
  state: AppState,
  adminId: string,
  psychologistId: string,
  published: boolean,
  now: Date,
): Step<true> {
  const psych = state.psychologists.find((p) => p.id === psychologistId);
  if (!psych) return fail(state, "Psychologist not found.");
  if (published && !psych.verified)
    return fail(state, "Verify credentials before publishing a profile.");
  const psychologists = state.psychologists.map((p) =>
    p.id === psychologistId ? { ...p, approvedProfile: published } : p,
  );
  return ok(
    audit(
      { ...state, psychologists },
      adminId,
      `${published ? "Published" : "Hid"} profile: ${psych.name}`,
      now,
    ),
    true,
  );
}

// ---------- availability ----------

export function addSlot(
  state: AppState,
  psychologistId: string,
  input: { date: string; startTime: string; endTime: string },
  now: Date,
): Step<string> {
  if (!DATE_KEY.test(input.date)) return fail(state, "Enter a valid date.");
  if (!TIME_KEY.test(input.startTime) || !TIME_KEY.test(input.endTime))
    return fail(state, "Enter valid start and end times.");
  if (input.date < localDateKey(now))
    return fail(state, "Slots cannot be added for past dates.");
  const duration = toMinutes(input.endTime) - toMinutes(input.startTime);
  if (duration <= 0)
    return fail(state, "The end time must be after the start time.");
  if (duration < MIN_SLOT_MINUTES || duration > MAX_SLOT_MINUTES)
    return fail(state, "A slot must be between 15 minutes and 4 hours.");
  if (input.date === localDateKey(now) && input.startTime <= timeKey(now))
    return fail(state, "That time has already passed today.");
  const clash = state.slots.find(
    (s) =>
      s.psychologistId === psychologistId &&
      s.date === input.date &&
      overlaps(s, input),
  );
  if (clash)
    return fail(
      state,
      `This overlaps your existing time ${clash.startTime} – ${clash.endTime}.`,
    );
  const id = newId("slot");
  const slot: Slot = {
    id,
    psychologistId,
    date: input.date,
    startTime: input.startTime,
    endTime: input.endTime,
    bookedBy: null,
  };
  return ok({ ...state, slots: [...state.slots, slot] }, id);
}

export function removeSlot(
  state: AppState,
  psychologistId: string,
  slotId: string,
): Step<true> {
  const slot = state.slots.find(
    (s) => s.id === slotId && s.psychologistId === psychologistId,
  );
  if (!slot) return fail(state, "Time not found.");
  if (slot.bookedBy)
    return fail(
      state,
      "Booked times cannot be removed. Cancel the appointment first.",
    );
  return ok(
    { ...state, slots: state.slots.filter((s) => s.id !== slotId) },
    true,
  );
}

// ---------- booking and appointments ----------

export function bookSlot(
  state: AppState,
  studentId: string,
  slotId: string,
  now: Date,
): Step<string> {
  if (!isStudentActive(state, studentId))
    return fail(state, "Your account is not allowed to book appointments.");
  const slot = state.slots.find((s) => s.id === slotId);
  if (!slot) return fail(state, "Slot not found.");
  const psych = state.psychologists.find((p) => p.id === slot.psychologistId);
  if (!psych || !psych.approvedProfile)
    return fail(state, "This psychologist is not accepting bookings.");
  // VR-06 / VR-08: availability is checked against the current state, inside the same pure step.
  if (slot.bookedBy)
    return fail(
      state,
      "That time has just been taken. Please choose another time.",
    );
  if (slotStart(slot).getTime() <= now.getTime())
    return fail(state, "That time has already passed.");

  const id = newId("apt");
  const stamp = now.toISOString();
  const appointment: Appointment = {
    id,
    slotId,
    psychologistId: slot.psychologistId,
    studentId,
    status: "Pending",
    createdAt: stamp,
    updatedAt: stamp,
  };
  const slots = state.slots.map((s) =>
    s.id === slotId ? { ...s, bookedBy: studentId } : s,
  );
  let next: AppState = {
    ...state,
    slots,
    appointments: [appointment, ...state.appointments],
  };
  next = notify(
    next,
    studentId,
    "Appointment requested",
    `Your request with ${psych.name} on ${slot.date} at ${slot.startTime} is waiting for confirmation.`,
    now,
  );
  next = notify(
    next,
    psych.userId,
    "New appointment request",
    `A student has requested ${slot.date} at ${slot.startTime}. Please confirm or cancel.`,
    now,
  );
  return ok(next, id);
}

const ACTIVE: AppointmentStatus[] = ["Pending", "Confirmed"];

export type Actor = { userId: string; role: Role };

// Students may cancel only up to the configured window before the start. Psychologists may cancel any upcoming booking.
export function cancelAppointment(
  state: AppState,
  actor: Actor,
  appointmentId: string,
  now: Date,
): Step<true> {
  const appt = state.appointments.find((a) => a.id === appointmentId);
  if (!appt) return fail(state, "Appointment not found.");
  const psych = state.psychologists.find((p) => p.id === appt.psychologistId)!;
  const isStudentOwner =
    actor.role === "student" && appt.studentId === actor.userId;
  const isPsychologistOwner =
    actor.role === "psychologist" && psych.userId === actor.userId;
  if (!isStudentOwner && !isPsychologistOwner)
    return fail(state, "You can only cancel your own appointments.");
  if (!ACTIVE.includes(appt.status))
    return fail(
      state,
      `This appointment is already ${appt.status.toLowerCase()}.`,
    );
  const slot = state.slots.find((s) => s.id === appt.slotId)!;
  if (slotStart(slot).getTime() <= now.getTime())
    return fail(state, "Past appointments cannot be cancelled.");
  if (isStudentOwner) {
    const windowMs = state.settings.cancellationWindowHours * 3600_000;
    if (slotStart(slot).getTime() - now.getTime() < windowMs) {
      return fail(
        state,
        `Cancellation is only possible up to ${state.settings.cancellationWindowHours} hours before the appointment.`,
      );
    }
  }
  const stamp = now.toISOString();
  const appointments = state.appointments.map((a) =>
    a.id === appointmentId
      ? { ...a, status: "Cancelled" as const, updatedAt: stamp }
      : a,
  );
  const slots = state.slots.map((s) =>
    s.id === appt.slotId ? { ...s, bookedBy: null } : s,
  );
  let next: AppState = { ...state, appointments, slots };
  const otherParty = isStudentOwner ? psych.userId : appt.studentId;
  next = notify(
    next,
    otherParty,
    "Appointment cancelled",
    `An appointment on ${slot.date} at ${slot.startTime} has been cancelled.`,
    now,
  );
  return ok(next, true);
}

const TRANSITIONS: Record<AppointmentStatus, AppointmentStatus[]> = {
  Pending: ["Confirmed", "Cancelled"],
  Confirmed: ["Completed", "Cancelled"],
  Completed: [],
  Cancelled: [],
};

// Psychologist-side status changes. Cancelling goes through cancelAppointment so the same rules apply.
export function setAppointmentStatus(
  state: AppState,
  psychologistUserId: string,
  appointmentId: string,
  next: AppointmentStatus,
  now: Date,
): Step<true> {
  const appt = state.appointments.find((a) => a.id === appointmentId);
  if (!appt) return fail(state, "Appointment not found.");
  const psych = state.psychologists.find((p) => p.id === appt.psychologistId);
  if (!psych || psych.userId !== psychologistUserId)
    return fail(state, "You can only manage your own appointments.");
  if (next === "Cancelled")
    return cancelAppointment(
      state,
      { userId: psychologistUserId, role: "psychologist" },
      appointmentId,
      now,
    );
  if (!TRANSITIONS[appt.status].includes(next))
    return fail(
      state,
      `Cannot change an appointment from ${appt.status} to ${next}.`,
    );
  const slot = state.slots.find((s) => s.id === appt.slotId)!;
  if (next === "Completed" && slotStart(slot).getTime() > now.getTime())
    return fail(
      state,
      "An appointment can only be completed after it has started.",
    );
  const stamp = now.toISOString();
  const appointments = state.appointments.map((a) =>
    a.id === appointmentId ? { ...a, status: next, updatedAt: stamp } : a,
  );
  let out: AppState = { ...state, appointments };
  out = notify(
    out,
    appt.studentId,
    `Appointment ${next.toLowerCase()}`,
    `Your appointment on ${slot.date} at ${slot.startTime} is now ${next.toLowerCase()}.`,
    now,
  );
  return ok(out, true);
}

// ---------- consent ----------

export function setConsent(
  state: AppState,
  studentId: string,
  scope: ConsentScope,
  recipientId: string,
  granted: boolean,
  now: Date,
): Step<true> {
  const psych = state.psychologists.find((p) => p.id === recipientId);
  if (!psych || !psych.approvedProfile)
    return fail(
      state,
      "You can only share information with a listed psychologist.",
    );
  const rest = state.consents.filter(
    (c) =>
      !(
        c.studentId === studentId &&
        c.scope === scope &&
        c.recipientId === recipientId
      ),
  );
  return ok(
    {
      ...state,
      consents: [
        ...rest,
        {
          studentId,
          scope,
          recipientId,
          granted,
          updatedAt: now.toISOString(),
        },
      ],
    },
    true,
  );
}

// Whether a psychologist may see a student's data of the given scope. Used for least-privilege views.
export function hasConsent(
  state: AppState,
  studentId: string,
  scope: ConsentScope,
  psychologistId: string,
): boolean {
  return state.consents.some(
    (c) =>
      c.studentId === studentId &&
      c.scope === scope &&
      c.recipientId === psychologistId &&
      c.granted,
  );
}

// ---------- notifications ----------

export function markNotificationsRead(
  state: AppState,
  userId: string,
): AppState {
  return {
    ...state,
    notifications: state.notifications.map((n) =>
      n.userId === userId ? { ...n, read: true } : n,
    ),
  };
}
