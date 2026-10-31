"use client";

import Link from "next/link";
import { useState } from "react";
import { ButtonLink } from "@/components/common/button-link";
import { EmptyState } from "@/components/common/empty-state";
import { PageHeader } from "@/components/common/page-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { openSlots } from "@/lib/selectors";
import { useStore } from "@/lib/store";
import { formatDate } from "@/lib/validation";

// SCR-09 Psychologist Directory. Lists published profiles only (VR-11).
// The verified badge appears only after credentials are checked (VR-10). Fee and format appear only when confirmed (VR-09).

export default function PsychologistDirectoryPage() {
  const { data } = useStore();
  const [query, setQuery] = useState("");
  const [onlyAvailable, setOnlyAvailable] = useState(false);
  const now = new Date();

  const q = query.trim().toLowerCase();
  const results = data.psychologists
    .filter((p) => p.approvedProfile)
    .filter(
      (p) => !q || `${p.name} ${p.specialization}`.toLowerCase().includes(q),
    )
    .map((p) => ({ p, open: openSlots(data, p.id, now) }))
    .filter(({ open }) => !onlyAvailable || open.length > 0);

  return (
    <>
      <PageHeader
        title="Find a psychologist"
        description="Search by name or area of focus. Booking is always optional."
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-[1fr_auto] sm:items-end">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="search">Search by name or specialization</Label>
          <Input
            id="search"
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="e.g. exam anxiety"
          />
        </div>
        <div className="flex min-h-11 items-center gap-3">
          <Checkbox
            id="available"
            checked={onlyAvailable}
            onCheckedChange={(checked) => setOnlyAvailable(checked === true)}
          />
          <Label htmlFor="available">Has open times</Label>
        </div>
      </div>

      {results.length === 0 ? (
        <EmptyState
          title="No matching psychologists"
          body="Try a different search, or clear the availability filter."
        />
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2">
          {results.map(({ p, open }) => {
            const next = open[0];
            return (
              <li key={p.id}>
                <Card className="h-full">
                  <CardHeader className="gap-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <CardTitle>{p.name}</CardTitle>
                      {p.verified ? (
                        <Badge variant="secondary">Verified</Badge>
                      ) : (
                        <Badge variant="outline">Verification pending</Badge>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="flex h-full flex-col gap-2 text-sm">
                    <p>
                      {p.qualifications
                        .filter((q) => q.status === "Verified")
                        .map((q) => q.title)
                        .join(", ") || "Qualifications under review"}
                    </p>
                    <p className="text-navy-soft">{p.specialization}</p>
                    <p className="text-navy-soft">
                      {p.experienceYears} years of experience
                    </p>
                    {p.fee && (
                      <p>
                        Fee: {p.fee.amount} {p.fee.currency}
                      </p>
                    )}
                    {p.format && <p>Format: {p.format}</p>}
                    <p className="text-navy-soft">
                      {next
                        ? `Next open time: ${formatDate(next.date)}, ${next.startTime}`
                        : "No open times right now"}
                    </p>
                    <div className="mt-auto pt-2">
                      <Link
                        href={`/psychologists/${p.id}`}
                        className="inline-flex min-h-11 items-center font-medium underline underline-offset-4"
                      >
                        View profile
                        <span className="sr-only"> of {p.name}</span>
                      </Link>
                    </div>
                  </CardContent>
                </Card>
              </li>
            );
          })}
        </ul>
      )}

      <p className="mt-8 text-sm text-navy-soft">
        Not sure who to choose?{" "}
        <ButtonLink href="/help" variant="ghost" className="px-0">
          Read Help &amp; Safety
        </ButtonLink>
      </p>
    </>
  );
}
