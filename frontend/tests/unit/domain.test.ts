import { describe, expect, it } from "vitest";
import * as d from "@/lib/domain/actions";
import { createSeedState, type AppState } from "@/lib/domain/state";
import {
  DEMO_PSYCHOLOGIST_ID,
  DEMO_PSYCHOLOGIST_USER_ID,
  DEMO_STUDENT_ID,
  DEMO_ADMIN_ID,
} from "@/lib/seed";

// Fixed "now" so every test is deterministic: 1 Nov 2026, 10:00 local time.
const NOW = new Date(2026, 10, 1, 10, 0);
const TODAY = "2026-11-01";

const fresh = (): AppState => createSeedState(TODAY);

const moodInput = (overrides: Partial<d.MoodInput> = {}): d.MoodInput => ({
  mood: "Happy",
  stress: 4,
  sleepHours: 7.5,
  note: "",
  recordedOn: TODAY,
  recordedTime: "09:00",
  ...overrides,
});

// Helper: a student account with an upcoming Pending appointment on the first demo slot.
const withStudentBooking = (
  state: AppState,
  slotId = `${DEMO_PSYCHOLOGIST_ID}-2026-11-02-09:00`,
) => {
  const step = d.bookSlot(state, DEMO_STUDENT_ID, slotId, NOW);
  if (!step.outcome.ok)
    throw new Error(`setup booking failed: ${step.outcome.error}`);
  return { state: step.state, appointmentId: step.outcome.value };
};

describe("accounts", () => {
  it("creates a student account and rejects a duplicate email", () => {
    const first = d.signUp(
      fresh(),
      { name: "Ada", email: "Ada@Example.com" },
      NOW,
    );
    expect(first.outcome.ok).toBe(true);
    if (first.outcome.ok)
      expect(first.outcome.value.email).toBe("ada@example.com");
    const second = d.signUp(
      first.state,
      { name: "Ada again", email: "ada@example.com" },
      NOW,
    );
    expect(second.outcome).toEqual({
      ok: false,
      error: "An account with this email already exists.",
    });
  });

  it("refuses to sign in to a suspended account", () => {
    const result = d.signIn(fresh(), "suspended@mindbridge.demo");
    expect(result.outcome.ok).toBe(false);
  });

  it("rejects an unknown email at sign-in", () => {
    expect(d.signIn(fresh(), "nobody@example.com").outcome.ok).toBe(false);
  });

  it("does not let an administrator suspend their own account", () => {
    const step = d.setUserStatus(
      fresh(),
      DEMO_ADMIN_ID,
      DEMO_ADMIN_ID,
      "suspended",
      NOW,
    );
    expect(step.outcome.ok).toBe(false);
  });

  it("deletes a student's data and frees their booked slots", () => {
    let state = fresh();
    state = d.addJournal(state, DEMO_STUDENT_ID, "private", NOW).state;
    state = withStudentBooking(state).state;
    const step = d.deleteStudentAccount(state, DEMO_STUDENT_ID);
    expect(step.outcome.ok).toBe(true);
    expect(step.state.journal.some((j) => j.ownerId === DEMO_STUDENT_ID)).toBe(
      false,
    );
    expect(
      step.state.appointments.some((a) => a.studentId === DEMO_STUDENT_ID),
    ).toBe(false);
    expect(step.state.slots.some((s) => s.bookedBy === DEMO_STUDENT_ID)).toBe(
      false,
    );
  });
});

