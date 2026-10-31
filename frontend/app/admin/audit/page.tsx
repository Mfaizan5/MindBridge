"use client";

import { EmptyState } from "@/components/common/empty-state";
import { PageHeader } from "@/components/common/page-header";
import {
  PaginationControls,
  usePagination,
} from "@/components/common/pagination";
import { Card, CardContent } from "@/components/ui/card";
import { useStore } from "@/lib/store";
import { formatDateTime } from "@/lib/validation";

// FR-15: important admin actions are audited. Newest first. Entries record who acted and when, without personal content.

export default function AuditPage() {
  const { data } = useStore();
  const { page, pageCount, pageItems, setPage, total } = usePagination(
    data.audit,
    12,
  );

  return (
    <>
      <PageHeader
        title="Audit log"
        description="Record of important administrative actions."
      />
      {total === 0 ? (
        <EmptyState
          title="No entries"
          body="Administrative actions will be recorded here."
        />
      ) : (
        <>
          <Card>
            <CardContent className="p-0">
              <ul className="divide-y divide-border">
                {pageItems.map((entry) => (
                  <li
                    key={entry.id}
                    className="flex flex-col gap-1 p-4 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <p>{entry.action}</p>
                    <p className="text-sm text-navy-soft">
                      {entry.actor} · {formatDateTime(entry.at)}
                    </p>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
          <div className="mt-4">
            <PaginationControls
              label="Audit pages"
              page={page}
              pageCount={pageCount}
              total={total}
              onChange={setPage}
            />
          </div>
        </>
      )}
    </>
  );
}
