"use client";

import Link from "next/link";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/common/empty-state";
import { PageHeader } from "@/components/common/page-header";
import { useStore } from "@/lib/store";
import { RESOURCE_CATEGORIES, type ResourceCategory } from "@/lib/types";

// SCR-08 Helpful Resources. Only published resources are shown to students.

export default function ResourcesPage() {
  const { data } = useStore();
  const [category, setCategory] = useState<"All" | ResourceCategory>("All");
  const published = data.resources.filter((r) => r.published);
  const visible =
    category === "All"
      ? published
      : published.filter((r) => r.category === category);

  return (
    <>
      <PageHeader
        title="Helpful resources"
        description="Short, plain-language reads from named sources. Content marked as placeholder is awaiting professional review."
      />

      <div
        role="group"
        aria-label="Filter by category"
        className="mb-6 flex flex-wrap gap-2"
      >
        {(["All", ...RESOURCE_CATEGORIES] as const).map((item) => (
          <button
            key={item}
            type="button"
            aria-pressed={category === item}
            onClick={() => setCategory(item)}
            className={`min-h-11 rounded-full px-4 text-sm font-medium ${category === item ? "bg-navy text-white" : "bg-lavender text-navy hover:bg-[#dcd6ff]"}`}
          >
            {item}
          </button>
        ))}
      </div>

      {visible.length === 0 ? (
        <EmptyState
          title="No resources in this category yet"
          body="Try another category, or check back later."
        />
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2">
          {visible.map((resource) => (
            <li key={resource.id}>
              <Card className="h-full">
                <CardHeader className="gap-2">
                  <div className="flex items-center justify-between gap-2">
                    <Badge variant="secondary">{resource.category}</Badge>
                    <span className="text-xs text-navy-soft">
                      {resource.readingMinutes} min read
                    </span>
                  </div>
                  <CardTitle>{resource.title}</CardTitle>
                </CardHeader>
                <CardContent className="flex h-full flex-col gap-3">
                  <p className="flex-1 text-sm text-navy-soft">
                    {resource.summary}
                  </p>
                  <p className="text-xs text-navy-soft">
                    Source: {resource.source}
                  </p>
                  <Link
                    href={`/resources/${resource.id}`}
                    className="inline-flex min-h-11 items-center font-medium underline underline-offset-4"
                  >
                    Read more
                    <span className="sr-only"> about {resource.title}</span>
                  </Link>
                </CardContent>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
