import { MOOD_OPTIONS, type Mood } from "./types";

// VR-01 / VR-02 / VR-03 / VR-04 / VR-05 rules, kept in one place so forms and tests share them.

export const isEmail = (value: string) =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());

export const isMood = (value: string): value is Mood =>
  (MOOD_OPTIONS as readonly string[]).includes(value);

export const isValidStress = (value: number) =>
  Number.isInteger(value) && value >= 1 && value <= 10;

// Assumed hours, decimal, 0–24 in steps of 0.5 (A-09).
export const isValidSleep = (value: number) =>
  Number.isFinite(value) &&
  value >= 0 &&
  value <= 24 &&
  Number.isInteger(value * 2);

export const MAX_NOTE_LENGTH = 500;
export const MAX_JOURNAL_LENGTH = 10000;

export function validatePassword(value: string): string | null {
  if (value.length < 8) return "Use at least 8 characters.";
  return null;
}

export function validateMoodForm(input: {
  mood: string;
  stress: number;
  sleepHours: number;
  note: string;
}): Record<string, string> {
  const errors: Record<string, string> = {};
  if (!isMood(input.mood)) errors.mood = "Choose how you feel today.";
  if (!isValidStress(input.stress))
    errors.stress = "Stress must be a whole number from 1 to 10.";
  if (!isValidSleep(input.sleepHours))
    errors.sleepHours =
      "Sleep must be between 0 and 24 hours, in half-hour steps.";
  if (input.note.length > MAX_NOTE_LENGTH)
    errors.note = `Keep notes under ${MAX_NOTE_LENGTH} characters.`;
  return errors;
}

// Local calendar date as YYYY-MM-DD, used for mood records and slot dates.
export function localDateKey(date: Date = new Date()): string {
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 10);
}

export function formatDate(key: string): string {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
