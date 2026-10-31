import { z } from "zod";

// Client-side validation only. The server re-validates every field (Phase 4).

export const emailSchema = z
  .string()
  .trim()
  .min(1, "Enter your email address.")
  .max(254, "Keep the email under 254 characters.")
  .email("Enter a valid email address.");

export const signInSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Enter your password."),
});

export const signUpSchema = z.object({
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
