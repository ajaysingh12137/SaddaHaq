/**
 * Day logs on this phone: the worker's own record and the source of truth.
 *
 * - One row per (date, platform), enforced by a unique index. A removed log is
 *   soft-deleted (deleted_at) so the deletion can sync; adding it back revives
 *   the same row and id.
 * - Every write marks the row unsynced and stamps updated_at for last-write-wins.
 */
import { type DayLog, type ISODate, type LogSource, type PlatformId } from '@saddahaq/shared';

import { uuidv4 } from '../lib/random';
import { getDatabase } from './database';

interface DayLogRow {
  id: string;
  date: string;
  platform: string;
  source: string;
  amount: number | null;
  updated_at: string;
  deleted_at: string | null;
  synced: number;
}

export interface StoredDayLog extends DayLog {
  synced: boolean;
}

function fromRow(row: DayLogRow): StoredDayLog {
  return {
    id: row.id,
    date: row.date,
    platform: row.platform as PlatformId,
    source: row.source as LogSource,
    amount: row.amount ?? null,
    updatedAt: row.updated_at,
    deletedAt: row.deleted_at,
    synced: row.synced === 1,
  };
}

const COLUMNS = 'id, date, platform, source, amount, updated_at, deleted_at, synced';

/** Live (not deleted) logs, oldest date first. */
export async function listLiveLogs(): Promise<StoredDayLog[]> {
  const { rows } = await getDatabase().execute(
    `SELECT ${COLUMNS} FROM day_logs WHERE deleted_at IS NULL ORDER BY date, platform`,
  );
  return (rows as unknown as DayLogRow[]).map(fromRow);
}

/**
 * Makes `platforms` the exact set of apps worked on `date` (quick-tap logging).
 * New apps are added as 'tap' logs, apps no longer ticked are soft-deleted, and
 * apps already logged (e.g. from a screenshot) keep their source and amount.
 * An empty list clears the day.
 */
export async function setPlatformsForDate(
  date: ISODate,
  platforms: readonly PlatformId[],
  now: Date = new Date(),
): Promise<void> {
  const stamp = now.toISOString();
  const wanted = new Set(platforms);
  const db = getDatabase();

  await db.transaction(async tx => {
    const { rows } = await tx.execute(`SELECT ${COLUMNS} FROM day_logs WHERE date = ?`, [date]);
    const existing = new Map(
      (rows as unknown as DayLogRow[]).map(row => [row.platform, fromRow(row)]),
    );

    for (const platform of wanted) {
      const log = existing.get(platform);
      if (!log) {
        await tx.execute(
          `INSERT INTO day_logs (id, date, platform, source, amount, updated_at, deleted_at, synced)
           VALUES (?, ?, ?, 'tap', NULL, ?, NULL, 0)`,
          [uuidv4(), date, platform, stamp],
        );
      } else if (log.deletedAt) {
        // Revive as a fresh tap log; whatever the deleted log held is gone.
        await tx.execute(
          `UPDATE day_logs SET source = 'tap', amount = NULL, deleted_at = NULL,
           updated_at = ?, synced = 0 WHERE id = ?`,
          [stamp, log.id],
        );
      }
    }

    for (const log of existing.values()) {
      if (!log.deletedAt && !wanted.has(log.platform)) {
        await tx.execute(
          'UPDATE day_logs SET deleted_at = ?, updated_at = ?, synced = 0 WHERE id = ?',
          [stamp, stamp, log.id],
        );
      }
    }
  });
}

export interface ScreenshotLogInput {
  date: ISODate;
  platform: PlatformId;
  amount: number | null;
}

/**
 * Saves a log confirmed from a screenshot. If the day is already logged for
 * that app, it is updated in place (still one log per date and app).
 * Returns whether a live log already existed.
 */
export async function saveScreenshotLog(
  input: ScreenshotLogInput,
  now: Date = new Date(),
): Promise<'created' | 'updated'> {
  const stamp = now.toISOString();
  let outcome: 'created' | 'updated' = 'created';

  await getDatabase().transaction(async tx => {
    const { rows } = await tx.execute(
      'SELECT deleted_at FROM day_logs WHERE date = ? AND platform = ?',
      [input.date, input.platform],
    );
    const row = rows[0] as Pick<DayLogRow, 'deleted_at'> | undefined;
    outcome = row && row.deleted_at === null ? 'updated' : 'created';

    await tx.execute(
      `INSERT INTO day_logs (id, date, platform, source, amount, updated_at, deleted_at, synced)
       VALUES (?, ?, ?, 'ocr', ?, ?, NULL, 0)
       ON CONFLICT (date, platform) DO UPDATE SET
         source = 'ocr', amount = excluded.amount, updated_at = excluded.updated_at,
         deleted_at = NULL, synced = 0`,
      [uuidv4(), input.date, input.platform, input.amount, stamp],
    );
  });

  return outcome;
}
