"use client";

import { useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { ButtonLink } from "@/components/common/button-link";
import { ConfirmDialog } from "@/components/common/confirm-dialog";
import { EmptyState } from "@/components/common/empty-state";
import { Notice } from "@/components/common/notice";
import { PageHeader } from "@/components/common/page-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  appointmentViews,
  splitUpcoming,
  type AppointmentView,
} from "@/lib/selectors";
import { useStore } from "@/lib/store";
import type { AppointmentStatus } from "@/lib/types";
import { formatDate } from "@/lib/validation";

// SCR-12 My Appointments. Upcoming and past are separate. Moving an appointment means cancelling and booking again.

const TONE: Record<
  AppointmentStatus,
  "default" | "secondary" | "outline" | "destructive"
> = {
  Pending: "outline",
  Confirmed: "secondary",
  Completed: "default",
  Cancelled: "destructive",
};

function AppointmentsContent() {
  const params = useSearchParams();
  const { data, mine, actions } = useStore();
  const [notice, setNotice] = useState<{
    tone: "success" | "error";
    text: string;
  } | null>(
    params.get("booked") === "1"
      ? {
          tone: "success",
          text: "Your appointment request is saved. Its status will change once the psychologist responds.",
        }
      : null,
  );
  const now = new Date();
  const views = appointmentViews(data, mine.appointments, now);
  const { upcoming, past } = splitUpcoming(views);
  const windowHours = data.settings.cancellationWindowHours;

  const cancel = (id: string) => {
    const result = actions.cancelAppointment(id);
    setNotice(
      result.ok
        ? {
            tone: "success",
            text: "Appointment cancelled. The time is open to other students again.",
          }
        : { tone: "error", text: result.error },
    );
  };

  const renderCard = (v: AppointmentView) => {
    const canCancel =
      v.upcoming &&
      (v.startsAt.getTime() - now.getTime()) / 3_600_000 >= windowHours;
    return (
      <li key={v.appointment.id}>
        <Card>
          <CardContent className="space-y-3 pt-6">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="font-semibold">
                {v.psychologist?.name ?? "Psychologist"}
              </h2>
              <Badge variant={TONE[v.appointment.status]}>
                {v.appointment.status}
              </Badge>
            </div>
            <p className="text-sm">
              {formatDate(v.slot.date)}, {v.slot.startTime} – {v.slot.endTime}
            </p>
            {v.appointment.status === "Confirmed" && v.psychologist && (
              <p className="text-sm text-navy-soft">
                {v.psychologist.format
                  ? `Format: ${v.psychologist.format}. `
                  : ""}
                {v.psychologist.fee
                  ? `Fee: ${v.psychologist.fee.amount} ${v.psychologist.fee.currency}.`
                  : ""}
              </p>
            )}
            {v.upcoming && (
              <div className="space-y-2">
                {canCancel ? (
                  <ConfirmDialog
                    trigger="Cancel appointment"
                    title="Cancel this appointment?"
                    description="The time will be released for other students. You can book again later if a time is open."
                    confirmLabel="Yes, cancel"
                    onConfirm={() => cancel(v.appointment.id)}
                  />
                ) : (
                  <p className="text-sm text-navy-soft">
                    This appointment is within the {windowHours}-hour
                    cancellation window, so it cannot be cancelled here. Contact
                    the psychologist through Help &amp; Safety if you need to
                    change it.
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </li>
    );
  };

  return (
    <>
      <PageHeader
        title="My appointments"
        description="Upcoming bookings appear first. Past and cancelled bookings are listed below."
      />

      {notice && (
        <div className="mb-6">
          <Notice tone={notice.tone === "error" ? "error" : "success"}>
            {notice.text}
          </Notice>
        </div>
      )}

      <section aria-labelledby="upcoming" className="space-y-3">
        <h2 id="upcoming" className="text-lg font-semibold">
          Upcoming
        </h2>
        {upcoming.length === 0 ? (
          <EmptyState
            title="No upcoming appointments"
            body="When you book a time with a psychologist, it will appear here."
            action={
              <ButtonLink href="/psychologists" variant="outline">
                Find a psychologist
              </ButtonLink>
            }
          />
        ) : (
          <ul className="space-y-3">{upcoming.map(renderCard)}</ul>
        )}
      </section>

      <section aria-labelledby="past" className="mt-10 space-y-3">
        <h2 id="past" className="text-lg font-semibold">
          Past and cancelled
        </h2>
        {past.length === 0 ? (
          <p className="text-navy-soft">Nothing here yet.</p>
        ) : (
          <ul className="space-y-3">{past.map(renderCard)}</ul>
        )}
      </section>
    </>
  );
}

export default function AppointmentsPage() {
  return (
    <Suspense fallback={null}>
      <AppointmentsContent />
    </Suspense>
  );
}
