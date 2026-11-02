"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { ConfirmDialog } from "@/components/common/confirm-dialog";
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
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  accountFormSchema,
  type AccountFormValues,
} from "@/lib/schemas/professional";
import { useStore } from "@/lib/store";
import { CONSENT_SCOPES, type ConsentScope } from "@/lib/types";

// SCR-14 Profile & Settings: basic details, sharing choices, data export and account deletion (A-08).

export default function SettingsPage() {
  const router = useRouter();
  const { me, mine, data, actions } = useStore();
  const [notice, setNotice] = useState<{
    tone: "success" | "error";
    text: string;
  } | null>(null);

  const form = useForm<AccountFormValues>({
    resolver: zodResolver(accountFormSchema),
    values: { name: me?.name ?? "", email: me?.email ?? "" },
  });
  const { register, handleSubmit, formState } = form;
  const errors = formState.errors;

  const save = handleSubmit(async (values) => {
    const result = await actions.updateAccount(values);
    setNotice(
      result.ok
        ? { tone: "success", text: "Your details are saved." }
        : { tone: "error", text: result.error },
    );
  });

  const isGranted = (scope: ConsentScope, recipientId: string) =>
    mine.consents.some(
      (c) => c.scope === scope && c.recipientId === recipientId && c.granted,
    );

  const exportData = () => {
    const payload = {
      exportedAt: new Date().toISOString(),
      profile: { name: me?.name, email: me?.email },
      moodRecords: mine.moods,
      journalEntries: mine.journal,
      questionnaireResults: mine.results,
      appointments: mine.appointments,
      sharingChoices: mine.consents,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "mindbridge-data.json";
    link.click();
    URL.revokeObjectURL(url);
  };

  const removeAccount = async () => {
    const result = await actions.deleteAccount();
    if (result.ok) router.push("/");
    else setNotice({ tone: "error", text: result.error });
  };

  return (
    <>
      <PageHeader
        title="Profile & settings"
        description="Control your details, what is shared, and your data."
      />

      {notice && (
        <div className="mb-6">
          <Notice tone={notice.tone === "error" ? "error" : "success"}>
            {notice.text}
          </Notice>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Basic details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <form onSubmit={save} noValidate className="space-y-5">
              <FormField id="name" label="Name" error={errors.name?.message}>
                <Input
                  {...register("name")}
                  {...controlA11y("name", errors.name?.message)}
                />
              </FormField>
              <FormField id="email" label="Email" error={errors.email?.message}>
                <Input
                  type="email"
                  {...register("email")}
                  {...controlA11y("email", errors.email?.message)}
                />
              </FormField>
              <Button type="submit" disabled={formState.isSubmitting}>
                Save details
              </Button>
            </form>
            <div className="border-t border-border pt-5">
              <h3 className="font-semibold">Password</h3>
              <p className="mt-1 text-sm text-navy-soft">
                Password changes will be available once the account service is
                connected.
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Sharing with psychologists</CardTitle>
            <CardDescription>
              Nothing is shared unless you turn it on. You can change this at
              any time. Your journal is never shared.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {data.psychologists
              .filter((p) => p.approvedProfile)
              .map((p) => (
                <fieldset
                  key={p.id}
                  className="space-y-2 rounded-xl border border-border p-4"
                >
                  <legend className="px-1 font-medium">{p.name}</legend>
                  {CONSENT_SCOPES.map((scope) => {
                    const id = `consent-${p.id}-${scope.replace(/\W+/g, "-")}`;
                    return (
                      <div
                        key={scope}
                        className="flex min-h-11 items-center gap-3"
                      >
                        <Checkbox
                          id={id}
                          checked={isGranted(scope, p.id)}
                          onCheckedChange={async (checked) => {
                            const result = await actions.setConsent(
                              scope,
                              p.id,
                              checked === true,
                            );
                            if (!result.ok)
                              setNotice({ tone: "error", text: result.error });
                          }}
                        />
                        <Label htmlFor={id} className="font-normal">
                          Share {scope.toLowerCase()}
                        </Label>
                      </div>
                    );
                  })}
                </fieldset>
              ))}
          </CardContent>
        </Card>

        <Card className="bg-sky">
          <CardHeader>
            <CardTitle>What we store and why</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <ul className="list-disc space-y-1 pl-5 text-sm">
              <li>
                Your name and email, so you can sign in and be contacted about
                bookings.
              </li>
              <li>Mood, stress and sleep check-ins, to show your progress.</li>
              <li>Journal entries, kept private to you.</li>
              <li>
                Appointments and sharing choices, so psychologists only see what
                you allow.
              </li>
            </ul>
            <Button variant="outline" onClick={exportData}>
              Download my data (JSON)
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Account</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button
              variant="outline"
              onClick={async () => await actions.signOut()}
            >
              Log out
            </Button>
            <div className="border-t border-border pt-4">
              <h3 className="font-semibold">Delete account</h3>
              <p className="mt-1 text-sm text-navy-soft">
                This removes your check-ins, journal, appointments and sharing
                choices from this service. It cannot be undone.
              </p>
              <div className="mt-3">
                <ConfirmDialog
                  trigger="Delete account"
                  title="Delete your account?"
                  description="All your check-ins, journal entries, appointments and sharing choices will be removed. This cannot be undone."
                  confirmLabel="Yes, delete everything"
                  onConfirm={removeAccount}
                />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
