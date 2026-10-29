export interface DateRange {
  startDate: string;
  endDate: string;
}

export interface DateChunk {
  startDate: string;
  endDate: string;
}

const DATE_ONLY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

export function parseDateOnly(value: string): Date | null {
  if (!DATE_ONLY_PATTERN.test(value)) {
    return null;
  }

  const date = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date.toISOString().slice(0, 10) === value ? date : null;
}

export function dateOnly(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function addUtcDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * MS_PER_DAY);
}

export function inclusiveDayCount(start: Date, end: Date): number {
  return Math.floor((end.getTime() - start.getTime()) / MS_PER_DAY) + 1;
}

export function validateDateRange(
  range: DateRange,
  options: { now?: Date; maxDays?: number } = {},
): void {
  const start = parseDateOnly(range.startDate);
  const end = parseDateOnly(range.endDate);
  const now = options.now ?? new Date();

  if (!start || !end) {
    throw new Error("Dates must use the YYYY-MM-DD format.");
  }

  if (start.getTime() > end.getTime()) {
    throw new Error("The start date must be on or before the end date.");
  }

  const endOfToday = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
  );
  if (end.getTime() > endOfToday.getTime()) {
    throw new Error("The end date cannot be in the future.");
  }

  const earliest = addUtcDays(endOfToday, -1_095);
  if (start.getTime() < earliest.getTime()) {
    throw new Error(
      "PayPal Transaction Search only covers the previous three years.",
    );
  }

  const days = inclusiveDayCount(start, end);
  if (options.maxDays && days > options.maxDays) {
    throw new Error(
      `Choose a range of ${options.maxDays} days or fewer. You can make multiple reads.`,
    );
  }
}

/**
 * Splits an inclusive date range into non-overlapping chunks whose inclusive
 * length is at most 30 days. PayPal's documented maximum is 31 days; 30 leaves
 * a small safety margin around date/time boundaries.
 */
export function chunkDateRange(range: DateRange): DateChunk[] {
  const start = parseDateOnly(range.startDate);
  const end = parseDateOnly(range.endDate);

  if (!start || !end || start.getTime() > end.getTime()) {
    throw new Error("Invalid date range passed to PayPal Transaction Search.");
  }

  const chunks: DateChunk[] = [];
  let cursor = start;

  while (cursor.getTime() <= end.getTime()) {
    const candidateEnd = addUtcDays(cursor, 29);
    const chunkEnd =
      candidateEnd.getTime() > end.getTime() ? end : candidateEnd;

    chunks.push({
      startDate: dateOnly(cursor),
      endDate: dateOnly(chunkEnd),
    });

    cursor = addUtcDays(chunkEnd, 1);
  }

  return chunks;
}

export function toPayPalStart(date: string): string {
  return `${date}T00:00:00Z`;
}

export function toPayPalEnd(date: string): string {
  return `${date}T23:59:59Z`;
}

export function formatHumanDate(value: string): string {
  const date = new Date(value.length === 10 ? `${value}T00:00:00.000Z` : value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
}
