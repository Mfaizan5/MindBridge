"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { FormField, controlA11y } from "@/components/common/form-field";
import { Notice } from "@/components/common/notice";
import { AuthLayout } from "@/components/layout/auth-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { api } from "@/lib/api/client";
import {
  forgotPasswordSchema,
  type ForgotPasswordValues,
} from "@/lib/schemas/auth";

// The server answers the same way whether or not the account exists. In development the reset link is written to the
// backend log, because email delivery is not configured (A-12).

export default function ForgotPasswordPage() {
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const form = useForm<ForgotPasswordValues>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: "" },
  });
  const { register, handleSubmit, formState } = form;
  const errors = formState.errors;

  const submit = handleSubmit(async (values) => {
    setError(null);
    try {
      await api("POST", "/auth/password-reset/request", {
        email: values.email,
      });
      setSent(true);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Something went wrong. Please try again.",
      );
    }
  });

  return (
    <AuthLayout
      title="Reset your password"
      description="Enter the email you signed up with and we will send a link to reset your password."
      footer={
        <Link
          href="/login"
          className="font-medium text-navy underline underline-offset-4"
        >
          Back to log in
        </Link>
      }
    >
      {sent ? (
        <Notice tone="success">
          If an account exists for that address, a reset link is on its way. The
          link expires after a short time.
        </Notice>
      ) : (
        <form onSubmit={submit} noValidate className="space-y-5">
          {error && <Notice tone="error">{error}</Notice>}
          <FormField id="email" label="Email" error={errors.email?.message}>
            <Input
              type="email"
              autoComplete="email"
              {...register("email")}
              {...controlA11y("email", errors.email?.message)}
            />
          </FormField>
          <Button
            type="submit"
            className="w-full"
            disabled={formState.isSubmitting}
          >
            Send reset link
          </Button>
        </form>
      )}
    </AuthLayout>
  );
}
