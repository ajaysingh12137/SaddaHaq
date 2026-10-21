import { type DayLog, PLATFORM_IDS, type PlatformId } from '@saddahaq/shared';

const HEADER = ['date', 'app', 'source', 'amount'];

/** RFC 4180 quoting: only when a field contains a comma, quote or line break. */
function field(value: string): string {
  return /[",\r\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

/** The worker's own logs as CSV, oldest first. Column names stay English so spreadsheets read them. */
export function logsToCsv(
  logs: readonly Pick<DayLog, 'date' | 'platform' | 'source' | 'amount'>[],
  platformName: (id: PlatformId) => string,
): string {
  const rows = [...logs]
    .sort(
      (a, b) =>
        a.date.localeCompare(b.date) ||
        PLATFORM_IDS.indexOf(a.platform) - PLATFORM_IDS.indexOf(b.platform),
    )
    .map(log => [
      log.date,
      platformName(log.platform),
      log.source === 'ocr' ? 'screenshot' : 'tap',
      log.amount === null ? '' : String(log.amount),
    ]);
  return [HEADER, ...rows].map(row => row.map(field).join(',')).join('\r\n') + '\r\n';
}
