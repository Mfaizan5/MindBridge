"use client";

import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { ButtonLink } from "@/components/common/button-link";
import { ConfirmDialog } from "@/components/common/confirm-dialog";
import { EmptyState } from "@/components/common/empty-state";
import { Notice } from "@/components/common/notice";
import { PageHeader } from "@/components/common/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { api } from "@/lib/api/client";
import { useStore } from "@/lib/store";
import { formatDate } from "@/lib/validation";

// Appointment details for the psychologist. The server decides what is shown (least privilege):
// the student's identity only with "Appointment history" consent, and a 30-day mood summary only with "Mood records" consent.

type Detail = {
  appointment: {
    id: string;
    status: string;
    starts_at: string;
    ends_at: string;
    psychologist_name: string;
  };
  student: { name: string; email: string } | null;
  mood_summary: {
    count: number;
    average_stress: number | null;
    average_sleep_hours: number | null;
  } | null;
  started: boolean;
};

const pad = (n: number) => String(n).padStart(2, "0");
const localDate = (d: Date) =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const localTime = (d: Date) => `${pad(d.getHours())}:${pad(d.getMinutes())}`;

export default function PsychologistAppointmentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { actions, myPsychologist } = useStore();
  const [detail, setDetail] = useState<Detail | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [notice, setNotice] = useState<{
    tone: "success" | "error";
    text: string;
  } | null>(null);

  // The server reports whether the appointment has started, so the browser clock is not needed while rendering.
  const load = useCallback(async () => {
    try {
      const body = await api<Omit<Detail, "started"> & { started?: boolean }>(
        "GET",
        `/appointments/psychologist/${id}`,
      );
      setDetail({
        ...body,
        started: new Date(body.appointment.starts_at).getTime() <= Date.now(),
      });
      setLoadError(null);
    } catch (err) {
      setDetail(null);
      setLoadError(
        err instanceof Error
          ? err.message
          : "This appointment could not be loaded.",
      );
    }
  }, [id]);

  useEffect(() => {
    let active = true;
    api<Omit<Detail, "started">>("GET", `/appointments/psychologist/${id}`)
      .then((body) => {
        if (active)
          setDetail({
            ...body,
            started:
              new Date(body.appointment.starts_at).getTime() <= Date.now(),
          });
      })
      .catch((err: unknown) => {
        if (active)
          setLoadError(
            err instanceof Error
              ? err.message
              : "This appointment could not be loaded.",
          );
      });
    return () => {
      active = false;
    };
  }, [id]);

  if (!myPsychologist) {
    return (
      <EmptyState
        title="No profile linked"
        body="Your account is not linked to a psychologist profile yet."
      />
    );
  }
  if (!detail) {
    return (
      <EmptyState
        title="Appointment not found"
        body={
          loadError ??
          "This appointment does not exist, or it is not one of yours."
        }
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

  const appointment = detail.appointment;
  const start = new Date(appointment.starts_at);

  const change = async (next: "Confirmed" | "Completed" | "Cancelled") => {
    const result =
      next === "Cancelled"
        ? await actions.cancelAppointment(appointment.id)
        : await actions.setAppointmentStatus(appointment.id, next);
    setNotice(
      result.ok
        ? { tone: "success", text: `Appointment ${next.toLowerCase()}.` }
        : { tone: "error", text: result.error },
    );
    await load();
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
        title={`${formatDate(localDate(start))}, ${localTime(start)}`}
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
            {detail.student ? (
              <>
                <p>
                  <span className="text-navy-soft">Name:</span>{" "}
                  {detail.student.name}
                </p>
                <p>
                  <span className="text-navy-soft">Email:</span>{" "}
                  {detail.student.email}
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
            {detail.mood_summary === null ? (
              <p className="text-navy-soft">
                Mood information has not been shared with you.
              </p>
            ) : detail.mood_summary.count === 0 ? (
              <p className="text-navy-soft">
                No check-ins in the last 30 days.
              </p>
            ) : (
              <p>
                Last 30 days: {detail.mood_summary.count} check-ins, average
                stress {detail.mood_summary.average_stress} out of 10, average
                sleep {detail.mood_summary.average_sleep_hours} hours. Summary
                only, shared by the student.
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
              <Button
                disabled={!detail.started}
                onClick={() => change("Completed")}
              >
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
            {appointment.status === "Confirmed" && !detail.started && (
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
