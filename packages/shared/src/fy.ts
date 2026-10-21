/**
 * Calendar-date and financial-year helpers.
 *
 * All dates are plain `YYYY-MM-DD` strings (the worker's local calendar date).
 * Arithmetic is done in UTC so results never shift with the device time zone.
 */

export type ISODate = string;

const ISO_DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;
const MS_PER_DAY = 86_400_000;

export interface FinancialYear {
  /** Calendar year in which the financial year starts, e.g. 2026 for FY 2026–27. */
  startYear: number;
  /** First day, inclusive. */
  start: ISODate;
  /** Last day, inclusive. */
  end: ISODate;
  /** Display label, e.g. "2026–27". */
  label: string;
}

export function isLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

/** Number of days in a month (`month` is 1–12). */
export function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

export function isValidYMD(year: number, month: number, day: number): boolean {
  if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) {
    return false;
  }
  if (month < 1 || month > 12 || day < 1) {
    return false;
  }
  return day <= daysInMonth(year, month);
}

export function toISODate(year: number, month: number, day: number): ISODate {
  return `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

export function isValidISODate(value: string): boolean {
  const match = ISO_DATE_RE.exec(value);
  if (!match) {
    return false;
  }
  return isValidYMD(Number(match[1]), Number(match[2]), Number(match[3]));
}

/** Parses a valid ISO date into its parts; throws on invalid input. */
export function parseISODate(value: ISODate): { year: number; month: number; day: number } {
  if (!isValidISODate(value)) {
    throw new RangeError(`Invalid ISO date: ${value}`);
  }
  const [year, month, day] = value.split('-').map(Number) as [number, number, number];
  return { year, month, day };
}

function toUTCms(value: ISODate): number {
  const { year, month, day } = parseISODate(value);
  return Date.UTC(year, month - 1, day);
}

function fromUTCms(ms: number): ISODate {
  const d = new Date(ms);
  return toISODate(d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate());
}

export function addDays(value: ISODate, days: number): ISODate {
  return fromUTCms(toUTCms(value) + days * MS_PER_DAY);
}

/** Whole days from `from` to `to` (positive when `to` is later). */
export function diffDays(from: ISODate, to: ISODate): number {
  return Math.round((toUTCms(to) - toUTCms(from)) / MS_PER_DAY);
}

/** The device's local calendar date for a JS Date. */
export function toLocalISODate(date: Date): ISODate {
  return toISODate(date.getFullYear(), date.getMonth() + 1, date.getDate());
}

function assertStartMonth(fyStartMonth: number): void {
  if (!Number.isInteger(fyStartMonth) || fyStartMonth < 1 || fyStartMonth > 12) {
    throw new RangeError(`fyStartMonth must be an integer 1–12, got ${fyStartMonth}`);
  }
}

/** The financial year that starts on day 1 of `fyStartMonth` in `startYear`. */
export function financialYear(startYear: number, fyStartMonth: number): FinancialYear {
  assertStartMonth(fyStartMonth);
  const start = toISODate(startYear, fyStartMonth, 1);
  const end = addDays(toISODate(startYear + 1, fyStartMonth, 1), -1);
  const label =
    fyStartMonth === 1
      ? String(startYear)
      : `${startYear}–${String((startYear + 1) % 100).padStart(2, '0')}`;
  return { startYear, start, end, label };
}

/** The financial year containing `date`. */
export function financialYearOf(date: ISODate, fyStartMonth: number): FinancialYear {
  assertStartMonth(fyStartMonth);
  const { year, month } = parseISODate(date);
  return financialYear(month >= fyStartMonth ? year : year - 1, fyStartMonth);
}

export function isInFinancialYear(date: string, fy: FinancialYear): boolean {
  // ISO strings compare correctly as text once validated.
  return isValidISODate(date) && date >= fy.start && date <= fy.end;
}

export function daysInFinancialYear(fy: FinancialYear): number {
  return diffDays(fy.start, fy.end) + 1;
}

/**
 * Days left in the financial year, counting `today` itself (it can still be worked).
 * 0 once the year has ended; the full length if it has not started.
 */
export function daysRemainingInFinancialYear(today: ISODate, fy: FinancialYear): number {
  if (today > fy.end) {
    return 0;
  }
  if (today < fy.start) {
    return daysInFinancialYear(fy);
  }
  return diffDays(today, fy.end) + 1;
}
