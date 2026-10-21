import { type TFunction } from 'i18next';

import { type ISODate, parseISODate } from '@saddahaq/shared';

/**
 * Date labels from our own translations rather than Intl, so Hindi and English
 * read the same on every phone regardless of its ICU data.
 */
export function monthName(month: number, t: TFunction): string {
  return t(`dates.months.${month}` as 'dates.months.1');
}

/** Sunday = 0. */
export function weekdayShort(weekday: number, t: TFunction): string {
  return t(`dates.weekdays.${weekday}` as 'dates.weekdays.0');
}

/** "14 October 2026" / "14 अक्टूबर 2026". */
export function formatDate(date: ISODate, t: TFunction): string {
  const { year, month, day } = parseISODate(date);
  return `${day} ${monthName(month, t)} ${year}`;
}

/** "October 2026". */
export function formatMonth(year: number, month: number, t: TFunction): string {
  return `${monthName(month, t)} ${year}`;
}

/** Day of the week (Sunday = 0) for a calendar date. */
export function weekdayOf(year: number, month: number, day: number): number {
  return new Date(Date.UTC(year, month - 1, day)).getUTCDay();
}
