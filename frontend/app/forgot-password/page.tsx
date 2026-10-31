"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { AuthLayout } from "@/components/layout/auth-layout";
import { FormField, controlA11y } from "@/components/common/form-field";
import { Notice } from "@/components/common/notice";
import { Input } from "@/components/ui/input";
import {
  forgotPasswordSchema,
  type ForgotPasswordValues,
} from "@/lib/schemas/auth";

// Reset delivery needs the backend and an email provider (A-12). This page only confirms the request
// without revealing whether an account exists, which avoids account enumeration.

export default function ForgotPasswordPage() {
  const [sent, setSent] = useState(false);
  const form = useForm<ForgotPasswordValues>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: "" },
  });
  const { register, handleSubmit, formState } = form;
  const errors = formState.errors;

  const submit = handleSubmit(() => setSent(true));

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