describe("mood, stress and sleep records", () => {
  it("saves a valid check-in for its owner", () => {
    const step = d.addMood(fresh(), DEMO_STUDENT_ID, moodInput(), NOW);
    expect(step.outcome.ok).toBe(true);
    expect(
      step.state.moods.find(
        (m) => m.id === (step.outcome.ok ? step.outcome.value : ""),
      )?.ownerId,
    ).toBe(DEMO_STUDENT_ID);
  });

  it.each([
    [{ stress: 0 }, "Stress must be a whole number from 1 to 10."],
    [{ stress: 5.5 }, "Stress must be a whole number from 1 to 10."],
    [
      { sleepHours: 25 },
      "Sleep must be between 0 and 24 hours, in half-hour steps.",
    ],
    [
      { sleepHours: 7.25 },
      "Sleep must be between 0 and 24 hours, in half-hour steps.",
    ],
    [{ mood: "Elated" }, "Choose how you feel today."],
    [{ recordedOn: "2026-11-02" }, "Choose today or an earlier date."],
    [{ recordedTime: "11:00" }, "Time cannot be in the future."],
  ])("rejects invalid input %j", (override, message) => {
    const step = d.addMood(
      fresh(),
      DEMO_STUDENT_ID,
      moodInput(override as Partial<d.MoodInput>),
      NOW,
    );
    expect(step.outcome).toEqual({ ok: false, error: message });
  });

  it("does not let another user change or delete someone else's record", () => {
    const seeded = fresh();
    const target = seeded.moods[0];
    const update = d.updateMood(
      seeded,
      "user-someone-else",
      target.id,
      moodInput(),
      NOW,
    );
    const remove = d.deleteMood(seeded, "user-someone-else", target.id);
    expect(update.outcome.ok).toBe(false);
    expect(remove.outcome.ok).toBe(false);
    expect(remove.state.moods).toHaveLength(seeded.moods.length);
  });
});

describe("private journal", () => {
  it("is visible only to its owner: other users cannot edit or delete an entry", () => {
    const saved = d.addJournal(
      fresh(),
      DEMO_STUDENT_ID,
      "Thoughts about exams",
      NOW,
    );
    const id = saved.outcome.ok ? saved.outcome.value : "";
    expect(
      d.updateJournal(saved.state, "user-other", id, "changed", NOW).outcome.ok,
    ).toBe(false);
    expect(d.deleteJournal(saved.state, "user-other", id).outcome.ok).toBe(
      false,
    );
    expect(saved.state.journal.find((j) => j.id === id)?.content).toBe(
      "Thoughts about exams",
    );
  });

  it("rejects empty entries", () => {
    expect(d.addJournal(fresh(), DEMO_STUDENT_ID, "   ", NOW).outcome.ok).toBe(
      false,
    );
  });
});

describe("booking", () => {
  it("books an open slot as Pending and marks it taken", () => {
    const { state, appointmentId } = withStudentBooking(fresh());
    const appt = state.appointments.find((a) => a.id === appointmentId);
    expect(appt?.status).toBe("Pending");
    expect(state.slots.find((s) => s.id === appt?.slotId)?.bookedBy).toBe(
      DEMO_STUDENT_ID,
    );
  });

  it("prevents double-booking the same slot by a second student", () => {
    const slotId = `${DEMO_PSYCHOLOGIST_ID}-2026-11-02-09:00`;
    const base = withStudentBooking(fresh(), slotId).state;
    const secondStudent = {
      id: "user-second-student",
      name: "Second",
      email: "second@example.com",
      role: "student" as const,
      status: "active" as const,
      createdAt: NOW.toISOString(),
    };
    const state = { ...base, users: [...base.users, secondStudent] };
    const second = d.bookSlot(state, secondStudent.id, slotId, NOW);
    expect(second.outcome).toEqual({
      ok: false,
      error: "That time has just been taken. Please choose another time.",
    });
    expect(second.state.slots.find((x) => x.id === slotId)?.bookedBy).toBe(
      DEMO_STUDENT_ID,
    );
    expect(second.state.appointments).toHaveLength(1);
  });

  it("refuses slots that have already started", () => {
    const later = new Date(2026, 10, 2, 9, 30);
    const step = d.bookSlot(
      fresh(),
      DEMO_STUDENT_ID,
      `${DEMO_PSYCHOLOGIST_ID}-2026-11-02-09:00`,
      later,
    );
    expect(step.outcome).toEqual({
      ok: false,
      error: "That time has already passed.",
    });
  });

  it("refuses bookings with a psychologist whose profile is not published", () => {
    const state = fresh();
    const hidden = state.psychologists.find((p) => p.id === "psy-mei");
    expect(hidden?.approvedProfile).toBe(false);
    const slot = {
      id: "slot-hidden",
      psychologistId: "psy-mei",
      date: "2026-11-03",
      startTime: "09:00",
      endTime: "09:50",
      bookedBy: null,
    };
    const step = d.bookSlot(
      { ...state, slots: [...state.slots, slot] },
      DEMO_STUDENT_ID,
      "slot-hidden",
      NOW,
    );
    expect(step.outcome.ok).toBe(false);
  });

  it("refuses bookings from a suspended student", () => {
    const state = fresh();
    const suspended = state.users.find((u) => u.status === "suspended")!;
    const step = d.bookSlot(
      state,
      suspended.id,
      `${DEMO_PSYCHOLOGIST_ID}-2026-11-02-09:00`,
      NOW,
    );
    expect(step.outcome.ok).toBe(false);
  });
});

