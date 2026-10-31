import { z } from "zod";
import { MOOD_OPTIONS } from "../types";
import { MAX_JOURNAL_LENGTH, MAX_NOTE_LENGTH } from "../validation";

// Mood, stress and sleep check-in form. Times are local; the domain layer repeats these checks.
export const moodFormSchema = z.object({
  mood: z.enum(MOOD_OPTIONS, { error: "Choose how you feel today." }),
  stress: z
    .number({ error: "Stress must be a whole number from 1 to 10." })
    .int("Stress must be a whole number from 1 to 10.")
    .min(1, "Stress must be a whole number from 1 to 10.")
    .max(10, "Stress must be a whole number from 1 to 10."),
  // Kept as text in the form so an empty box gives a clear message. Converted with toSleepHours() after validation.
  sleepHours: z
    .string()
    .trim()
    .min(1, "Enter the hours you slept.")
    .refine(
      (v) => /^\d+(\.\d+)?$/.test(v),
      "Enter a number of hours, for example 7.5.",
    )
    .refine((v) => Number(v) <= 24, "Sleep must be between 0 and 24 hours.")
    .refine(
      (v) => Number.isInteger(Number(v) * 2),
      "Use half-hour steps, for example 7.5.",
    ),
  recordedOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Enter a valid date."),
  recordedTime: z
    .string()
    .regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Enter a valid time."),
  note: z
    .string()
    .max(MAX_NOTE_LENGTH, `Keep notes under ${MAX_NOTE_LENGTH} characters.`),
});

export const journalFormSchema = z.object({
  content: z
    .string()
    .trim()
    .min(1, "Write something before saving.")
    .max(
      MAX_JOURNAL_LENGTH,
      `Keep entries under ${MAX_JOURNAL_LENGTH} characters.`,
    ),
});

export type MoodFormValues = z.input<typeof moodFormSchema>;
export const toSleepHours = (value: string) => Number(value);
export type JournalFormValues = z.infer<typeof journalFormSchema>;
