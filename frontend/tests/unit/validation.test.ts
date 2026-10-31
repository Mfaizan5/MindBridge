import { describe, expect, it } from "vitest";
import {
  isEmail,
  isValidSleep,
  isValidStress,
  validatePassword,
} from "@/lib/validation";

describe("validation rules", () => {
  it("accepts well-formed emails and rejects malformed ones", () => {
    expect(isEmail("student@example.com")).toBe(true);
    expect(isEmail("not-an-email")).toBe(false);
    expect(isEmail("a@b")).toBe(false);
  });

  it("requires stress to be a whole number from 1 to 10", () => {
    expect([1, 10].every(isValidStress)).toBe(true);
    expect([0, 11, 4.5].some(isValidStress)).toBe(false);
  });

  it("accepts sleep in half-hour steps from 0 to 24", () => {
    expect([0, 7.5, 24].every(isValidSleep)).toBe(true);
    expect([-1, 24.5, 7.25].some(isValidSleep)).toBe(false);
  });

  it("requires passwords of at least 8 characters", () => {
    expect(validatePassword("short")).not.toBeNull();
    expect(validatePassword("long enough")).toBeNull();
  });
});