// 3 Nov 09:00 is 47 hours after NOW, which is outside the 24-hour cancellation window.
const FAR_SLOT = `${DEMO_PSYCHOLOGIST_ID}-2026-11-03-09:00`;

describe("cancellation", () => {
  it("lets a student cancel more than the configured window before the appointment", () => {
    const { state, appointmentId } = withStudentBooking(fresh(), FAR_SLOT);
    const step = d.cancelAppointment(
      state,
      { userId: DEMO_STUDENT_ID, role: "student" },
      appointmentId,
      NOW,
    );
    expect(step.outcome.ok).toBe(true);
    expect(
      step.state.appointments.find((a) => a.id === appointmentId)?.status,
    ).toBe("Cancelled");
    expect(
      step.state.slots.find((s) => s.id === state.appointments[0].slotId)
        ?.bookedBy,
    ).toBeNull();
  });

  it("stops a student cancelling inside the cancellation window", () => {
    const { state, appointmentId } = withStudentBooking(fresh());
    const tooLate = new Date(2026, 10, 2, 0, 0); // 9 hours before the 09:00 slot, window is 24 hours
    const step = d.cancelAppointment(
      state,
      { userId: DEMO_STUDENT_ID, role: "student" },
      appointmentId,
      tooLate,
    );
    expect(step.outcome.ok).toBe(false);
    expect(step.state.appointments[0].status).toBe("Pending");
  });

  it("lets the booked psychologist cancel regardless of the window", () => {
    const { state, appointmentId } = withStudentBooking(fresh());
    const tooLate = new Date(2026, 10, 2, 0, 0);
    const step = d.cancelAppointment(
      state,
      { userId: DEMO_PSYCHOLOGIST_USER_ID, role: "psychologist" },
      appointmentId,
      tooLate,
    );
    expect(step.outcome.ok).toBe(true);
  });

  it("stops another student cancelling someone else's appointment", () => {
    const { state, appointmentId } = withStudentBooking(fresh());
    const step = d.cancelAppointment(
      state,
      { userId: "user-other-student", role: "student" },
      appointmentId,
      NOW,
    );
    expect(step.outcome.ok).toBe(false);
  });

  it("notifies the other party when an appointment is cancelled", () => {
    const { state, appointmentId } = withStudentBooking(fresh(), FAR_SLOT);
    const step = d.cancelAppointment(
      state,
      { userId: DEMO_STUDENT_ID, role: "student" },
      appointmentId,
      NOW,
    );
    expect(
      step.state.notifications.some(
        (n) =>
          n.userId === DEMO_PSYCHOLOGIST_USER_ID &&
          n.title === "Appointment cancelled",
      ),
    ).toBe(true);
  });
});

