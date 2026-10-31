import { z } from "zod";
import { RESOURCE_CATEGORIES } from "../types";

export const resourceFormSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, "Enter a title.")
    .max(160, "Keep the title under 160 characters."),
  category: z.enum(RESOURCE_CATEGORIES, { error: "Choose a category." }),
  summary: z
    .string()
    .trim()
    .min(1, "Enter a short summary.")
    .max(300, "Keep the summary under 300 characters."),
  body: z.string().max(10000, "Keep the body under 10000 characters."),
  source: z
    .string()
    .trim()
    .min(1, "Enter a source. Every resource needs one.")
    .max(200, "Keep the source under 200 characters."),
  readingMinutes: z
    .number({ error: "Enter the reading time in minutes." })
    .int("Use whole minutes.")
    .min(1, "Reading time must be 1 to 60 minutes.")
    .max(60, "Reading time must be 1 to 60 minutes."),
  published: z.boolean(),
});

export const settingsFormSchema = z.object({
  cancellationWindowHours: z
    .number({ error: "Enter a number of hours." })
    .int("Use whole hours.")
    .min(0, "Use 0 to 168 hours.")
    .max(168, "Use 0 to 168 hours."),
});

export type ResourceFormValues = z.infer<typeof resourceFormSchema>;
export type SettingsFormValues = z.infer<typeof settingsFormSchema>;
