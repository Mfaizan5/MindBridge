"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Trash2 } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { ConfirmDialog } from "@/components/common/confirm-dialog";
import { EmptyState } from "@/components/common/empty-state";
import { FormField, controlA11y } from "@/components/common/form-field";
import { Notice } from "@/components/common/notice";
import { PageHeader } from "@/components/common/page-header";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useStore } from "@/lib/store";
import {
  availabilityFormSchema,
  type AvailabilityFormValues,
} from "@/lib/schemas/professional";
import { formatDate, localDateKey } from "@/lib/validation";

// SCR-16 availability management (FR-16). Overlaps are rejected. Booked times cannot be removed.

export default function AvailabilityPage() {
  const { data, myPsychologist, actions } = useStore();
  const [notice, setNotice] = useState<{
    tone: "success" | "error";
    text: string;
  } | null>(null);
  const today = localDateKey();

  const form = useForm<AvailabilityFormValues>({
    resolver: zodResolver(availabilityFormSchema),
    defaultValues: { date: today, startTime: "09:00", endTime: "09:50" },
  });
  const { register, handleSubmit, formState, reset } = form;
  const errors = formState.errors;

  if (!myPsychologist)
    return (
      <EmptyState
        title="No profile linked"
        body="Your account is not linked to a psychologist profile yet."
      />
    );

  const mine = data.slots
    .filter((s) => s.psychologistId === myPsychologist.id && s.date >= today)
    .sort((a, b) =>
      `${a.date}${a.startTime}`.localeCompare(`${b.date}${b.startTime}`),
    );

  const add = handleSubmit((values) => {
    const result = actions.addSlot(values);
    if (result.ok) {
      setNotice({
        tone: "success",
        text: `Added ${formatDate(values.date)}, ${values.startTime} – ${values.endTime}.`,
      });
      reset({ ...values });
    } else {
      setNotice({ tone: "error", text: result.error });
    }
  });

  return (
    <>
      <PageHeader
        title="Availability"
        description="Add the times students can book. Times cannot overlap, and booked times cannot be removed."
      />

      {notice && (
        <div className="mb-6">
          <Notice tone={notice.tone === "error" ? "error" : "success"}>
            {notice.text}
          </Notice>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-5">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Add a time</CardTitle>
            <CardDescription>
              Slots are between 15 minutes and 4 hours long.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={add} noValidate className="space-y-4">
              <FormField id="date" label="Date" error={errors.date?.message}>
                <Input
                  type="date"
                  min={today}
                  {...register("date")}
                  {...controlA11y("date", errors.date?.message)}
                />
              </FormField>
              <FormField
                id="startTime"
                label="Start"
                error={errors.startTime?.message}
              >
                <Input
                  type="time"
                  {...register("startTime")}
                  {...controlA11y("startTime", errors.startTime?.message)}
                />
              </FormField>
              <FormField
                id="endTime"
                label="End"
                error={errors.endTime?.message}
              >
                <Input
                  type="time"
                  {...register("endTime")}
                  {...controlA11y("endTime", errors.endTime?.message)}
                />
              </FormField>
              <Button
                type="submit"
                className="w-full"
                disabled={formState.isSubmitting}
              >
                Add time
              </Button>
            </form>
          </CardContent>
        </Card>

        <section
          aria-labelledby="upcoming-slots"
          className="space-y-3 lg:col-span-3"
        >
          <h2 id="upcoming-slots" className="text-lg font-semibold">
            Upcoming times
          </h2>
          {mine.length === 0 ? (
            <EmptyState
              title="No upcoming times"
              body="Add a time to let students book with you."
            />
          ) : (
            <ul className="space-y-2">
              {mine.map((slot) => (
                <li
                  key={slot.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-white p-4"
                >
                  <div>
                    <p className="font-medium">{formatDate(slot.date)}</p>
                    <p className="text-sm text-navy-soft">
                      {slot.startTime} – {slot.endTime} ·{" "}
                      {slot.bookedBy ? "Booked" : "Open"}
                    </p>
                  </div>
                  {!slot.bookedBy && (
                    <ConfirmDialog
                      trigger={
                        <>
                          <Trash2 className="size-4" aria-hidden="true" />
                          Remove
                        </>
                      }
                      title="Remove this time?"
                      description="Students will no longer be able to book this time."
                      confirmLabel="Remove time"
                      onConfirm={() => {
                        const result = actions.removeSlot(slot.id);
                        setNotice(
                          result.ok
                            ? { tone: "success", text: "Time removed." }
                            : { tone: "error", text: result.error },
                        );
                      }}
                    />
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </>
  );
}
