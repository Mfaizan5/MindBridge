"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Pencil, Trash2 } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { ConfirmDialog } from "@/components/common/confirm-dialog";
import { EmptyState } from "@/components/common/empty-state";
import { FormField, controlA11y } from "@/components/common/form-field";
import { Notice } from "@/components/common/notice";
import { PageHeader } from "@/components/common/page-header";
import {
  PaginationControls,
  usePagination,
} from "@/components/common/pagination";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { useStore } from "@/lib/store";
import {
  journalFormSchema,
  type JournalFormValues,
} from "@/lib/schemas/records";
import { formatDateTime } from "@/lib/validation";

// SCR-13 Private Journal. Only the owner can read, edit or delete entries (FR-11).
// Administrators and psychologists have no route to journal content in this app.

export default function JournalPage() {
  const { mine, actions } = useStore();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [notice, setNotice] = useState<{
    tone: "success" | "error";
    text: string;
  } | null>(null);

  const form = useForm<JournalFormValues>({
    resolver: zodResolver(journalFormSchema),
    defaultValues: { content: "" },
  });
  const { register, handleSubmit, reset, formState } = form;
  const errors = formState.errors;

  const entries = [...mine.journal].sort((a, b) =>
    b.updatedAt.localeCompare(a.updatedAt),
  );
  const { page, pageCount, pageItems, setPage, total } = usePagination(
    entries,
    6,
  );

  const submit = handleSubmit((values) => {
    // Confirmation appears only after the save has succeeded (VR-07).
    if (editingId) {
      const result = actions.updateJournal(editingId, values.content);
      if (!result.ok) return setNotice({ tone: "error", text: result.error });
      setNotice({ tone: "success", text: "Entry updated." });
      setEditingId(null);
    } else {
      const result = actions.addJournal(values.content);
      if (!result.ok) return setNotice({ tone: "error", text: result.error });
      setNotice({ tone: "success", text: "Entry saved." });
    }
    reset({ content: "" });
  });

  const startEdit = (id: string, content: string) => {
    setEditingId(id);
    setNotice(null);
    reset({ content });
  };

  const cancelEdit = () => {
    setEditingId(null);
    reset({ content: "" });
  };

  return (
    <>
      <PageHeader
        title="My journal"
        description="A private space for your thoughts. Only you can see these entries."
      />

      <div className="grid gap-6 lg:grid-cols-5">
        <Card className="lg:col-span-3">
          <CardContent className="space-y-4 pt-6">
            <form onSubmit={submit} noValidate className="space-y-4">
              <FormField
                id="content"
                label={editingId ? "Edit entry" : "New entry"}
                error={errors.content?.message}
              >
                <Textarea
                  rows={8}
                  placeholder="What is on your mind today?"
                  {...register("content")}
                  {...controlA11y("content", errors.content?.message)}
                />
              </FormField>
              <div className="flex flex-wrap gap-3">
                <Button type="submit" disabled={formState.isSubmitting}>
                  {editingId ? "Save changes" : "Save entry"}
                </Button>
                {editingId && (
                  <Button type="button" variant="ghost" onClick={cancelEdit}>
                    Cancel edit
                  </Button>
                )}
              </div>
            </form>
            {notice && (
              <Notice tone={notice.tone === "error" ? "error" : "success"}>
                {notice.text}
              </Notice>
            )}
          </CardContent>
        </Card>

        <section aria-labelledby="entries" className="space-y-3 lg:col-span-2">
          <h2 id="entries" className="text-lg font-semibold">
            Previous entries
          </h2>
          {total === 0 ? (
            <EmptyState
              title="No entries yet"
              body="Your entries are private and will be listed here."
            />
          ) : (
            <ul className="space-y-3">
              {pageItems.map((entry) => (
                <li
                  key={entry.id}
                  className="rounded-card border border-border bg-white p-4"
                >
                  <p className="text-xs text-navy-soft">
                    {formatDateTime(entry.createdAt)}
                    {entry.updatedAt !== entry.createdAt &&
                      ` · edited ${formatDateTime(entry.updatedAt)}`}
                  </p>
                  <p className="mt-2 line-clamp-4 whitespace-pre-wrap text-sm">
                    {entry.content}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => startEdit(entry.id, entry.content)}
                    >
                      <Pencil className="size-4" aria-hidden="true" />
                      Edit
                    </Button>
                    <ConfirmDialog
                      trigger={
                        <>
                          <Trash2 className="size-4" aria-hidden="true" />
                          Delete
                        </>
                      }
                      title="Delete this journal entry?"
                      description="The entry will be removed permanently. It cannot be recovered."
                      confirmLabel="Delete entry"
                      onConfirm={() => {
                        const result = actions.deleteJournal(entry.id);
                        if (!result.ok)
                          setNotice({ tone: "error", text: result.error });
                        if (editingId === entry.id) cancelEdit();
                      }}
                    />
                  </div>
                </li>
              ))}
            </ul>
          )}
          <PaginationControls
            label="Journal pages"
            page={page}
            pageCount={pageCount}
            total={total}
            onChange={setPage}
          />
        </section>
      </div>
    </>
  );
}
