"use client";

import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { EmptyState } from "@/components/common/empty-state";
import { Notice } from "@/components/common/notice";
import { PageHeader } from "@/components/common/page-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { appointmentViews } from "@/lib/selectors";
import { useStore } from "@/lib/store";
import type { AppointmentStatus } from "@/lib/types";
import { formatDate } from "@/lib/validation";

// Appointment list for the psychologist. Open a booking for details and status changes.

const TONE: Record<
  AppointmentStatus,
  "default" | "secondary" | "outline" | "destructive"
> = {
  Pending: "outline",
  Confirmed: "secondary",
  Completed: "default",
  Cancelled: "destructive",
};

export default function PsychologistAppointmentsPage() {
  const { data, myPsychologist } = useStore();

  if (!myPsychologist)
    return (
      <EmptyState
        title="No profile linked"
        body="Your account is not linked to a psychologist profile yet."
      />
    );

  const views = appointmentViews(
    data,
    data.appointments.filter((a) => a.psychologistId === myPsychologist.id),
    new Date(),
  );

  return (
    <>
      <PageHeader
        title="Appointments"
        description="Confirm, complete or cancel bookings. Student details are shown only where the student has shared them."
      />
      <div className="mb-6">
        <Notice tone="info">
          Students share information with you only when they choose to. Details
          you cannot see have not been shared.
        </Notice>
      </div>

      {views.length === 0 ? (
        <EmptyState
          title="No appointments yet"
          body="Bookings from students will appear here."
        />
      ) : (
        <ul className="space-y-3">
          {views.map((v) => (
            <li key={v.appointment.id}>
              <Link
                href={`/psychologist/workspace/appointments/${v.appointment.id}`}
                className="block rounded-card focus-visible:outline-navy"
              >
                <Card className="transition-colors hover:bg-lavender/30">
                  <CardContent className="flex items-center justify-between gap-3 pt-6">
                    <div className="space-y-1">
                      <p className="font-semibold">
                        {formatDate(v.slot.date)}, {v.slot.startTime} –{" "}
                        {v.slot.endTime}
                      </p>
                      <Badge variant={TONE[v.appointment.status]}>
                        {v.appointment.status}
                      </Badge>
                    </div>
                    <ChevronRight
                      className="size-5 shrink-0"
                      aria-hidden="true"
                    />
                  </CardContent>
                </Card>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
