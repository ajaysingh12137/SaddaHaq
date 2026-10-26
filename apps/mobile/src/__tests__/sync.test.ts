import { type DayLog, MAX_SYNC_BATCH, type SyncRequest, addDays } from '@saddahaq/shared';

import { __resetDatabaseForTests, getDatabase, openDatabase } from '../db/database';
import {
  applyServerChanges,
  listLiveLogs,
  listUnsynced,
  markAllUnsynced,
  saveScreenshotLog,
  setPlatformsForDate,
} from '../db/dayLogs';
import { kvGet, kvSet } from '../db/kv';
import { uuidv4 } from '../lib/random';
import { saveTokens } from '../security/secureStore';
import { __useFetchForTests, tokenStore } from '../services/api';
import { setConsents } from '../services/session';
import {
  BACKOFF_MAX_MS,
  MAX_RETRIES,
  __resetSyncForTests,
  backoffDelay,
  resetSyncState,
  syncNow,
} from '../services/sync';
import { logDay, resetLogsStore, useLogs } from '../state/logsStore';
import { resetSessionStore, setSession } from '../state/sessionStore';
import { TOKENS, createFakeServer, makeUser } from '../test-utils/fakeServer';

const T1 = new Date('2026-10-20T10:00:00.000Z');
const T2 = new Date('2026-10-20T11:00:00.000Z');

const serverLog = (overrides: Partial<DayLog>): DayLog => ({
  id: uuidv4(),
  date: '2026-10-20',
  platform: 'zomato',
  source: 'tap',
  amount: null,
  updatedAt: T1.toISOString(),
  deletedAt: null,
  ...overrides,
});

async function rows() {
  const { rows: all } = await getDatabase().execute(
    'SELECT id, date, platform, amount, updated_at, deleted_at, synced FROM day_logs ORDER BY date, platform',
  );
  return all as Array<Record<string, unknown>>;
}

beforeEach(async () => {
  __resetDatabaseForTests();
  resetSessionStore();
  resetLogsStore();
  __resetSyncForTests();
  await openDatabase();
});

describe('applyServerChanges (merge rules)', () => {
  it('adds logs from another device as synced', async () => {
    const log = serverLog({ amount: 500, source: 'ocr' });
    await applyServerChanges([log], new Map());
    expect(await listLiveLogs()).toEqual([{ ...log, synced: true }]);
  });

  it('keeps server deletions as soft-deleted rows', async () => {
    await setPlatformsForDate('2026-10-20', ['zomato'], T1);
    const [local] = await listLiveLogs();
    await applyServerChanges(
      [serverLog({ id: local!.id, updatedAt: T2.toISOString(), deletedAt: T2.toISOString() })],
      new Map(),
    );
    expect(await listLiveLogs()).toEqual([]);
    expect(await rows()).toEqual([expect.objectContaining({ synced: 1 })]);
  });

  it('takes the server copy when it is newer than an unsynced local edit', async () => {
    await setPlatformsForDate('2026-10-20', ['zomato'], T1);
    const [local] = await listLiveLogs();
    await applyServerChanges(
      [serverLog({ id: local!.id, amount: 700, updatedAt: T2.toISOString() })],
      new Map(),
    );
    expect(await listLiveLogs()).toEqual([expect.objectContaining({ amount: 700, synced: true })]);
  });

  it('keeps an unsynced local edit that is newer (last write wins)', async () => {
    await setPlatformsForDate('2026-10-20', ['zomato'], T2);
    const [local] = await listLiveLogs();
    await applyServerChanges([serverLog({ id: local!.id, amount: 700 })], new Map());
    expect(await listLiveLogs()).toEqual([
      expect.objectContaining({ amount: null, synced: false }),
    ]);
  });

  it("re-keys a local log to the server's id for the same date and app", async () => {
    await setPlatformsForDate('2026-10-20', ['zomato'], T1);
    const [local] = await listLiveLogs();
    const canonical = serverLog({ updatedAt: T1.toISOString() });
    await applyServerChanges([canonical], new Map([[local!.id, T1.toISOString()]]));
    expect(await rows()).toEqual([expect.objectContaining({ id: canonical.id, synced: 1 })]);
  });

  it('re-keys but keeps a newer unsynced local edit for the next push', async () => {
    await setPlatformsForDate('2026-10-20', ['zomato'], T2);
    const canonical = serverLog({ updatedAt: T1.toISOString() });
    await applyServerChanges([canonical], new Map());
    expect(await rows()).toEqual([
      expect.objectContaining({ id: canonical.id, updated_at: T2.toISOString(), synced: 0 }),
    ]);
  });

  it('settles a sent change even when the server clamped a fast phone clock', async () => {
    const future = '2027-01-01T00:00:00.000Z';
    await setPlatformsForDate('2026-10-20', ['zomato'], new Date(future));
    const [local] = await listLiveLogs();
    const clamped = serverLog({ id: local!.id, updatedAt: T2.toISOString() });
    await applyServerChanges([clamped], new Map([[local!.id, future]]));
    expect(await listUnsynced(10)).toEqual([]);
  });

  it('does not settle a log the worker edited while the request was in flight', async () => {
    await setPlatformsForDate('2026-10-20', ['zomato'], T1);
    const [local] = await listLiveLogs();
    await saveScreenshotLog({ date: '2026-10-20', platform: 'zomato', amount: 900 }, T2);
    await applyServerChanges(
      [serverLog({ id: local!.id, updatedAt: T1.toISOString() })],
      new Map([[local!.id, T1.toISOString()]]),
    );
    expect(await listUnsynced(10)).toEqual([expect.objectContaining({ amount: 900 })]);
  });

  it('is idempotent: applying the same changes twice changes nothing', async () => {
    const log = serverLog({});
    await applyServerChanges([log], new Map());
    const before = await rows();
    await applyServerChanges([log], new Map());
    expect(await rows()).toEqual(before);
  });

  it('lists unsynced logs, deletions included, and can mark all unsynced', async () => {
    await setPlatformsForDate('2026-10-20', ['zomato', 'swiggy'], T1);
    await setPlatformsForDate('2026-10-20', ['zomato'], T2);
    expect((await listUnsynced(10)).map(l => [l.platform, l.deletedAt !== null])).toEqual([
      ['zomato', false],
      ['swiggy', true],
    ]);
    await applyServerChanges([], new Map());
    await getDatabase().execute('UPDATE day_logs SET synced = 1');
    await markAllUnsynced();
    expect(await listUnsynced(10)).toHaveLength(2);
    expect((await listUnsynced(10))[0]).not.toHaveProperty('synced');
  });
});

