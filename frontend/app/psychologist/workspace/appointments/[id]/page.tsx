"use client";

import { useParams } from "next/navigation";
import { useState } from "react";
import { ButtonLink } from "@/components/common/button-link";
import { ConfirmDialog } from "@/components/common/confirm-dialog";
import { EmptyState } from "@/components/common/empty-state";
import { Notice } from "@/components/common/notice";
import { PageHeader } from "@/components/common/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { hasConsent } from "@/lib/domain/actions";
import { appointmentViews } from "@/lib/selectors";
import { useStore } from "@/lib/store";
import { average, filterByRange, round1 } from "@/lib/stats";
import { formatDate, localDateKey } from "@/lib/validation";

// Appointment details for the psychologist. Least privilege (VR-18):
// - Student identity is shown only with "Appointment history" consent.
// - Mood information is shown only as a 30-day summary, and only with "Mood records" consent. Individual entries and the journal are never shown.

export default function PsychologistAppointmentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data, myPsychologist, actions } = useStore();
  const [notice, setNotice] = useState<{
    tone: "success" | "error";
    text: string;
  } | null>(null);
  const now = new Date();

  if (!myPsychologist)
    return (
      <EmptyState
        title="No profile linked"
        body="Your account is not linked to a psychologist profile yet."
      />
    );

  const appointment = data.appointments.find(
    (a) => a.id === id && a.psychologistId === myPsychologist.id,
  );
  if (!appointment) {
    return (
      <EmptyState
        title="Appointment not found"
        body="This appointment does not exist, or it is not one of yours."
        action={
          <ButtonLink
            href="/psychologist/workspace/appointments"
            variant="outline"
          >
            Back to appointments
          </ButtonLink>
        }
      />
    );
  }

  const view = appointmentViews(data, [appointment], now)[0];
  const student = data.users.find((u) => u.id === appointment.studentId);
  const shareIdentity = hasConsent(
    data,
    appointment.studentId,
    "Appointment history",
    myPsychologist.id,
  );
  const shareMood = hasConsent(
    data,
    appointment.studentId,
    "Mood records",
    myPsychologist.id,
  );
  const recentMoods = filterByRange(
    data.moods.filter((m) => m.ownerId === appointment.studentId),
    "30d",
    localDateKey(now),
  );
  const started = view ? view.startsAt.getTime() <= now.getTime() : false;

  const change = (next: "Confirmed" | "Completed" | "Cancelled") => {
    const result =
      next === "Cancelled"
        ? actions.cancelAppointment(appointment.id)
        : actions.setAppointmentStatus(appointment.id, next);
    setNotice(
      result.ok
        ? { tone: "success", text: `Appointment ${next.toLowerCase()}.` }
        : { tone: "error", text: result.error },
    );
  };

  return (
    <>
      <div className="mb-4">
        <ButtonLink
          href="/psychologist/workspace/appointments"
          variant="ghost"
          className="px-0"
        >
          ← All appointments
        </ButtonLink>
      </div>
      <PageHeader
        title={
          view
            ? `${formatDate(view.slot.date)}, ${view.slot.startTime} – ${view.slot.endTime}`
            : "Appointment"
        }
        description="Review the booking and update its status."
        action={<Badge variant="outline">{appointment.status}</Badge>}
      />

      {notice && (
        <div className="mb-6">
          <Notice tone={notice.tone === "error" ? "error" : "success"}>
            {notice.text}
          </Notice>
        </div>
      )}

      <div className="grid gap-5 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Student</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {shareIdentity && student ? (
              <>
                <p>
                  <span className="text-navy-soft">Name:</span> {student.name}
                </p>
                <p>
                  <span className="text-navy-soft">Email:</span> {student.email}
                </p>
              </>
            ) : (
              <p className="text-navy-soft">
                The student has not shared their identity with you. Details
                appear only with their consent.
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Shared mood summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {shareMood ? (
              recentMoods.length === 0 ? (
                <p className="text-navy-soft">
                  No check-ins in the last 30 days.
                </p>
              ) : (
                <p>
                  Last 30 days: {recentMoods.length} check-ins, average stress{" "}
                  {round1(average(recentMoods.map((m) => m.stress)))} out of 10,
                  average sleep{" "}
                  {round1(average(recentMoods.map((m) => m.sleepHours)))} hours.
                  Summary only, shared by the student.
                </p>
              )
            ) : (
              <p className="text-navy-soft">
                Mood information has not been shared with you.
              </p>
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Actions</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-3">
            {appointment.status === "Pending" && (
              <Button onClick={() => change("Confirmed")}>
                Confirm appointment
              </Button>
            )}
            {appointment.status === "Confirmed" && (
              <Button disabled={!started} onClick={() => change("Completed")}>
                Mark completed
              </Button>
            )}
            {(appointment.status === "Pending" ||
              appointment.status === "Confirmed") && (
              <ConfirmDialog
                trigger="Cancel appointment"
                title="Cancel this appointment?"
                description="The student will be notified and the time will be released."
                confirmLabel="Yes, cancel"
                onConfirm={() => change("Cancelled")}
              />
            )}
            {appointment.status === "Confirmed" && !started && (
              <p className="w-full text-sm text-navy-soft">
                You can mark the appointment completed once it has started.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
