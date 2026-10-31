"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { AuthLayout } from "@/components/layout/auth-layout";
import { FormField, controlA11y } from "@/components/common/form-field";
import { Notice } from "@/components/common/notice";
import { Input } from "@/components/ui/input";
import { useStore } from "@/lib/store";
import { signInSchema, type SignInValues } from "@/lib/schemas/auth";

// Prototype sign-in: the account must exist, and the password is not checked until the backend (Phase 4) is in place.
// Demo accounts below exist only in the seeded development data and must be removed before any real deployment.

const DEMO_ACCOUNTS = [
  {
    label: "Demo student",
    email: "student@mindbridge.demo",
    home: "/dashboard",
  },
  {
    label: "Demo psychologist",
    email: "amara@mindbridge.demo",
    home: "/psychologist/workspace",
  },
  {
    label: "Demo administrator",
    email: "admin@mindbridge.demo",
    home: "/admin",
  },
];

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
    defaultValues: { email: "", password: "" },
  });
  const { register, handleSubmit, formState } = form;
  const errors = formState.errors;

  const finish = (fallback: string) =>
    router.push(safeNext(params.get("next")) ?? fallback);

  const submit = handleSubmit((values) => {
    setFormError(null);
    const result = actions.signIn(values.email);
    if (!result.ok) {
      setFormError(result.error);
      return;
    }
    finish("/dashboard");
  });

  const signInAsDemo = (email: string, home: string) => {
    const result = actions.signIn(email);
    if (!result.ok) {
      setFormError(result.error);
      return;
    }
    router.push(safeNext(params.get("next")) ?? home);
  };

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
        {sessionExpired && (
          <Notice tone="warning">
            Your session ended after 30 minutes without activity. Please log in
            again.
          </Notice>
        )}
        {formError && <Notice tone="error">{formError}</Notice>}

        <form onSubmit={submit} noValidate className="space-y-5">
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

        <div className="border-t border-border pt-6">
          <p className="mb-1 text-xs font-medium uppercase tracking-wide text-navy-soft">
            Demo accounts
          </p>
          <p className="mb-3 text-sm text-navy-soft">
            Development data only. Not for real use.
          </p>
          <div className="grid gap-2">
            {DEMO_ACCOUNTS.map((account) => (
              <Button
                key={account.email}
                type="button"
                variant="secondary"
                className="w-full"
                onClick={() => signInAsDemo(account.email, account.home)}
              >
                Continue as {account.label}
              </Button>
            ))}
          </div>
        </div>
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
