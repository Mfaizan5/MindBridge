"use client";

import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { ButtonLink } from "@/components/common/button-link";
import { EmptyState } from "@/components/common/empty-state";
import { Notice } from "@/components/common/notice";
import { PageHeader } from "@/components/common/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { openSlots } from "@/lib/selectors";
import { useStore } from "@/lib/store";
import { formatDate } from "@/lib/validation";

// SCR-11 Appointment Booking. Pick a date, then a time that is still open (VR-06).
// The confirmation appears only after the booking has succeeded (VR-07). Double-booking is blocked in the domain layer (VR-08).

export default function BookAppointmentPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { data, actions } = useStore();
  const psychologist = data.psychologists.find(
    (p) => p.id === id && p.approvedProfile,
  );
  const now = new Date();

  const [date, setDate] = useState<string | null>(null);
  const [slotId, setSlotId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!psychologist) {
    return (
      <EmptyState
        title="Psychologist not available"
        body="You can only book with a listed psychologist."
        action={
          <ButtonLink href="/psychologists" variant="outline">
            Back to directory
          </ButtonLink>
        }
      />
    );
  }

  const open = openSlots(data, psychologist.id, now);
  const dates = [...new Set(open.map((s) => s.date))];
  const timesForDate = open.filter((s) => s.date === date);
  const selected = open.find((s) => s.id === slotId);
  const windowHours = data.settings.cancellationWindowHours;

  const confirm = async () => {
    if (!slotId) return;
    const result = await actions.bookSlot(slotId);
    if (!result.ok) {
      setError(result.error);
      setSlotId(null);
      return;
    }
    router.push("/appointments?booked=1");
  };

  return (
    <>
      <div className="mb-4">
        <ButtonLink
          href={`/psychologists/${psychologist.id}`}
          variant="ghost"
          className="px-0"
        >
          ← Back to profile
        </ButtonLink>
      </div>
      <PageHeader
        title={`Book with ${psychologist.name}`}
        description="Pick a date, then a time that is still open."
      />

      {error && (
        <div className="mb-6">
          <Notice tone="error">{error}</Notice>
        </div>
      )}

      {dates.length === 0 ? (
        <EmptyState
          title="No open times"
          body="This psychologist has no open times right now. Please check back later."
        />
      ) : (
        <div className="grid gap-6 lg:grid-cols-5">
          <div className="space-y-6 lg:col-span-3">
            <section aria-labelledby="pick-date" className="space-y-3">
              <h2 id="pick-date" className="text-lg font-semibold">
                1. Choose a date
              </h2>
              <div className="flex flex-wrap gap-2">
                {dates.map((d) => (
                  <button
                    key={d}
                    type="button"
                    aria-pressed={date === d}
                    onClick={() => {
                      setDate(d);
                      setSlotId(null);
                    }}
                    className={`min-h-11 rounded-full px-4 text-sm font-medium ${date === d ? "bg-navy text-white" : "bg-lavender text-navy hover:bg-[#dcd6ff]"}`}
                  >
                    {formatDate(d)}
                  </button>
                ))}
              </div>
            </section>

            {date && (
              <section aria-labelledby="pick-time" className="space-y-3">
                <h2 id="pick-time" className="text-lg font-semibold">
                  2. Choose a time
                </h2>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {timesForDate.map((slot) => (
                    <button
                      key={slot.id}
                      type="button"
                      aria-pressed={slotId === slot.id}
                      onClick={() => setSlotId(slot.id)}
                      className={`min-h-11 rounded-xl border px-3 text-sm font-medium ${slotId === slot.id ? "border-navy bg-lavender" : "border-navy/20 bg-white hover:bg-navy/5"}`}
                    >
                      {slot.startTime} – {slot.endTime}
                    </button>
                  ))}
                </div>
              </section>
            )}
          </div>

          <Card className="h-fit bg-sky lg:col-span-2">
            <CardHeader>
              <CardTitle>Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <dl className="space-y-3 text-sm">
                <div>
                  <dt className="text-navy-soft">Psychologist</dt>
                  <dd className="font-medium">{psychologist.name}</dd>
                </div>
                <div>
                  <dt className="text-navy-soft">Date and time</dt>
                  <dd className="font-medium">
                    {selected
                      ? `${formatDate(selected.date)}, ${selected.startTime} – ${selected.endTime}`
                      : "Not chosen yet"}
                  </dd>
                </div>
                <div>
                  <dt className="text-navy-soft">Fee</dt>
                  <dd className="font-medium">
                    {psychologist.fee
                      ? `${psychologist.fee.amount} ${psychologist.fee.currency}`
                      : "Not confirmed yet"}
                  </dd>
                </div>
              </dl>
              <p className="text-xs text-navy-soft">
                Cancellation: you can cancel up to {windowHours} hours before
                the appointment. This window is set by the administrator and may
                change.
              </p>
              <Button className="w-full" disabled={!slotId} onClick={confirm}>
                Confirm booking
              </Button>
            </CardContent>
          </Card>
        </div>
      )}
    </>
  );
}
