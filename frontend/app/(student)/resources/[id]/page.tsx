"use client";

import { useParams } from "next/navigation";
import { ButtonLink } from "@/components/common/button-link";
import { EmptyState } from "@/components/common/empty-state";
import { PageHeader } from "@/components/common/page-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { useStore } from "@/lib/store";

// SCR-08 resource detail. Unpublished resources are treated as not found for students.

export default function ResourceDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data } = useStore();
  const resource = data.resources.find((r) => r.id === id && r.published);

  if (!resource) {
    return (
      <EmptyState
        title="Resource not found"
        body="This resource may have been moved or removed."
        action={
          <ButtonLink href="/resources" variant="outline">
            All resources
          </ButtonLink>
        }
      />
    );
  }

  return (
    <>
      <div className="mb-4">
        <ButtonLink href="/resources" variant="ghost" className="px-0">
          ← All resources
        </ButtonLink>
      </div>
      <PageHeader title={resource.title} description={resource.summary} />
      <Card className="max-w-2xl">
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <Badge variant="secondary">{resource.category}</Badge>
            <span className="text-navy-soft">
              {resource.readingMinutes} min read
            </span>
            <span className="text-navy-soft">· Source: {resource.source}</span>
          </div>
          {resource.body.map((paragraph, i) => (
            <p key={i} className="leading-relaxed">
              {paragraph}
            </p>
          ))}
        </CardContent>
      </Card>
    </>
  );
}