describe("appointment status transitions", () => {
  it("moves Pending to Confirmed when the psychologist confirms", () => {
    const { state, appointmentId } = withStudentBooking(fresh());
    const step = d.setAppointmentStatus(
      state,
      DEMO_PSYCHOLOGIST_USER_ID,
      appointmentId,
      "Confirmed",
      NOW,
    );
    expect(step.outcome.ok).toBe(true);
    expect(step.state.appointments[0].status).toBe("Confirmed");
  });

  it("refuses to skip from Pending straight to Completed", () => {
    const { state, appointmentId } = withStudentBooking(fresh());
    const step = d.setAppointmentStatus(
      state,
      DEMO_PSYCHOLOGIST_USER_ID,
      appointmentId,
      "Completed",
      new Date(2026, 10, 3, 12, 0),
    );
    expect(step.outcome.ok).toBe(false);
  });

  it("refuses to complete an appointment before it starts", () => {
    const { state, appointmentId } = withStudentBooking(fresh());
    const confirmed = d.setAppointmentStatus(
      state,
      DEMO_PSYCHOLOGIST_USER_ID,
      appointmentId,
      "Confirmed",
      NOW,
    ).state;
    const early = d.setAppointmentStatus(
      confirmed,
      DEMO_PSYCHOLOGIST_USER_ID,
      appointmentId,
      "Completed",
      NOW,
    );
    expect(early.outcome.ok).toBe(false);
  });

  it("does not let a psychologist change another psychologist's appointment", () => {
    const { state, appointmentId } = withStudentBooking(fresh());
    const step = d.setAppointmentStatus(
      state,
      "user-demo-psychologist-2",
      appointmentId,
      "Confirmed",
      NOW,
    );
    expect(step.outcome.ok).toBe(false);
  });
});

describe("availability", () => {
  it("adds a valid slot", () => {
    const step = d.addSlot(
      fresh(),
      DEMO_PSYCHOLOGIST_ID,
      { date: "2026-11-10", startTime: "11:00", endTime: "11:50" },
      NOW,
    );
    expect(step.outcome.ok).toBe(true);
  });

  it("rejects overlapping slots for the same psychologist and date", () => {
    const step = d.addSlot(
      fresh(),
      DEMO_PSYCHOLOGIST_ID,
      { date: "2026-11-02", startTime: "09:30", endTime: "10:30" },
      NOW,
    );
    expect(step.outcome.ok).toBe(false);
    expect(step.outcome.ok === false && step.outcome.error).toMatch(/overlaps/);
  });

  it("allows back-to-back slots that do not overlap", () => {
    // Existing demo slot 14:00–14:50 on 2 Nov, so a slot starting exactly at 14:50 touches but does not overlap.
    const step = d.addSlot(
      fresh(),
      DEMO_PSYCHOLOGIST_ID,
      { date: "2026-11-02", startTime: "14:50", endTime: "15:40" },
      NOW,
    );
    expect(step.outcome.ok).toBe(true);
  });

  it("rejects end-before-start, past dates, and out-of-range durations", () => {
    const s = fresh();
    expect(
      d.addSlot(
        s,
        DEMO_PSYCHOLOGIST_ID,
        { date: "2026-11-10", startTime: "11:00", endTime: "10:00" },
        NOW,
      ).outcome.ok,
    ).toBe(false);
    expect(
      d.addSlot(
        s,
        DEMO_PSYCHOLOGIST_ID,
        { date: "2026-10-30", startTime: "11:00", endTime: "11:30" },
        NOW,
      ).outcome.ok,
    ).toBe(false);
    expect(
      d.addSlot(
        s,
        DEMO_PSYCHOLOGIST_ID,
        { date: "2026-11-10", startTime: "11:00", endTime: "11:05" },
        NOW,
      ).outcome.ok,
    ).toBe(false);
    expect(
      d.addSlot(
        s,
        DEMO_PSYCHOLOGIST_ID,
        { date: "2026-11-10", startTime: "08:00", endTime: "13:00" },
        NOW,
      ).outcome.ok,
    ).toBe(false);
  });

  it("refuses to remove a booked slot", () => {
    const { state } = withStudentBooking(fresh());
    const booked = state.slots.find((s) => s.bookedBy === DEMO_STUDENT_ID)!;
    expect(
      d.removeSlot(state, DEMO_PSYCHOLOGIST_ID, booked.id).outcome.ok,
    ).toBe(false);
  });
});

