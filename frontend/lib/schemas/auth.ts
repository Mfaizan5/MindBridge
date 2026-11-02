import { z } from "zod";

// Client-side validation only. The server re-validates every field (Phase 4).

export const emailSchema = z
  .string()
  .trim()
  .min(1, "Enter your email address.")
  .max(254, "Keep the email under 254 characters.")
  .email("Enter a valid email address.");

export const signInSchema = z.object({
  role: z.enum(["student", "psychologist", "admin"], {
    error: "Choose student, psychologist or administrator.",
  }),
  email: emailSchema,
  password: z.string().min(1, "Enter your password."),
});

export const signUpSchema = z.object({
  // Administrator accounts are never offered here. Psychologist accounts are unverified until an administrator checks them.
  role: z.enum(["student", "psychologist"], {
    error: "Choose student or psychologist.",
  }),
  name: z
    .string()
    .trim()
    .min(1, "Enter your name.")
    .max(100, "Keep your name under 100 characters."),
  email: emailSchema,
  password: z.string().min(8, "Use at least 8 characters."),
  terms: z
    .boolean()
    .refine(
      (accepted) => accepted,
      "Please accept the terms and privacy policy to continue.",
    ),
});

export const forgotPasswordSchema = z.object({
  email: emailSchema,
});

export type SignInValues = z.infer<typeof signInSchema>;
export type SignUpValues = z.infer<typeof signUpSchema>;
export type ForgotPasswordValues = z.infer<typeof forgotPasswordSchema>;
