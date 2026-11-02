"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Pencil, Trash2 } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { ConfirmDialog } from "@/components/common/confirm-dialog";
import { FormField, controlA11y } from "@/components/common/form-field";
import { ButtonLink } from "@/components/common/button-link";
import { Notice } from "@/components/common/notice";
import { PageHeader } from "@/components/common/page-header";
import {
  PaginationControls,
  usePagination,
} from "@/components/common/pagination";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useStore } from "@/lib/store";
import {
  moodFormSchema,
  toSleepHours,
  type MoodFormValues,
} from "@/lib/schemas/records";
import { MOOD_OPTIONS, type MoodRecord } from "@/lib/types";
import { formatDate, localDateKey } from "@/lib/validation";

// SCR-04 Mood, stress and sleep tracker. Create, correct and delete your own check-ins (FR-02).
// Stress and sleep are self-reported. The app shows them as entered and does not interpret them clinically.

function nowTime() {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

// An empty mood is rejected by the schema with "Choose how you feel today." until a mood is picked.
const emptyValues = (mood: string | null): MoodFormValues => ({
  mood: (MOOD_OPTIONS as readonly string[]).includes(mood ?? "")
    ? (mood as MoodFormValues["mood"])
    : ("" as MoodFormValues["mood"]),
  stress: 5,
  sleepHours: "",
  recordedOn: localDateKey(),
  recordedTime: nowTime(),
  note: "",
});

function MoodTracker() {
  const params = useSearchParams();
  const { mine, actions } = useStore();
  const today = localDateKey();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saved, setSaved] = useState<{ id: string; text: string } | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const form = useForm<MoodFormValues>({
    resolver: zodResolver(moodFormSchema),
    defaultValues: emptyValues(params.get("mood")),
  });
  const { register, handleSubmit, reset, formState, control } = form;
  const stress = useWatch({ control, name: "stress" });
  const errors = formState.errors;

  const sorted = [...mine.moods].sort((a, b) =>
    `${b.recordedOn}${b.recordedTime}`.localeCompare(
      `${a.recordedOn}${a.recordedTime}`,
    ),
  );
  const { page, pageCount, pageItems, setPage, total } = usePagination(
    sorted,
    8,
  );

  const startEdit = (record: MoodRecord) => {
    setSaved(null);
    setActionError(null);
    setEditingId(record.id);
    reset({
      mood: record.mood,
      stress: record.stress,
      sleepHours: String(record.sleepHours),
      recordedOn: record.recordedOn,
      recordedTime: record.recordedTime,
      note: record.note,
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    reset(emptyValues(null));
  };

  const submit = handleSubmit(async (values) => {
    setActionError(null);
    const input = {
      mood: values.mood,
      stress: values.stress,
      sleepHours: toSleepHours(values.sleepHours),
      note: values.note,
      recordedOn: values.recordedOn,
      recordedTime: values.recordedTime,
    };
    // Confirmation appears only after the save has succeeded (VR-07).
    if (editingId) {
      const result = await actions.updateMood(editingId, input);
      if (!result.ok) return setActionError(result.error);
      setSaved({
        id: editingId,
        text: `Check-in updated for ${formatDate(input.recordedOn)}.`,
      });
      setEditingId(null);
      reset(emptyValues(null));
      return;
    }
    const result = await actions.addMood(input);
    if (!result.ok) {
      setActionError(result.error);
      return;
    }
    setSaved({
      id: result.value,
      text: `Check-in saved for ${formatDate(input.recordedOn)} at ${input.recordedTime}.`,
    });
    reset(emptyValues(null));
  });

  return (
    <>
      <PageHeader
        title="Mood, stress and sleep"
        description="Log how you feel, your stress from 1 to 10, and how long you slept."
      />

      {saved && (
        <div className="mb-6 space-y-3">
          <Notice tone="success">
            <p className="font-medium">{saved.text}</p>
          </Notice>
          <div className="flex flex-wrap gap-2">
            <ButtonLink href="/dashboard" variant="outline" size="sm">
              Back to dashboard
            </ButtonLink>
            <ButtonLink href="/progress" variant="outline" size="sm">
              View progress
            </ButtonLink>
          </div>
        </div>
      )}
      {actionError && (
        <div className="mb-6">
          <Notice tone="error">{actionError}</Notice>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-5">
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle>
              {editingId ? "Correct an entry" : "New check-in"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={submit} noValidate className="space-y-6">
              <fieldset className="space-y-2">
                <legend className="text-sm font-medium">
                  How are you feeling?
                </legend>
                <Controller
                  name="mood"
                  control={control}
                  render={({ field }) => (
                    <div
                      role="radiogroup"
                      aria-describedby={errors.mood ? "mood-error" : undefined}
                      aria-invalid={errors.mood ? true : undefined}
                      className="flex flex-wrap gap-2"
                    >
                      {MOOD_OPTIONS.map((mood) => {
                        const selected = field.value === mood;
                        return (
                          <label
                            key={mood}
                            className={`inline-flex min-h-11 cursor-pointer items-center rounded-full border px-4 text-sm font-medium has-focus-visible:outline-3 has-focus-visible:outline-offset-2 has-focus-visible:outline-navy ${selected ? "border-navy bg-lavender" : "border-navy/20 bg-white hover:bg-navy/5"}`}
                          >
                            <input
                              type="radio"
                              name={field.name}
                              value={mood}
                              checked={selected}
                              onChange={() => field.onChange(mood)}
                              onBlur={field.onBlur}
                              className="sr-only"
                            />
                            {mood}
                          </label>
                        );
                      })}
                    </div>
                  )}
                />
                {errors.mood && (
                  <p
                    id="mood-error"
                    className="text-sm font-medium text-danger"
                  >
                    {errors.mood.message}
                  </p>
                )}
              </fieldset>

              <FormField
                id="stress"
                label="Stress level"
                hint="1 is very low and 10 is very high. Rate how you feel, not a diagnosis."
                error={errors.stress?.message}
              >
                <div className="flex items-center gap-4">
                  <input
                    type="range"
                    min={1}
                    max={10}
                    step={1}
                    className="h-11 w-full accent-navy"
                    {...register("stress", { valueAsNumber: true })}
                    {...controlA11y(
                      "stress",
                      errors.stress?.message,
                      "stress-hint",
                    )}
                  />
                  <output
                    htmlFor="stress"
                    className="w-12 text-right font-semibold"
                    aria-live="polite"
                  >
                    {stress}/10
                  </output>
                </div>
              </FormField>

              <FormField
                id="sleepHours"
                label="Hours slept"
                hint="Use half-hour steps, for example 7.5."
                error={errors.sleepHours?.message}
              >
                <Input
                  type="number"
                  inputMode="decimal"
                  min={0}
                  max={24}
                  step={0.5}
                  {...register("sleepHours")}
                  {...controlA11y("sleepHours", errors.sleepHours?.message)}
                />
              </FormField>

              <div className="grid gap-4 sm:grid-cols-2">
                <FormField
                  id="recordedOn"
                  label="Date"
                  error={errors.recordedOn?.message}
                >
                  <Input
                    type="date"
                    max={today}
                    {...register("recordedOn")}
                    {...controlA11y("recordedOn", errors.recordedOn?.message)}
                  />
                </FormField>
                <FormField
                  id="recordedTime"
                  label="Time"
                  error={errors.recordedTime?.message}
                >
                  <Input
                    type="time"
                    {...register("recordedTime")}
                    {...controlA11y(
                      "recordedTime",
                      errors.recordedTime?.message,
                    )}
                  />
                </FormField>
              </div>

              <FormField
                id="note"
                label="Notes (optional)"
                hint="Up to 500 characters."
                error={errors.note?.message}
              >
                <Textarea
                  rows={3}
                  {...register("note")}
                  {...controlA11y("note", errors.note?.message)}
                />
              </FormField>

              <div className="flex flex-wrap gap-3">
                <Button type="submit" disabled={formState.isSubmitting}>
                  {editingId ? "Save changes" : "Save check-in"}
                </Button>
                {editingId && (
                  <Button type="button" variant="ghost" onClick={cancelEdit}>
                    Cancel edit
                  </Button>
                )}
              </div>
            </form>
          </CardContent>
        </Card>

        <section aria-labelledby="entries" className="space-y-3 lg:col-span-2">
          <h2 id="entries" className="text-lg font-semibold">
            Your check-ins
          </h2>
          {total === 0 && (
            <p className="text-navy-soft">
              No check-ins yet. Your first entry will appear here.
            </p>
          )}
          <ul className="space-y-3">
            {pageItems.map((record) => (
              <li
                key={record.id}
                className="rounded-card border border-border bg-white p-4"
              >
                <div className="flex items-baseline justify-between gap-2">
                  <p className="font-medium">{record.mood}</p>
                  <p className="text-sm text-navy-soft">
                    {formatDate(record.recordedOn)}, {record.recordedTime}
                  </p>
                </div>
                <p className="mt-1 text-sm text-navy-soft">
                  Stress {record.stress}/10 · Sleep {record.sleepHours} h
                </p>
                {record.note && <p className="mt-2 text-sm">{record.note}</p>}
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => startEdit(record)}
                  >
                    <Pencil className="size-4" aria-hidden="true" />
                    Correct
                  </Button>
                  <ConfirmDialog
                    trigger={
                      <>
                        <Trash2 className="size-4" aria-hidden="true" />
                        Delete
                      </>
                    }
                    title="Delete this check-in?"
                    description="This removes the check-in from your history and charts. It cannot be undone."
                    confirmLabel="Delete check-in"
                    onConfirm={async () => {
                      const result = await actions.deleteMood(record.id);
                      if (!result.ok) setActionError(result.error);
                      if (editingId === record.id) cancelEdit();
                    }}
                  />
                </div>
              </li>
            ))}
          </ul>
          <PaginationControls
            label="Check-in pages"
            page={page}
            pageCount={pageCount}
            total={total}
            onChange={setPage}
          />
          <p className="text-xs text-navy-soft">
            Only you can see these records.{" "}
            <Link href="/progress" className="underline">
              See progress
            </Link>
            .
          </p>
        </section>
      </div>
    </>
  );
}

export default function MoodPage() {
  return (
    <Suspense fallback={null}>
      <MoodTracker />
    </Suspense>
  );
}
