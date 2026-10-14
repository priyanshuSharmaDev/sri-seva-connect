import { describe, expect, it } from "vitest";
import { buildReminderDedupeKey, isLeapYear, normalizeIndianPhone, resolveAnnualDate } from "./index.js";

describe("occasion dates", () => {
  it("recognizes century leap-year rules", () => {
    expect(isLeapYear(2000)).toBe(true);
    expect(isLeapYear(2100)).toBe(false);
  });

  it("moves February 29 to February 28 in non-leap years", () => {
    expect(resolveAnnualDate(2028, { month: 2, day: 29 })).toBe("2028-02-29");
    expect(resolveAnnualDate(2029, { month: 2, day: 29 })).toBe("2029-02-28");
  });

  it("rejects impossible dates", () => {
    expect(() => resolveAnnualDate(2026, { month: 4, day: 31 })).toThrow("invalid calendar date");
  });
});

describe("reminder identity", () => {
  it("is stable for the same occurrence", () => {
    const identity = {
      organizationId: "org",
      sourceType: "OCCASION" as const,
      sourceId: "occasion",
      occurrenceDate: "2026-10-15",
      offsetMinutes: 1440,
      ownerId: "manager"
    };
    expect(buildReminderDedupeKey(identity)).toBe(buildReminderDedupeKey({ ...identity }));
  });
});

describe("phone normalization", () => {
  it("defaults ten-digit numbers to India", () => {
    expect(normalizeIndianPhone("98765 43210")).toBe("+919876543210");
  });
});
