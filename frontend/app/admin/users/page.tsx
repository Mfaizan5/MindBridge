"use client";

import { useState } from "react";
import { ConfirmDialog } from "@/components/common/confirm-dialog";
import { EmptyState } from "@/components/common/empty-state";
import { Notice } from "@/components/common/notice";
import { PageHeader } from "@/components/common/page-header";
import {
  PaginationControls,
  usePagination,
} from "@/components/common/pagination";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { useStore } from "@/lib/store";
import type { Role } from "@/lib/types";
import { formatDate } from "@/lib/validation";

// User management: list accounts and change account status (suspend or reactivate). Every change is audited.
// Administrators can see account details here, but not journal or mood content.

export default function UsersPage() {
  const { data, actions, session } = useStore();
  const [role, setRole] = useState<"all" | Role>("all");
  const [notice, setNotice] = useState<{
    tone: "success" | "error";
    text: string;
  } | null>(null);

  const users = data.users
    .filter((u) => role === "all" || u.role === role)
    .sort((a, b) => a.name.localeCompare(b.name));
  const { page, pageCount, pageItems, setPage, total } = usePagination(
    users,
    10,
  );

  return (
    <>
      <PageHeader
        title="Users"
        description="Accounts and their status. Suspended accounts cannot log in."
      />

      {notice && (
        <div className="mb-6">
          <Notice tone={notice.tone === "error" ? "error" : "success"}>
            {notice.text}
          </Notice>
        </div>
      )}

      <div className="mb-4 flex items-center gap-3">
        <Label htmlFor="role-filter">Role</Label>
        <select
          id="role-filter"
          value={role}
          onChange={(e) => {
            setRole(e.target.value as "all" | Role);
            setPage(1);
          }}
          className="min-h-11 rounded-xl border border-input bg-white px-3"
        >
          <option value="all">All roles</option>
          <option value="student">Students</option>
          <option value="psychologist">Psychologists</option>
          <option value="admin">Administrators</option>
        </select>
      </div>

      {total === 0 ? (
        <EmptyState title="No users" body="No accounts match this filter." />
      ) : (
        <Card>
          <CardContent className="p-0">
            <ul className="divide-y divide-border">
              {pageItems.map((user) => {
                const isSelf = user.id === session?.userId;
                return (
                  <li
                    key={user.id}
                    className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="space-y-1">
                      <p className="font-medium">
                        {user.name}{" "}
                        <span className="text-sm font-normal text-navy-soft">
                          · {user.role}
                        </span>
                      </p>
                      <p className="text-sm text-navy-soft">
                        {user.email} · joined{" "}
                        {formatDate(user.createdAt.slice(0, 10))}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge
                        variant={
                          user.status === "suspended"
                            ? "destructive"
                            : "secondary"
                        }
                      >
                        {user.status === "suspended" ? "Suspended" : "Active"}
                      </Badge>
                      {user.role === "admin" || isSelf ? (
                        <span className="text-sm text-navy-soft">
                          Protected
                        </span>
                      ) : user.status === "active" ? (
                        <ConfirmDialog
                          key={`suspend-${user.id}`}
                          trigger="Suspend"
                          title={`Suspend ${user.name}?`}
                          description="They will not be able to log in until the account is reactivated. Their data is kept."
                          confirmLabel="Suspend account"
                          onConfirm={() => {
                            const result = actions.setUserStatus(
                              user.id,
                              "suspended",
                            );
                            setNotice(
                              result.ok
                                ? {
                                    tone: "success",
                                    text: `${user.name} has been suspended.`,
                                  }
                                : { tone: "error", text: result.error },
                            );
                          }}
                        />
                      ) : (
                        <ConfirmDialog
                          key={`reactivate-${user.id}`}
                          trigger="Reactivate"
                          title={`Reactivate ${user.name}?`}
                          description="They will be able to log in again."
                          confirmLabel="Reactivate account"
                          onConfirm={() => {
                            const result = actions.setUserStatus(
                              user.id,
                              "active",
                            );
                            setNotice(
                              result.ok
                                ? {
                                    tone: "success",
                                    text: `${user.name} has been reactivated.`,
                                  }
                                : { tone: "error", text: result.error },
                            );
                          }}
                        />
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          </CardContent>
        </Card>
      )}
      <div className="mt-4">
        <PaginationControls
          label="User pages"
          page={page}
          pageCount={pageCount}
          total={total}
          onChange={setPage}
        />
      </div>
    </>
  );
}
