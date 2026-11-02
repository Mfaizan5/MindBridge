"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
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
  settingsFormSchema,
  type SettingsFormValues,
} from "@/lib/schemas/admin";

// Platform settings. Changes are audited.

export default function AdminSettingsPage() {
  const { data, actions } = useStore();
  const [notice, setNotice] = useState<{
    tone: "success" | "error";
    text: string;
  } | null>(null);

  const form = useForm<SettingsFormValues>({
    resolver: zodResolver(settingsFormSchema),
    values: { cancellationWindowHours: data.settings.cancellationWindowHours },
  });
  const { register, handleSubmit, formState } = form;
  const errors = formState.errors;

  const save = handleSubmit(async (values) => {
    const result = await actions.saveSettings(values.cancellationWindowHours);
    setNotice(
      result.ok
        ? {
            tone: "success",
            text: "Settings saved and recorded in the audit log.",
          }
        : { tone: "error", text: result.error },
    );
  });

  return (
    <>
      <PageHeader
        title="Settings"
        description="Platform rules that apply to everyone."
      />

      {notice && (
        <div className="mb-6">
          <Notice tone={notice.tone === "error" ? "error" : "success"}>
            {notice.text}
          </Notice>
        </div>
      )}

      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle>Appointment cancellation</CardTitle>
          <CardDescription>
            Students can cancel an appointment only if it is at least this many
            hours away. Psychologists can always cancel their own bookings.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={save} noValidate className="space-y-5">
            <FormField
              id="cancellationWindowHours"
              label="Cancellation window (hours)"
              hint="Use 0 to 168. The current policy text is a placeholder until it is approved (A-15)."
              error={errors.cancellationWindowHours?.message}
            >
              <Input
                type="number"
                min={0}
                max={168}
                {...register("cancellationWindowHours", {
                  valueAsNumber: true,
                })}
                {...controlA11y(
                  "cancellationWindowHours",
                  errors.cancellationWindowHours?.message,
                )}
              />
            </FormField>
            <Button type="submit" disabled={formState.isSubmitting}>
              Save settings
            </Button>
          </form>
        </CardContent>
      </Card>
    </>
  );
}
