"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { FormField, controlA11y } from "@/components/common/form-field";
import { Notice } from "@/components/common/notice";
import { AuthLayout } from "@/components/layout/auth-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { api } from "@/lib/api/client";

const schema = z
  .object({
    password: z.string().min(8, "Use at least 8 characters."),
    confirm: z.string(),
  })
  .refine((v) => v.password === v.confirm, {
    message: "The passwords do not match.",
    path: ["confirm"],
  });

type Values = z.infer<typeof schema>;

function ResetForm() {
  const params = useSearchParams();
  const token = params.get("token") ?? "";
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { password: "", confirm: "" },
  });
  const { register, handleSubmit, formState } = form;
  const errors = formState.errors;

  const submit = handleSubmit(async (values) => {
    setError(null);
    try {
      await api("POST", "/auth/password-reset/confirm", {
        token,
        password: values.password,
      });
      setDone(true);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Something went wrong. Please try again.",
      );
    }
  });

  if (!token) {
    return (
      <Notice tone="error">
        This page needs the link from your email.{" "}
        <Link href="/forgot-password" className="underline">
          Request a new link
        </Link>
        .
      </Notice>
    );
  }

  if (done) {
    return (
      <Notice tone="success">
        Your password has been changed.{" "}
        <Link href="/login" className="underline">
          Log in
        </Link>
        .
      </Notice>
    );
  }

  return (
    <form onSubmit={submit} noValidate className="space-y-5">
      {error && <Notice tone="error">{error}</Notice>}
      <FormField
        id="password"
        label="New password"
        hint="At least 8 characters."
        error={errors.password?.message}
      >
        <Input
          type="password"
          autoComplete="new-password"
          {...register("password")}
          {...controlA11y("password", errors.password?.message, "hint")}
        />
      </FormField>
      <FormField
        id="confirm"
        label="Confirm new password"
        error={errors.confirm?.message}
      >
        <Input
          type="password"
          autoComplete="new-password"
          {...register("confirm")}
          {...controlA11y("confirm", errors.confirm?.message)}
        />
      </FormField>
      <Button
        type="submit"
        className="w-full"
        disabled={formState.isSubmitting}
      >
        Set new password
      </Button>
    </form>
  );
}

export default function ResetPasswordPage() {
  return (
    <AuthLayout
      title="Choose a new password"
      description="Enter the new password for your account."
    >
      <Suspense fallback={null}>
        <ResetForm />
      </Suspense>
    </AuthLayout>
  );
}
