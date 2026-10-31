import type { Mood, MoodRecord } from "./types";

export type Range = "7d" | "30d" | "all";

export const RANGE_LABELS: Record<Range, string> = {
  "7d": "Last 7 days",
  "30d": "Last 30 days",
  all: "All records",
};

// Ordinal positions for the mood line chart. This is a display approximation only (see A-04).
export const MOOD_SCORE: Record<Mood, number> = {
  Stressed: 1,
  Low: 2,
  Anxious: 3,
  Okay: 4,
  Happy: 5,
};

// Records are YYYY-MM-DD local dates, so string comparison is safe and avoids timezone drift.
export function filterByRange(
  records: MoodRecord[],
  range: Range,
  today: string,
): MoodRecord[] {
  if (range === "all") return records;
  const days = range === "7d" ? 7 : 30;
  const start = shiftDays(today, -(days - 1));
  return records.filter((r) => r.recordedOn >= start && r.recordedOn <= today);
}

export function shiftDays(key: string, delta: number): string {
  const [y, m, d] = key.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d + delta));
  return date.toISOString().slice(0, 10);
}

export function average(values: number[]): number | null {
  if (values.length === 0) return null;
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}

export function round1(value: number | null): string {
  return value === null ? "–" : value.toFixed(1);
}

// Sorted oldest to newest, for charts.
export function chronological(records: MoodRecord[]): MoodRecord[] {
  return [...records].sort((a, b) => a.recordedOn.localeCompare(b.recordedOn));
}
