"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Notice } from "@/components/common/notice";
import { PageHeader } from "@/components/common/page-header";
import { useStore } from "@/lib/store";

// SCR-17 Admin Workspace overview. Counts only. Administrators never see journal content (VR-19).

export default function AdminOverviewPage() {
  const { data } = useStore();
  const stats = [
    { label: "Accounts", value: data.users.length },
    {
      label: "Suspended accounts",
      value: data.users.filter((u) => u.status === "suspended").length,
    },
    {
      label: "Psychologists verified",
      value: data.psychologists.filter((p) => p.verified).length,
    },
    {
      label: "Awaiting verification",
      value: data.psychologists.filter((p) => !p.verified).length,
    },
    {
      label: "Qualifications to review",
      value: data.psychologists.reduce(
        (n, p) =>
          n + p.qualifications.filter((q) => q.status === "Submitted").length,
        0,
      ),
    },
  ];

  return (
    <>
      <PageHeader
        title="Admin overview"
        description="Platform status at a glance."
      />
      <div className="mb-6">
        <Notice tone="info">
          This prototype stores data in this browser. Account and audit data
          move to the server with the backend.
        </Notice>
      </div>
      <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {stats.map((stat) => (
          <Card key={stat.label}>
            <CardContent className="pt-6">
              <dt className="text-sm text-navy-soft">{stat.label}</dt>
              <dd className="mt-1 text-3xl font-semibold">{stat.value}</dd>
            </CardContent>
          </Card>
        ))}
      </dl>
    </>
  );
}
