"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";

// Client-side paging for lists that can grow. Keeps the page in range when the list shrinks.
export function usePagination<T>(items: T[], pageSize = 10) {
  const [requestedPage, setPage] = useState(1);
  const pageCount = Math.max(1, Math.ceil(items.length / pageSize));
  const page = Math.min(requestedPage, pageCount);
  const pageItems = useMemo(
    () => items.slice((page - 1) * pageSize, page * pageSize),
    [items, page, pageSize],
  );
  return { page, pageCount, pageItems, setPage, total: items.length };
}

export function PaginationControls({
  page,
  pageCount,
  total,
  onChange,
  label,
}: {
  page: number;
  pageCount: number;
  total: number;
  onChange: (page: number) => void;
  label: string;
}) {
  if (pageCount <= 1) return null;
  return (
    <nav
      aria-label={label}
      className="flex items-center justify-between gap-3 pt-2 text-sm"
    >
      <span className="text-navy-soft">
        Page {page} of {pageCount} · {total} items
      </span>
      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          disabled={page <= 1}
          onClick={() => onChange(page - 1)}
        >
          Previous
        </Button>
        <Button
          variant="outline"
          size="sm"
          disabled={page >= pageCount}
          onClick={() => onChange(page + 1)}
        >
          Next
        </Button>
      </div>
    </nav>
  );
}
