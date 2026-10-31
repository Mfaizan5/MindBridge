import { z } from "zod";

export const accountFormSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Enter your name.")
    .max(100, "Keep your name under 100 characters."),
  email: z
    .string()
    .trim()
    .min(1, "Enter your email address.")
    .email("Enter a valid email address."),
});

export const psychologistProfileSchema = z.object({
  specialization: z
    .string()
    .trim()
    .min(1, "Enter your specialization.")
    .max(200, "Keep it under 200 characters."),
  bio: z
    .string()
    .trim()
    .max(1000, "Keep your introduction under 1000 characters."),
  experienceYears: z
    .number({ error: "Enter your years of experience." })
    .int("Experience must be a whole number of years.")
    .min(0, "Experience cannot be negative.")
    .max(70, "Check the number of years."),
  // Empty means "not set yet". Fees are shown to students only once the psychologist has confirmed them (VR-09).
  fee: z
    .string()
    .trim()
    .refine(
      (v) => v === "" || (/^\d+(\.\d{1,2})?$/.test(v) && Number(v) <= 10000),
      "Enter a fee such as 40, or leave it empty.",
    ),
  currency: z.enum(["USD", "EUR", "GBP"], { error: "Choose a currency." }),
  format: z.enum(["Online", "In person", ""], { error: "Choose a format." }),
});

export const qualificationFormSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, "Enter the qualification or registration title.")
    .max(200, "Keep it under 200 characters."),
  institution: z
    .string()
    .trim()
    .min(1, "Enter the awarding institution or registering body.")
    .max(200, "Keep it under 200 characters."),
  year: z
    .number({ error: "Enter the year." })
    .int("Enter a whole year.")
    .min(1950, "Year must be 1950 or later.")
    .max(new Date().getFullYear(), "The year cannot be in the future."),
});

export const availabilityFormSchema = z
  .object({
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Choose a date."),
    startTime: z
      .string()
      .regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Enter a start time."),
    endTime: z
      .string()
      .regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Enter an end time."),
  })
  .refine((v) => v.endTime > v.startTime, {
    message: "The end time must be after the start time.",
    path: ["endTime"],
  });

export type AccountFormValues = z.infer<typeof accountFormSchema>;
export type PsychologistProfileValues = z.input<
  typeof psychologistProfileSchema
>;
export type QualificationFormValues = z.infer<typeof qualificationFormSchema>;
export type AvailabilityFormValues = z.infer<typeof availabilityFormSchema>;
