export type AnnualDate = Readonly<{ month: number; day: number }>;

export function isLeapYear(year: number): boolean {
  return year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
}

export function resolveAnnualDate(year: number, date: AnnualDate): string {
  const { month, day } = date;
  if (!Number.isInteger(month) || month < 1 || month > 12) {
    throw new RangeError("month must be between 1 and 12");
  }
  if (!Number.isInteger(day) || day < 1 || day > 31) {
    throw new RangeError("day must be between 1 and 31");
  }

  const resolvedDay = month === 2 && day === 29 && !isLeapYear(year) ? 28 : day;
  const candidate = new Date(Date.UTC(year, month - 1, resolvedDay));
  if (
    candidate.getUTCFullYear() !== year ||
    candidate.getUTCMonth() !== month - 1 ||
    candidate.getUTCDate() !== resolvedDay
  ) {
    throw new RangeError("invalid calendar date");
  }

  return `${year.toString().padStart(4, "0")}-${month.toString().padStart(2, "0")}-${resolvedDay
    .toString()
    .padStart(2, "0")}`;
}

export type ReminderIdentity = Readonly<{
  organizationId: string;
  sourceType: "OCCASION" | "FOLLOW_UP";
  sourceId: string;
  occurrenceDate: string;
  offsetMinutes: number;
  ownerId: string;
}>;

export function buildReminderDedupeKey(identity: ReminderIdentity): string {
  return [
    identity.organizationId,
    identity.sourceType,
    identity.sourceId,
    identity.occurrenceDate,
    identity.offsetMinutes,
    identity.ownerId
  ].join(":");
}

export function normalizeIndianPhone(value: string): string {
  const digits = value.replace(/\D/g, "");
  if (digits.length === 10) return `+91${digits}`;
  if (digits.length === 11 && digits.startsWith("0")) return `+91${digits.slice(1)}`;
  if (digits.length === 12 && digits.startsWith("91")) return `+${digits}`;
  if (digits.length >= 7 && digits.length <= 15) return `+${digits}`;
  throw new RangeError("phone number must contain 7 to 15 digits");
}

export type FollowUpCadence = "WEEKLY" | "TWICE_WEEKLY" | "MONTHLY" | "CUSTOM";

export function followUpIntervalMinutes(cadence: FollowUpCadence, customIntervalDays?: number): number {
  if (cadence === "WEEKLY") return 7 * 24 * 60;
  if (cadence === "TWICE_WEEKLY") return Math.round(3.5 * 24 * 60);
  if (cadence === "MONTHLY") return 30 * 24 * 60;
  if (!Number.isInteger(customIntervalDays) || customIntervalDays! < 1 || customIntervalDays! > 365) {
    throw new RangeError("custom follow-up interval must be between 1 and 365 days");
  }
  return customIntervalDays! * 24 * 60;
}

export function nextFollowUpAt(cadence: FollowUpCadence, from: Date, customIntervalDays?: number): Date {
  const next = new Date(from);
  if (cadence === "MONTHLY") {
    const originalDay = next.getUTCDate();
    next.setUTCDate(1);
    next.setUTCMonth(next.getUTCMonth() + 1);
    const lastDayOfTargetMonth = new Date(Date.UTC(next.getUTCFullYear(), next.getUTCMonth() + 1, 0)).getUTCDate();
    next.setUTCDate(Math.min(originalDay, lastDayOfTargetMonth));
    return next;
  }
  next.setUTCMinutes(next.getUTCMinutes() + followUpIntervalMinutes(cadence, customIntervalDays));
  return next;
}
