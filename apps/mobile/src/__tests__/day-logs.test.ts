import { dayLogSchema } from '@saddahaq/shared';

import { __resetDatabaseForTests, getDatabase, openDatabase } from '../db/database';
import { listLiveLogs, saveScreenshotLog, setPlatformsForDate } from '../db/dayLogs';
import { parseAmountInput } from '../features/log/ScreenshotConfirmSheet';
import { loadLogs, logDay, platformsByDate, resetLogsStore, useLogs } from '../state/logsStore';

const T1 = new Date('2026-10-20T10:00:00.000Z');
const T2 = new Date('2026-10-20T11:00:00.000Z');
const T3 = new Date('2026-10-20T12:00:00.000Z');

async function allRows() {
  const { rows } = await getDatabase().execute(
    'SELECT id, date, platform, source, amount, updated_at, deleted_at, synced FROM day_logs ORDER BY platform',
  );
  return rows as Array<Record<string, unknown>>;
}

beforeEach(async () => {
  __resetDatabaseForTests();
  resetLogsStore();
  await openDatabase();
});

describe('setPlatformsForDate', () => {
  it('adds one unsynced tap log per platform with a v4 id', async () => {
    await setPlatformsForDate('2026-10-20', ['zomato', 'swiggy'], T1);
    const logs = await listLiveLogs();
    expect(logs.map(l => l.platform)).toEqual(['swiggy', 'zomato']);
    for (const log of logs) {
      expect(dayLogSchema.safeParse(log).success).toBe(true);
      expect(log).toMatchObject({
        date: '2026-10-20',
        source: 'tap',
        amount: null,
        updatedAt: T1.toISOString(),
        deletedAt: null,
        synced: false,
      });
    }
  });

  it('is idempotent: saving the same apps again changes nothing', async () => {
    await setPlatformsForDate('2026-10-20', ['zomato'], T1);
    const [before] = await allRows();
    await setPlatformsForDate('2026-10-20', ['zomato', 'zomato'], T2);
    expect(await allRows()).toEqual([before]);
  });

  it('soft-deletes apps that are unticked, keeping the row for sync', async () => {
    await setPlatformsForDate('2026-10-20', ['zomato', 'swiggy'], T1);
    await setPlatformsForDate('2026-10-20', ['zomato'], T2);
    expect((await listLiveLogs()).map(l => l.platform)).toEqual(['zomato']);
    const swiggy = (await allRows()).find(r => r.platform === 'swiggy');
    expect(swiggy).toMatchObject({
      deleted_at: T2.toISOString(),
      updated_at: T2.toISOString(),
      synced: 0,
    });
  });

  it('clears the whole day when no apps are ticked', async () => {
    await setPlatformsForDate('2026-10-20', ['zomato', 'swiggy'], T1);
    await setPlatformsForDate('2026-10-20', [], T2);
    expect(await listLiveLogs()).toEqual([]);
    expect(await allRows()).toHaveLength(2);
  });

  it('revives a deleted log with the same id instead of adding a duplicate', async () => {
    await setPlatformsForDate('2026-10-20', ['zomato'], T1);
    const [original] = await listLiveLogs();
    await setPlatformsForDate('2026-10-20', [], T2);
    await setPlatformsForDate('2026-10-20', ['zomato'], T3);
    const logs = await listLiveLogs();
    expect(logs).toHaveLength(1);
    expect(logs[0]).toMatchObject({
      id: original?.id,
      deletedAt: null,
      updatedAt: T3.toISOString(),
      synced: false,
    });
  });

  it('keeps the amount of a screenshot log when the day is re-saved by tapping', async () => {
    await saveScreenshotLog({ date: '2026-10-20', platform: 'zomato', amount: 850 }, T1);
    await setPlatformsForDate('2026-10-20', ['zomato', 'swiggy'], T2);
    const zomato = (await listLiveLogs()).find(l => l.platform === 'zomato');
    expect(zomato).toMatchObject({ source: 'ocr', amount: 850, updatedAt: T1.toISOString() });
  });

  it('only touches the given date', async () => {
    await setPlatformsForDate('2026-10-19', ['zomato'], T1);
    await setPlatformsForDate('2026-10-20', [], T2);
    expect((await listLiveLogs()).map(l => l.date)).toEqual(['2026-10-19']);
  });
});

describe('saveScreenshotLog', () => {
  it('creates an ocr log with the amount', async () => {
    expect(
      await saveScreenshotLog({ date: '2026-10-20', platform: 'uber', amount: 1234.5 }, T1),
    ).toBe('created');
    expect(await listLiveLogs()).toEqual([
      expect.objectContaining({ platform: 'uber', source: 'ocr', amount: 1234.5, synced: false }),
    ]);
  });

  it('updates an existing log for the same date and app (no duplicates)', async () => {
    await setPlatformsForDate('2026-10-20', ['uber'], T1);
    const [tapLog] = await listLiveLogs();
    expect(await saveScreenshotLog({ date: '2026-10-20', platform: 'uber', amount: 600 }, T2)).toBe(
      'updated',
    );
    const logs = await listLiveLogs();
    expect(logs).toHaveLength(1);
    expect(logs[0]).toMatchObject({
      id: tapLog?.id,
      source: 'ocr',
      amount: 600,
      updatedAt: T2.toISOString(),
    });
  });

  it('revives a deleted log and reports it as created', async () => {
    await setPlatformsForDate('2026-10-20', ['uber'], T1);
    await setPlatformsForDate('2026-10-20', [], T2);
    expect(
      await saveScreenshotLog({ date: '2026-10-20', platform: 'uber', amount: null }, T3),
    ).toBe('created');
    expect(await listLiveLogs()).toEqual([
      expect.objectContaining({ platform: 'uber', deletedAt: null, amount: null }),
    ]);
  });
});

describe('logs store', () => {
  it('reloads from the database after each write', async () => {
    await logDay('2026-10-20', ['zomato', 'swiggy']);
    expect(useLogs.getState()).toMatchObject({ loaded: true });
    expect(useLogs.getState().logs).toHaveLength(2);
  });

  it('survives a restart', async () => {
    await logDay('2026-10-20', ['zomato']);
    resetLogsStore();
    __resetDatabaseForTests();
    await openDatabase();
    await loadLogs();
    expect(useLogs.getState().logs.map(l => l.platform)).toEqual(['zomato']);
  });

  it('groups platforms by date', async () => {
    await logDay('2026-10-20', ['zomato', 'swiggy']);
    await logDay('2026-10-21', ['uber']);
    const map = platformsByDate(useLogs.getState().logs);
    expect(map.get('2026-10-20')?.sort()).toEqual(['swiggy', 'zomato']);
    expect(map.get('2026-10-21')).toEqual(['uber']);
    expect(map.get('2026-10-22')).toBeUndefined();
  });
});

describe('parseAmountInput', () => {
  it.each([
    ['', null],
    ['  ', null],
    ['850', 850],
    ['1,234.50', 1234.5],
    ['₹ 99.9', 99.9],
    ['1000000', 1000000],
  ])('reads %p as %p', (input, expected) => {
    expect(parseAmountInput(input)).toBe(expected);
  });

  it.each(['abc', '12.345', '-5', '1.2.3', '1000001'])('rejects %p', input => {
    expect(parseAmountInput(input)).toBeUndefined();
  });
});