describe("consent", () => {
  it("records consent for a published psychologist and reports it", () => {
    const step = d.setConsent(
      fresh(),
      DEMO_STUDENT_ID,
      "Appointment history",
      DEMO_PSYCHOLOGIST_ID,
      true,
      NOW,
    );
    expect(step.outcome.ok).toBe(true);
    expect(
      d.hasConsent(
        step.state,
        DEMO_STUDENT_ID,
        "Appointment history",
        DEMO_PSYCHOLOGIST_ID,
      ),
    ).toBe(true);
  });

  it("does not grant access when consent is withdrawn", () => {
    const granted = d.setConsent(
      fresh(),
      DEMO_STUDENT_ID,
      "Mood records",
      DEMO_PSYCHOLOGIST_ID,
      true,
      NOW,
    ).state;
    const withdrawn = d.setConsent(
      granted,
      DEMO_STUDENT_ID,
      "Mood records",
      DEMO_PSYCHOLOGIST_ID,
      false,
      NOW,
    ).state;
    expect(
      d.hasConsent(
        withdrawn,
        DEMO_STUDENT_ID,
        "Mood records",
        DEMO_PSYCHOLOGIST_ID,
      ),
    ).toBe(false);
  });

  it("refuses consent for a psychologist who is not published", () => {
    expect(
      d.setConsent(
        fresh(),
        DEMO_STUDENT_ID,
        "Mood records",
        "psy-mei",
        true,
        NOW,
      ).outcome.ok,
    ).toBe(false);
  });

  it("does not let another student's consent affect this student", () => {
    const granted = d.setConsent(
      fresh(),
      "user-other-student",
      "Mood records",
      DEMO_PSYCHOLOGIST_ID,
      true,
      NOW,
    ).state;
    expect(
      d.hasConsent(
        granted,
        DEMO_STUDENT_ID,
        "Mood records",
        DEMO_PSYCHOLOGIST_ID,
      ),
    ).toBe(false);
  });
});

describe("verification and administration", () => {
  it("cannot publish a profile that has not been verified", () => {
    const state = fresh();
    const step = d.setProfilePublished(
      state,
      DEMO_ADMIN_ID,
      "psy-mei",
      true,
      NOW,
    );
    expect(step.outcome.ok).toBe(false);
  });

  it("records an audit entry for verification", () => {
    const step = d.setPsychologistVerified(
      fresh(),
      DEMO_ADMIN_ID,
      "psy-mei",
      true,
      NOW,
    );
    expect(step.outcome.ok).toBe(true);
    expect(step.state.audit[0].action).toMatch(
      /Verified credentials: Mei Lin Tan/,
    );
    expect(step.state.audit[0].actorId).toBe(DEMO_ADMIN_ID);
  });

  it("validates the cancellation window setting", () => {
    expect(
      d.saveSettings(
        fresh(),
        DEMO_ADMIN_ID,
        { cancellationWindowHours: 200 },
        NOW,
      ).outcome.ok,
    ).toBe(false);
    const ok = d.saveSettings(
      fresh(),
      DEMO_ADMIN_ID,
      { cancellationWindowHours: 48 },
      NOW,
    );
    expect(ok.state.settings.cancellationWindowHours).toBe(48);
  });

  it("requires resources to have a source and a valid reading time", () => {
    const base = {
      title: "T",
      category: "Stress" as const,
      summary: "S",
      body: [],
      source: "",
      readingMinutes: 3,
      published: true,
    };
    expect(d.saveResource(fresh(), DEMO_ADMIN_ID, base, NOW).outcome.ok).toBe(
      false,
    );
    expect(
      d.saveResource(
        fresh(),
        DEMO_ADMIN_ID,
        { ...base, source: "Reviewed", readingMinutes: 0 },
        NOW,
      ).outcome.ok,
    ).toBe(false);
    expect(
      d.saveResource(
        fresh(),
        DEMO_ADMIN_ID,
        { ...base, source: "Reviewed" },
        NOW,
      ).outcome.ok,
    ).toBe(true);
  });
});
