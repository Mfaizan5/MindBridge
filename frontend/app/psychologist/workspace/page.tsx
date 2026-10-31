"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { ButtonLink } from "@/components/common/button-link";
import { EmptyState } from "@/components/common/empty-state";
import { FormField, controlA11y } from "@/components/common/form-field";
import { Notice } from "@/components/common/notice";
import { PageHeader } from "@/components/common/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { appointmentViews, openSlots, splitUpcoming } from "@/lib/selectors";
import { useStore } from "@/lib/store";
import {
  psychologistProfileSchema,
  qualificationFormSchema,
  type PsychologistProfileValues,
} from "@/lib/schemas/professional";
import type { QualificationStatus } from "@/lib/types";

// SCR-16 Psychologist Workspace: dashboard, profile management, qualification submission and verification status.

const QUAL_TONE: Record<
  QualificationStatus,
  "default" | "secondary" | "destructive" | "outline"
> = {
  Submitted: "outline",
  Verified: "secondary",
  Rejected: "destructive",
};

export default function PsychologistWorkspacePage() {
  const { data, myPsychologist, actions } = useStore();
  const [notice, setNotice] = useState<{
    tone: "success" | "error";
    text: string;
  } | null>(null);
  const [qualNotice, setQualNotice] = useState<{
    tone: "success" | "error";
    text: string;
  } | null>(null);
  const now = new Date();

  const profileForm = useForm<PsychologistProfileValues>({
    resolver: zodResolver(psychologistProfileSchema),
    values: myPsychologist
      ? {
          specialization: myPsychologist.specialization,
          bio: myPsychologist.bio,
          experienceYears: myPsychologist.experienceYears,
          fee: myPsychologist.fee ? String(myPsychologist.fee.amount) : "",
          currency: (myPsychologist.fee?.currency ??
            "USD") as PsychologistProfileValues["currency"],
          format: myPsychologist.format ?? "",
        }
      : undefined,
  });
  const qualForm = useForm({
    resolver: zodResolver(qualificationFormSchema),
    defaultValues: { title: "", institution: "", year: now.getFullYear() },
  });

  if (!myPsychologist) {
    return (
      <EmptyState
        title="No profile linked"
        body="Your account is not linked to a psychologist profile yet."
      />
    );
  }

  const views = appointmentViews(
    data,
    data.appointments.filter((a) => a.psychologistId === myPsychologist.id),
    now,
  );
  const { upcoming } = splitUpcoming(views);
  const pending = views.filter(
    (v) => v.appointment.status === "Pending",
  ).length;
  const open = openSlots(data, myPsychologist.id, now).length;

  const saveProfile = profileForm.handleSubmit((values) => {
    const fee =
      values.fee === ""
        ? null
        : { amount: Number(values.fee), currency: values.currency };
    const result = actions.updatePsychologistProfile({
      specialization: values.specialization,
      bio: values.bio,
      experienceYears: values.experienceYears,
      fee,
      format: values.format === "" ? null : values.format,
    });
    setNotice(
      result.ok
        ? { tone: "success", text: "Profile saved." }
        : { tone: "error", text: result.error },
    );
  });

  const submitQualification = qualForm.handleSubmit((values) => {
    const result = actions.submitQualification(values);
    if (result.ok) {
      setQualNotice({
        tone: "success",
        text: "Submitted for review. An administrator will check it before the badge appears.",
      });
      qualForm.reset({ title: "", institution: "", year: now.getFullYear() });
    } else {
      setQualNotice({ tone: "error", text: result.error });
    }
  });

  const pErrors = profileForm.formState.errors;
  const qErrors = qualForm.formState.errors;

  return (
    <>
      <PageHeader
        title={`Welcome, ${myPsychologist.name}`}
        description="Your profile, verification status and bookings."
        action={
          <div className="flex flex-wrap gap-2">
            <ButtonLink
              href="/psychologist/workspace/availability"
              variant="outline"
            >
              Manage availability
            </ButtonLink>
            <ButtonLink
              href="/psychologist/workspace/appointments"
              variant="outline"
            >
              View appointments
            </ButtonLink>
          </div>
        }
      />

      <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Awaiting your confirmation", value: pending },
          { label: "Upcoming appointments", value: upcoming.length },
          { label: "Open times", value: open },
          {
            label: "Verification",
            value: myPsychologist.verified ? "Verified" : "Pending",
          },
        ].map((stat) => (
          <Card key={stat.label}>
            <CardContent className="pt-6">
              <dt className="text-sm text-navy-soft">{stat.label}</dt>
              <dd className="mt-1 text-2xl font-semibold">{stat.value}</dd>
            </CardContent>
          </Card>
        ))}
      </dl>

      <div className="mt-8 grid gap-6 lg:grid-cols-5">
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle>Profile</CardTitle>
            <CardDescription>
              Shown to students once your profile is published. Fees and format
              appear only when you have set them.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {notice && (
              <div className="mb-4">
                <Notice tone={notice.tone === "error" ? "error" : "success"}>
                  {notice.text}
                </Notice>
              </div>
            )}
            <form onSubmit={saveProfile} noValidate className="space-y-5">
              <FormField
                id="specialization"
                label="Specialization"
                error={pErrors.specialization?.message}
              >
                <Input
                  {...profileForm.register("specialization")}
                  {...controlA11y(
                    "specialization",
                    pErrors.specialization?.message,
                  )}
                />
              </FormField>
              <FormField
                id="bio"
                label="Introduction"
                error={pErrors.bio?.message}
              >
                <Textarea
                  rows={4}
                  {...profileForm.register("bio")}
                  {...controlA11y("bio", pErrors.bio?.message)}
                />
              </FormField>
              <div className="grid gap-4 sm:grid-cols-2">
                <FormField
                  id="experienceYears"
                  label="Years of experience"
                  error={pErrors.experienceYears?.message}
                >
                  <Input
                    type="number"
                    min={0}
                    max={70}
                    {...profileForm.register("experienceYears", {
                      valueAsNumber: true,
                    })}
                    {...controlA11y(
                      "experienceYears",
                      pErrors.experienceYears?.message,
                    )}
                  />
                </FormField>
                <FormField
                  id="format"
                  label="Format"
                  error={pErrors.format?.message}
                >
                  <select
                    className="min-h-11 w-full rounded-xl border border-input bg-white px-3 py-2"
                    {...profileForm.register("format")}
                    {...controlA11y("format", pErrors.format?.message)}
                  >
                    <option value="">Not set</option>
                    <option value="Online">Online</option>
                    <option value="In person">In person</option>
                  </select>
                </FormField>
              </div>
              <div className="grid gap-4 sm:grid-cols-[1fr_auto]">
                <FormField
                  id="fee"
                  label="Fee per session"
                  hint="Leave empty if not set yet."
                  error={pErrors.fee?.message}
                >
                  <Input
                    inputMode="decimal"
                    {...profileForm.register("fee")}
                    {...controlA11y("fee", pErrors.fee?.message)}
                  />
                </FormField>
                <FormField
                  id="currency"
                  label="Currency"
                  error={pErrors.currency?.message}
                >
                  <select
                    id="currency"
                    className="min-h-11 rounded-xl border border-input bg-white px-3 py-2"
                    {...profileForm.register("currency")}
                  >
                    <option value="USD">USD</option>
                    <option value="EUR">EUR</option>
                    <option value="GBP">GBP</option>
                  </select>
                </FormField>
              </div>
              <Button
                type="submit"
                disabled={profileForm.formState.isSubmitting}
              >
                Save profile
              </Button>
            </form>
          </CardContent>
        </Card>

        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Verification status</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <p>
                {myPsychologist.verified ? (
                  <Badge variant="secondary">Verified</Badge>
                ) : (
                  <Badge variant="outline">Pending administrator review</Badge>
                )}
              </p>
              <p className="text-navy-soft">
                Students see the verified badge only after an administrator has
                checked your credentials.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Qualifications</CardTitle>
              <CardDescription>
                Submit each qualification or registration for review.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <ul className="space-y-2 text-sm">
                {myPsychologist.qualifications.map((q) => (
                  <li
                    key={q.id}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border p-3"
                  >
                    <span>
                      {q.title}, {q.institution} ({q.year})
                    </span>
                    <Badge variant={QUAL_TONE[q.status]}>{q.status}</Badge>
                  </li>
                ))}
              </ul>
              {qualNotice && (
                <Notice
                  tone={qualNotice.tone === "error" ? "error" : "success"}
                >
                  {qualNotice.text}
                </Notice>
              )}
              <form
                onSubmit={submitQualification}
                noValidate
                className="space-y-3"
              >
                <FormField
                  id="qualTitle"
                  label="Title"
                  error={qErrors.title?.message}
                >
                  <Input
                    {...qualForm.register("title")}
                    {...controlA11y("qualTitle", qErrors.title?.message)}
                  />
                </FormField>
                <FormField
                  id="qualInstitution"
                  label="Institution or registering body"
                  error={qErrors.institution?.message}
                >
                  <Input
                    {...qualForm.register("institution")}
                    {...controlA11y(
                      "qualInstitution",
                      qErrors.institution?.message,
                    )}
                  />
                </FormField>
                <FormField
                  id="qualYear"
                  label="Year"
                  error={qErrors.year?.message}
                >
                  <Input
                    type="number"
                    {...qualForm.register("year", { valueAsNumber: true })}
                    {...controlA11y("qualYear", qErrors.year?.message)}
                  />
                </FormField>
                <Button
                  type="submit"
                  variant="outline"
                  disabled={qualForm.formState.isSubmitting}
                >
                  Submit for review
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}
