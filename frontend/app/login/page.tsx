"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { FormField, controlA11y } from "@/components/common/form-field";
import { Notice } from "@/components/common/notice";
import { AuthLayout } from "@/components/layout/auth-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useStore } from "@/lib/store";
import { signInSchema, type SignInValues } from "@/lib/schemas/auth";
import {
  DEMO_ACCOUNTS,
  DEMO_MODE,
  DEMO_PASSWORD,
  type DemoAccount,
} from "@/lib/demo/config";
import { resetDemoData } from "@/lib/demo/demo-api";

// The server checks the password and the role. Accounts are created by students and psychologists at sign-up.
// Administrator accounts are created by the seed script (development) or by an administrator (later).

const HOME_FOR_ROLE = {
  student: "/dashboard",
  psychologist: "/psychologist/workspace",
  admin: "/admin",
} as const;

// Only allow same-site relative paths in ?next=, to avoid open redirects.
const safeNext = (value: string | null) =>
  value && value.startsWith("/") && !value.startsWith("//") ? value : null;

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const { actions, sessionExpired } = useStore();
  const [formError, setFormError] = useState<string | null>(null);

  const form = useForm<SignInValues>({
    resolver: zodResolver(signInSchema),
    defaultValues: { role: "student", email: "", password: "" },
  });
  const { register, handleSubmit, formState, control } = form;
  const errors = formState.errors;

  // Demo mode only: one click signs in as a fictional account.
  const demoSignIn = async (account: DemoAccount) => {
    setFormError(null);
    const result = await actions.signIn(
      account.email,
      account.role,
      DEMO_PASSWORD,
    );
    if (!result.ok) {
      setFormError(result.error);
      return;
    }
    router.push(HOME_FOR_ROLE[result.value.role]);
  };

  const submit = handleSubmit(async (values) => {
    setFormError(null);
    const result = await actions.signIn(
      values.email,
      values.role,
      values.password,
    );
    if (!result.ok) {
      setFormError(result.error);
      return;
    }
    router.push(
      safeNext(params.get("next")) ?? HOME_FOR_ROLE[result.value.role],
    );
  });

  return (
    <AuthLayout
      title="Welcome back"
      description="Log in to continue to your check-ins and resources."
      footer={
        <>
          New here?{" "}
          <Link
            href="/signup"
            className="font-medium text-navy underline underline-offset-4"
          >
            Create an account
          </Link>
        </>
      }
    >
      <div className="space-y-5">
        {DEMO_MODE && (
          <section
            aria-labelledby="demo-accounts-heading"
            className="space-y-3 rounded-xl border border-navy/20 p-4"
          >
            <div className="space-y-1">
              <h2 id="demo-accounts-heading" className="text-sm font-semibold">
                Demo accounts
              </h2>
              <p className="text-sm text-navy-soft">
                This demo runs entirely in your browser with fictional data.
                Nothing is sent to a server. Password for every account:{" "}
                <span className="font-mono">{DEMO_PASSWORD}</span>
              </p>
            </div>
            <div className="grid gap-2">
              {DEMO_ACCOUNTS.map((account) => (
                <Button
                  key={account.email}
                  type="button"
                  variant="outline"
                  className="h-auto min-h-11 justify-start py-2 text-left"
                  disabled={formState.isSubmitting}
                  onClick={() => demoSignIn(account)}
                >
                  <span className="flex flex-col items-start">
                    <span className="font-medium">{account.label}</span>
                    <span className="text-xs font-normal text-navy-soft">
                      {account.description}
                    </span>
                  </span>
                </Button>
              ))}
            </div>
            <button
              type="button"
              className="text-sm font-medium underline underline-offset-4"
              onClick={() => {
                resetDemoData();
                window.location.reload();
              }}
            >
              Reset demo data
            </button>
          </section>
        )}
        {sessionExpired && (
          <Notice tone="warning">
            Your session ended after 30 minutes without activity. Please log in
            again.
          </Notice>
        )}
        {formError && <Notice tone="error">{formError}</Notice>}

        <form onSubmit={submit} noValidate className="space-y-5">
          <fieldset className="space-y-3">
            <legend className="text-sm font-medium">I am a</legend>
            <Controller
              name="role"
              control={control}
              render={({ field }) => (
                <RadioGroup
                  value={field.value}
                  onValueChange={(value) => field.onChange(value)}
                  className="grid gap-2"
                >
                  {[
                    { value: "student", label: "Student" },
                    { value: "psychologist", label: "Psychologist" },
                    { value: "admin", label: "Administrator" },
                  ].map((option) => (
                    <div
                      key={option.value}
                      className="flex min-h-11 items-center gap-3"
                    >
                      <RadioGroupItem
                        id={`login-role-${option.value}`}
                        value={option.value}
                      />
                      <Label
                        htmlFor={`login-role-${option.value}`}
                        className="font-normal"
                      >
                        {option.label}
                      </Label>
                    </div>
                  ))}
                </RadioGroup>
              )}
            />
            {errors.role && (
              <p id="role-error" className="text-sm font-medium text-danger">
                {errors.role.message}
              </p>
            )}
          </fieldset>

          <FormField id="email" label="Email" error={errors.email?.message}>
            <Input
              type="email"
              autoComplete="email"
              {...register("email")}
              {...controlA11y("email", errors.email?.message)}
            />
          </FormField>
          <FormField
            id="password"
            label="Password"
            error={errors.password?.message}
          >
            <Input
              type="password"
              autoComplete="current-password"
              {...register("password")}
              {...controlA11y("password", errors.password?.message)}
            />
          </FormField>
          <div className="flex justify-end">
            <Link
              href="/forgot-password"
              className="text-sm font-medium underline underline-offset-4"
            >
              Forgot password?
            </Link>
          </div>
          <Button
            type="submit"
            className="w-full"
            disabled={formState.isSubmitting}
          >
            {formState.isSubmitting ? "Logging in…" : "Log in"}
          </Button>
        </form>
      </div>
    </AuthLayout>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}
