import { describe, expect, it } from "vitest";
import {
  average,
  chronological,
  filterByRange,
  MOOD_SCORE,
  round1,
  shiftDays,
} from "@/lib/stats";
import type { MoodRecord } from "@/lib/types";

const record = (
  recordedOn: string,
  stress: number,
  sleepHours: number,
): MoodRecord => ({
  id: recordedOn,
  ownerId: "u",
  mood: "Okay",
  stress,
  sleepHours,
  note: "",
  recordedOn,
  recordedTime: "20:00",
});

const records = [
  record("2026-10-01", 2, 6),
  record("2026-10-20", 4, 7),
  record("2026-10-25", 6, 8),
  record("2026-10-31", 8, 5),
];

describe("range filters", () => {
  it("keeps exactly the last 7 calendar days including today", () => {
    const kept = filterByRange(records, "7d", "2026-10-31").map(
      (r) => r.recordedOn,
    );
    expect(kept).toEqual(["2026-10-25", "2026-10-31"]);
  });

  it("keeps the last 30 calendar days including today", () => {
    const kept = filterByRange(records, "30d", "2026-10-31").map(
      (r) => r.recordedOn,
    );
    expect(kept).toEqual(["2026-10-20", "2026-10-25", "2026-10-31"]);
  });

  it("returns everything for all records", () => {
    expect(filterByRange(records, "all", "2026-10-31")).toHaveLength(4);
  });

  it("handles month and year boundaries", () => {
    expect(shiftDays("2027-01-03", -7)).toBe("2026-12-27");
    expect(shiftDays("2026-03-01", -1)).toBe("2026-02-28");
  });
});

describe("statistics", () => {
  it("averages values and returns null when there is nothing to average", () => {
    expect(average([2, 4, 6])).toBe(4);
    expect(average([])).toBeNull();
  });

  it("formats averages to one decimal place, or a dash when empty", () => {
    expect(round1(average([7, 8]))).toBe("7.5");
    expect(round1(null)).toBe("–");
  });

  it("sorts records oldest first without mutating the input", () => {
    const shuffled = [records[3], records[0], records[2]];
    expect(chronological(shuffled).map((r) => r.recordedOn)).toEqual([
      "2026-10-01",
      "2026-10-25",
      "2026-10-31",
    ]);
    expect(shuffled[0].recordedOn).toBe("2026-10-31");
  });

  it("maps moods to an ordered scale for the chart", () => {
    expect(MOOD_SCORE.Stressed).toBeLessThan(MOOD_SCORE.Low);
    expect(MOOD_SCORE.Okay).toBeLessThan(MOOD_SCORE.Happy);
  });
});
