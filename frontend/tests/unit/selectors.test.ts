import { describe, expect, it } from "vitest";
import * as d from "@/lib/domain/actions";
import { createSeedState, type AppState } from "@/lib/domain/state";
import { appointmentViews, openSlots, recentActivity, splitUpcoming } from "@/lib/selectors";
import { DEMO_PSYCHOLOGIST_ID, DEMO_STUDENT_ID } from "@/lib/seed";

const NOW = new Date(2026, 10, 1, 10, 0);

function withBooking(slotId: string): AppState {
  const step = d.bookSlot(createSeedState("2026-11-01"), DEMO_STUDENT_ID, slotId, NOW);
  if (!step.outcome.ok) throw new Error(step.outcome.error);
  return step.state;
}

describe("open times", () => {
  it("lists only untaken times that have not started, in date order", () => {
    const state = createSeedState("2026-11-01");
    const open = openSlots(state, DEMO_PSYCHOLOGIST_ID, NOW);
    expect(open.every((s) => !s.bookedBy)).toBe(true);
    const keys = open.map((s) => `${s.date}${s.startTime}`);
    expect([...keys].sort()).toEqual(keys);
  });

  it("removes a time once it is booked", () => {
    const slotId = `${DEMO_PSYCHOLOGIST_ID}-2026-11-02-09:00`;
    const before = openSlots(createSeedState("2026-11-01"), DEMO_PSYCHOLOGIST_ID, NOW);
    const after = openSlots(withBooking(slotId), DEMO_PSYCHOLOGIST_ID, NOW);
    expect(before.some((s) => s.id === slotId)).toBe(true);
    expect(after.some((s) => s.id === slotId)).toBe(false);
  });
});

describe("appointment views", () => {
  it("splits bookings into upcoming and past using the clock", () => {
    const state = withBooking(`${DEMO_PSYCHOLOGIST_ID}-2026-11-02-09:00`);
    const views = appointmentViews(state, state.appointments, NOW);
    expect(views).toHaveLength(1);
    const { upcoming, past } = splitUpcoming(views);
    expect(upcoming).toHaveLength(1);
    expect(past).toHaveLength(0);

    const later = new Date(2026, 10, 3, 0, 0);
    const later2 = splitUpcoming(appointmentViews(state, state.appointments, later));
    expect(later2.upcoming).toHaveLength(0);
    expect(later2.past).toHaveLength(1);
  });

  it("treats cancelled bookings as past, never upcoming", () => {
    const state = withBooking(`${DEMO_PSYCHOLOGIST_ID}-2026-11-03-09:00`);
    const id = state.appointments[0].id;
    const cancelled = d.cancelAppointment(state, { userId: DEMO_STUDENT_ID, role: "student" }, id, NOW).state;
    const { upcoming, past } = splitUpcoming(appointmentViews(cancelled, cancelled.appointments, NOW));
    expect(upcoming).toHaveLength(0);
    expect(past[0].appointment.status).toBe("Cancelled");
  });
});

describe("recent activity", () => {
  it("merges check-ins, journal entries and appointments, newest first, and respects the limit", () => {
    const state = withBooking(`${DEMO_PSYCHOLOGIST_ID}-2026-11-02-09:00`);
    const journal = d.addJournal(state, DEMO_STUDENT_ID, "note", NOW).state.journal;
    const views = appointmentViews(state, state.appointments, NOW);
    const items = recentActivity(
      state.moods.filter((m) => m.ownerId === DEMO_STUDENT_ID),
      journal.filter((j) => j.ownerId === DEMO_STUDENT_ID),
      views,
      4,
    );
    expect(items).toHaveLength(4);
    const times = items.map((i) => i.at);
    expect([...times].sort().reverse()).toEqual(times);
  });
});
