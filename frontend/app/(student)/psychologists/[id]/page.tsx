"use client";

import { useParams } from "next/navigation";
import { ButtonLink } from "@/components/common/button-link";
import { EmptyState } from "@/components/common/empty-state";
import { PageHeader } from "@/components/common/page-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { openSlots } from "@/lib/selectors";
import { useStore } from "@/lib/store";
import { formatDate } from "@/lib/validation";

// SCR-10 Psychologist Profile. Shows approved details only (VR-11), with the badge only when verified (VR-10).

export default function PsychologistProfilePage() {
  const { id } = useParams<{ id: string }>();
  const { data } = useStore();
  const now = new Date();
  const psychologist = data.psychologists.find(
    (p) => p.id === id && p.approvedProfile,
  );

  if (!psychologist) {
    return (
      <EmptyState
        title="Profile not available"
        body="This psychologist is not currently listed."
        action={
          <ButtonLink href="/psychologists" variant="outline">
            Back to directory
          </ButtonLink>
        }
      />
    );
  }

  const open = openSlots(data, psychologist.id, now);

  return (
    <>
      <div className="mb-4">
        <ButtonLink href="/psychologists" variant="ghost" className="px-0">
          ← Back to directory
        </ButtonLink>
      </div>
      <PageHeader
        title={psychologist.name}
        description={psychologist.specialization}
        action={
          <ButtonLink
            href={`/psychologists/${psychologist.id}/book`}
            className="w-full sm:w-auto"
          >
            Book appointment
          </ButtonLink>
        }
      />

      <div className="grid gap-5 lg:grid-cols-3">
        <Card className="space-y-4 lg:col-span-2">
          <CardContent className="space-y-4 pt-6">
            <div>
              {psychologist.verified ? (
                <Badge variant="secondary">Verified credentials</Badge>
              ) : (
                <Badge variant="outline">Verification pending</Badge>
              )}
            </div>
            <section>
              <h2 className="font-semibold">Qualifications</h2>
              <ul className="mt-1 space-y-1 text-navy-soft">
                {psychologist.qualifications.map((q) => (
                  <li key={q.id}>
                    {q.title}, {q.institution} ({q.year}) ·{" "}
                    {q.status === "Verified" ? "Verified" : "Under review"}
                  </li>
                ))}
              </ul>
            </section>
            <section>
              <h2 className="font-semibold">Experience</h2>
              <p className="text-navy-soft">
                {psychologist.experienceYears} years
              </p>
            </section>
            <section>
              <h2 className="font-semibold">About</h2>
              <p className="text-navy-soft">{psychologist.bio}</p>
            </section>
          </CardContent>
        </Card>

        <Card className="h-fit bg-sky">
          <CardContent className="space-y-4 pt-6">
            <section>
              <h2 className="font-semibold">Fee</h2>
              <p>
                {psychologist.fee
                  ? `${psychologist.fee.amount} ${psychologist.fee.currency}`
                  : "Not confirmed yet"}
              </p>
            </section>
            <section>
              <h2 className="font-semibold">Format</h2>
              <p>{psychologist.format ?? "Not confirmed yet"}</p>
            </section>
            <section>
              <h2 className="font-semibold">Open times</h2>
              {open.length === 0 ? (
                <p>No open times right now.</p>
              ) : (
                <ul className="mt-1 space-y-1 text-sm">
                  {open.slice(0, 6).map((s) => (
                    <li key={s.id}>
                      {formatDate(s.date)}, {s.startTime} – {s.endTime}
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
