"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { FormField, controlA11y } from "@/components/common/form-field";
import { Notice } from "@/components/common/notice";
import { AuthLayout } from "@/components/layout/auth-layout";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useStore } from "@/lib/store";
import { signUpSchema, type SignUpValues } from "@/lib/schemas/auth";

// Collects name and email as profile data (VR-13). The password is sent to the server, which stores only a hash.
// Students and psychologists can register here. Administrator accounts cannot be self-created (VR-12).
// A psychologist account is unverified until an administrator checks the credentials.

export default function SignupPage() {
  const router = useRouter();
  const { actions } = useStore();
  const [formError, setFormError] = useState<string | null>(null);

  const form = useForm<SignUpValues>({
    resolver: zodResolver(signUpSchema),
    defaultValues: {
      role: "student",
      name: "",
      email: "",
      password: "",
      terms: false,
    },
  });
  const { register, handleSubmit, formState, control } = form;
  const errors = formState.errors;
  const role = useWatch({ control, name: "role" });

  const submit = handleSubmit(async (values) => {
    setFormError(null);
    const result = await actions.signUp({
      name: values.name,
      email: values.email,
      password: values.password,
      role: values.role,
    });
    if (!result.ok) {
      setFormError(result.error);
      return;
    }
    router.push(
      result.value.role === "psychologist"
        ? "/psychologist/workspace"
        : "/dashboard",
    );
  });

  return (
    <AuthLayout
      title="Create your account"
      description="It only takes a moment. You can add more details later in Profile & Settings."
      footer={
        <>
          Already have an account?{" "}
          <Link
            href="/login"
            className="font-medium text-navy underline underline-offset-4"
          >
            Log in
          </Link>
        </>
      }
    >
      <form onSubmit={submit} noValidate className="space-y-5">
        {formError && <Notice tone="error">{formError}</Notice>}

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
                ].map((option) => (
                  <div
                    key={option.value}
                    className="flex min-h-11 items-center gap-3"
                  >
                    <RadioGroupItem
                      id={`role-${option.value}`}
                      value={option.value}
                    />
                    <Label
                      htmlFor={`role-${option.value}`}
                      className="font-normal"
                    >
                      {option.label}
                    </Label>
                  </div>
                ))}
              </RadioGroup>
            )}
          />
          {role === "psychologist" && (
            <p className="text-sm text-navy-soft">
              After sign-up you will add your qualifications. Your profile is
              shown to students only after an administrator has verified it.
            </p>
          )}
          {errors.role && (
            <p id="role-error" className="text-sm font-medium text-danger">
              {errors.role.message}
            </p>
          )}
        </fieldset>

        <FormField id="name" label="Name" error={errors.name?.message}>
          <Input
            autoComplete="name"
            {...register("name")}
            {...controlA11y("name", errors.name?.message)}
          />
        </FormField>
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

        <div className="space-y-1">
          <div className="flex items-start gap-3">
            <Controller
              name="terms"
              control={control}
              render={({ field }) => (
                <Checkbox
                  id="terms"
                  checked={field.value}
                  onCheckedChange={(checked) =>
                    field.onChange(checked === true)
                  }
                  aria-invalid={errors.terms ? true : undefined}
                  aria-describedby={errors.terms ? "terms-error" : undefined}
                  className="mt-1"
                />
              )}
            />
            <label htmlFor="terms" className="text-sm">
              I agree to the{" "}
              <Link href="/terms" className="underline underline-offset-4">
                terms
              </Link>{" "}
              and{" "}
              <Link href="/privacy" className="underline underline-offset-4">
                privacy notice
              </Link>
              .
            </label>
          </div>
          {errors.terms && (
            <p id="terms-error" className="text-sm font-medium text-danger">
              {errors.terms.message}
            </p>
          )}
        </div>

        <Button
          type="submit"
          className="w-full"
          disabled={formState.isSubmitting}
        >
          {formState.isSubmitting ? "Creating account…" : "Create account"}
        </Button>
      </form>
    </AuthLayout>
  );
}
