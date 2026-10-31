"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/common/empty-state";
import { PageHeader } from "@/components/common/page-header";
import { Badge } from "@/components/ui/badge";
import { useStore } from "@/lib/store";
import { formatDateTime } from "@/lib/validation";

// In-app notifications only (A-13). No email or SMS is sent by this prototype.

export default function NotificationsPage() {
  const { mine, actions } = useStore();
  const items = [...mine.notifications].sort((a, b) =>
    b.at.localeCompare(a.at),
  );
  const unread = items.filter((n) => !n.read).length;

  // Opening the page counts as reading it. Effects run after render, so the list is shown first.
  const { markNotificationsRead } = actions;
  useEffect(() => {
    if (unread > 0) markNotificationsRead();
  }, [unread, markNotificationsRead]);

  return (
    <>
      <PageHeader
        title="Notifications"
        description="Updates about your appointments and account."
        action={
          unread > 0 ? (
            <Button
              variant="outline"
              onClick={() => actions.markNotificationsRead()}
            >
              Mark all as read
            </Button>
          ) : undefined
        }
      />
      {items.length === 0 ? (
        <EmptyState
          title="No notifications"
          body="Appointment updates will appear here."
        />
      ) : (
        <ul className="divide-y divide-border rounded-card border border-border bg-white">
          {items.map((n) => (
            <li key={n.id} className="flex flex-col gap-1 px-4 py-4">
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-medium">{n.title}</p>
                {!n.read && <Badge>New</Badge>}
              </div>
              <p className="text-sm text-navy-soft">{n.body}</p>
              <p className="text-xs text-navy-soft">{formatDateTime(n.at)}</p>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