describe('sync service', () => {
  let server: ReturnType<typeof createFakeServer>;
  /** A minimal in-memory server: stores logs by id, echoes what it received. */
  let stored: Map<string, DayLog>;

  async function signedIn(backup: boolean) {
    await saveTokens(TOKENS);
    tokenStore.forget();
    setSession({
      status: 'ready',
      user: makeUser({ consents: { backup, analytics: false, acceptedAt: T1.toISOString() } }),
    });
  }

  beforeEach(() => {
    stored = new Map();
    server = createFakeServer();
    __useFetchForTests(server.fetchImpl);
    server.on('POST /sync', body => {
      const { changes } = body as SyncRequest;
      for (const change of changes) stored.set(change.id, change);
      return { body: { serverChanges: changes, now: '2026-10-20T12:00:00.000Z' } };
    });
    server.on('PATCH /me', patch => ({ body: makeUser(patch as object) }));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('does nothing without backup consent', async () => {
    await signedIn(false);
    await setPlatformsForDate('2026-10-20', ['zomato'], T1);
    expect(await syncNow()).toBe('skipped');
    expect(server.callsTo('POST /sync')).toHaveLength(0);
  });

  it('does nothing when signed out', async () => {
    setSession({
      user: makeUser({ consents: { backup: true, analytics: false, acceptedAt: null } }),
    });
    expect(await syncNow()).toBe('skipped');
    expect(server.calls).toHaveLength(0);
  });

  it('pushes unsynced logs, marks them synced and remembers the server time', async () => {
    await signedIn(true);
    await setPlatformsForDate('2026-10-20', ['zomato', 'swiggy'], T1);

    expect(await syncNow()).toBe('synced');
    const [first] = server.callsTo('POST /sync');
    expect((first?.body as SyncRequest).since).toBeNull();
    expect((first?.body as SyncRequest).changes).toHaveLength(2);
    expect(await listUnsynced(10)).toEqual([]);
    expect(await kvGet('sync.since')).toBe('2026-10-20T12:00:00.000Z');

    await syncNow();
    const second = server.callsTo('POST /sync')[1]?.body as SyncRequest;
    expect(second).toEqual({ changes: [], since: '2026-10-20T12:00:00.000Z' });
  });

  it('pulls logs from another phone into the store', async () => {
    await signedIn(true);
    const remote = serverLog({ platform: 'uber' });
    server.on('POST /sync', () => ({
      body: { serverChanges: [remote], now: '2026-10-20T12:00:00.000Z' },
    }));
    await syncNow();
    expect(useLogs.getState().logs.map(l => l.id)).toEqual([remote.id]);
  });

  it('sends more than one batch when needed', async () => {
    await signedIn(true);
    const start = '2026-04-01';
    for (let i = 0; i < MAX_SYNC_BATCH + 3; i++) {
      await setPlatformsForDate(addDays(start, i % 365), [i < 365 ? 'zomato' : 'swiggy'], T1);
    }
    await syncNow();
    const sizes = server.callsTo('POST /sync').map(c => (c.body as SyncRequest).changes.length);
    expect(sizes).toEqual([MAX_SYNC_BATCH, 3]);
    expect(await listUnsynced(10)).toEqual([]);
  });

  it('sends a just-enabled backup consent before syncing', async () => {
    await signedIn(false);
    await setPlatformsForDate('2026-10-20', ['zomato'], T1);
    await setConsents({ backup: true, analytics: false });
    await syncNow();
    const routes = server.calls.map(c => c.route);
    expect(routes.indexOf('PATCH /me')).toBeGreaterThanOrEqual(0);
    expect(routes.indexOf('PATCH /me')).toBeLessThan(routes.indexOf('POST /sync'));
    expect(stored.size).toBe(1);
  });

  it('re-sends everything when backup is turned back on', async () => {
    await signedIn(true);
    await setPlatformsForDate('2026-10-20', ['zomato'], T1);
    await syncNow();
    expect(await listUnsynced(10)).toEqual([]);

    await setConsents({ backup: false, analytics: false });
    const before = server.callsTo('POST /sync').length;
    await setConsents({ backup: true, analytics: false });
    // Turning backup on starts a sync by itself; wait for it.
    await syncNow();
    const restart = server.callsTo('POST /sync')[before]?.body as SyncRequest;
    expect(restart.since).toBeNull();
    expect(restart.changes).toHaveLength(1);
  });

  it('syncs in the background after a log is saved', async () => {
    await signedIn(true);
    await logDay('2026-10-20', ['zomato']);
    await syncNow();
    expect(stored.size).toBe(1);
  });

  it('retries network failures with exponential backoff, then stops', async () => {
    jest.useFakeTimers();
    await signedIn(true);
    await setPlatformsForDate('2026-10-20', ['zomato'], T1);
    jest.mocked(server.fetchImpl).mockRejectedValue(new TypeError('Network request failed'));

    expect(await syncNow()).toBe('failed');
    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      await jest.advanceTimersByTimeAsync(backoffDelay(attempt));
    }
    await jest.advanceTimersByTimeAsync(BACKOFF_MAX_MS * 2);
    // The first try plus MAX_RETRIES retries, then it waits for the next trigger.
    const syncCalls = jest
      .mocked(server.fetchImpl)
      .mock.calls.filter(([url]) => String(url).endsWith('/sync'));
    expect(syncCalls).toHaveLength(1 + MAX_RETRIES);
    expect(await listUnsynced(10)).toHaveLength(1);
  });

  it('does not retry when the server refuses backup', async () => {
    jest.useFakeTimers();
    await signedIn(true);
    server.on('POST /sync', () => ({
      status: 403,
      body: { error: { code: 'backup_disabled', message: 'off' } },
    }));
    expect(await syncNow()).toBe('failed');
    await jest.advanceTimersByTimeAsync(BACKOFF_MAX_MS * 2);
    expect(server.callsTo('POST /sync')).toHaveLength(1);
  });

  it('runs one sync at a time and once more for changes made meanwhile', async () => {
    await signedIn(true);
    await setPlatformsForDate('2026-10-20', ['zomato'], T1);
    const first = syncNow();
    const second = syncNow();
    expect(second).toBe(first);
    await first;
    expect(server.callsTo('POST /sync')).toHaveLength(2);
  });

  it('backs off 2 s, 4 s, 8 s … up to 5 minutes', () => {
    expect([1, 2, 3, 4].map(backoffDelay)).toEqual([2000, 4000, 8000, 16000]);
    expect(backoffDelay(20)).toBe(BACKOFF_MAX_MS);
  });

  it('resetSyncState clears the server time and marks everything unsynced', async () => {
    await kvSet('sync.since', '2026-10-20T12:00:00.000Z');
    await setPlatformsForDate('2026-10-20', ['zomato'], T1);
    await getDatabase().execute('UPDATE day_logs SET synced = 1');
    await resetSyncState();
    expect(await kvGet('sync.since')).toBeNull();
    expect(await listUnsynced(10)).toHaveLength(1);
  });
});
