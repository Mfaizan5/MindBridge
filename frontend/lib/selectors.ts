import { slotStart } from "./domain/actions";
import type { AppState } from "./domain/state";
import type { Appointment, Psychologist, Slot } from "./types";

// Read-only joins used by several screens. They take the state and a clock, so they stay pure and testable.

export type AppointmentView = {
  appointment: Appointment;
  slot: Slot;
  psychologist: Psychologist | undefined;
  startsAt: Date;
  upcoming: boolean;
};

export function appointmentViews(
  state: AppState,
  appointments: Appointment[],
  now: Date,
): AppointmentView[] {
  return appointments
    .map((appointment) => {
      const slot = state.slots.find((s) => s.id === appointment.slotId);
      if (!slot) return null;
      const startsAt = slotStart(slot);
      const active =
        appointment.status === "Pending" || appointment.status === "Confirmed";
      return {
        appointment,
        slot,
        psychologist: state.psychologists.find(
          (p) => p.id === appointment.psychologistId,
        ),
        startsAt,
        upcoming: active && startsAt.getTime() > now.getTime(),
      };
    })
    .filter((view): view is AppointmentView => view !== null)
    .sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime());
}

export function splitUpcoming(views: AppointmentView[]) {
  return {
    upcoming: views.filter((v) => v.upcoming),
    past: views
      .filter((v) => !v.upcoming)
      .sort((a, b) => b.startsAt.getTime() - a.startsAt.getTime()),
  };
}

// The most recent timestamps across a student's own records, newest first.
export type ActivityItem = { at: string; label: string; href: string };

export function recentActivity(
  moods: AppState["moods"],
  journal: AppState["journal"],
  views: AppointmentView[],
  limit = 6,
): ActivityItem[] {
  const items: ActivityItem[] = [
    ...moods.map((m) => ({
      at: `${m.recordedOn}T${m.recordedTime}`,
      label: `Logged a check-in: ${m.mood}`,
      href: "/mood",
    })),
    ...journal.map((j) => ({
      at: j.updatedAt,
      label: "Saved a journal entry",
      href: "/journal",
    })),
    ...views.map((v) => ({
      at: v.appointment.updatedAt,
      label: `Appointment with ${v.psychologist?.name ?? "a psychologist"} is ${v.appointment.status.toLowerCase()}`,
      href: "/appointments",
    })),
  ];
  return items.sort((a, b) => b.at.localeCompare(a.at)).slice(0, limit);
}

// Times a psychologist can still be booked: not taken, and not already started.
export function openSlots(
  state: AppState,
  psychologistId: string,
  now: Date,
): Slot[] {
  return state.slots
    .filter(
      (s) =>
        s.psychologistId === psychologistId &&
        !s.bookedBy &&
        slotStart(s).getTime() > now.getTime(),
    )
    .sort((a, b) =>
      `${a.date}${a.startTime}`.localeCompare(`${b.date}${b.startTime}`),
    );
}
