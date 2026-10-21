import { type DayLog, syncResponseSchema } from '@saddahaq/shared';

import { DayLogModel } from '../models/day-log';
import { MAX_CLIENT_CLOCK_SKEW_MS, SYNC_OVERLAP_MS } from '../modules/sync/service';
import {
  OTHER_PHONE,
  type Session,
  type TestHarness,
  createHarness,
  login,
  useTestDatabase,
} from './helpers/setup';

useTestDatabase();

let h: TestHarness;
let session: Session;

async function enableBackup(s: Session) {
  await h.agent
    .patch('/me')
    .set(s.auth)
    .send({ consents: { backup: true, analytics: false, acceptedAt: null } })
    .expect(200);
}

beforeEach(async () => {
  h = createHarness();
  session = await login(h);
  await enableBackup(session);
});

function makeLog(overrides: Partial<DayLog> = {}): DayLog {
  return {
    id: crypto.randomUUID(),
    date: '2026-10-14',
    platform: 'zomato',
    source: 'tap',
    amount: null,
    updatedAt: '2026-10-15T05:00:00.000Z',
    deletedAt: null,
    ...overrides,
  };
}

async function sync(changes: DayLog[], since: string | null = null, s: Session = session) {
  const res = await h.agent.post('/sync').set(s.auth).send({ changes, since }).expect(200);
  return syncResponseSchema.parse(res.body);
}

describe('POST /sync', () => {
  it('requires the backup consent', async () => {
    const other = await login(h, OTHER_PHONE);
    const res = await h.agent
      .post('/sync')
      .set(other.auth)
      .send({ changes: [], since: null })
      .expect(403);
    expect(res.body.error.code).toBe('backup_disabled');
  });

  it('requires authentication', async () => {
    await h.agent.post('/sync').send({ changes: [], since: null }).expect(401);
  });

  it('stores new logs and returns them with a server timestamp', async () => {
    const log = makeLog({ amount: 640, source: 'ocr' });
    const res = await sync([log]);

    expect(res.serverChanges).toEqual([log]);
    expect(res.now).toBe(new Date(h.clock.now().getTime() - SYNC_OVERLAP_MS).toISOString());
    expect(await DayLogModel.countDocuments({ userId: session.userId })).toBe(1);
  });

  it('only returns changes made after `since`', async () => {
    const first = await sync([makeLog({ date: '2026-10-01' })]);
    h.clock.advance(60_000);
    // `now` is rewound by SYNC_OVERLAP_MS, so a write just before a sync repeats once.
    const overlap = await sync([], first.now);
    expect(overlap.serverChanges).toHaveLength(1);

    h.clock.advance(60_000);
    const nothingNew = await sync([], overlap.now);
    expect(nothingNew.serverChanges).toHaveLength(0);

    // Another device adds a log later.
    h.clock.advance(60_000);
    const added = makeLog({ date: '2026-10-02' });
    await sync([added], nothingNew.now);

    h.clock.advance(60_000);
    const res = await sync([], nothingNew.now);
    expect(res.serverChanges.map(l => l.id)).toEqual([added.id]);
  });

  it('applies a newer change (last write wins)', async () => {
    const log = makeLog();
    await sync([log]);
    const edited = { ...log, amount: 500, updatedAt: '2026-10-15T05:30:00.000Z' };
    const res = await sync([edited]);
    expect(res.serverChanges).toEqual([edited]);
  });

  it('ignores an older change and echoes the server version back', async () => {
    const log = makeLog({ amount: 500, updatedAt: '2026-10-15T05:30:00.000Z' });
    const first = await sync([log]);
    h.clock.advance(60_000);

    const stale = { ...log, amount: 100, updatedAt: '2026-10-15T05:00:00.000Z' };
    const res = await sync([stale], first.now);
    expect(res.serverChanges).toEqual([log]);
  });

  it('propagates soft deletes', async () => {
    const log = makeLog();
    await sync([log]);
    const deleted = {
      ...log,
      updatedAt: '2026-10-15T06:00:00.000Z',
      deletedAt: '2026-10-15T06:00:00.000Z',
    };
    const res = await sync([deleted]);
    expect(res.serverChanges[0]?.deletedAt).toBe('2026-10-15T06:00:00.000Z');
    expect(await DayLogModel.countDocuments()).toBe(1);
  });

  it('keeps one log per (date, platform) and makes the existing id canonical', async () => {
    const fromPhoneA = makeLog({ updatedAt: '2026-10-15T05:00:00.000Z' });
    await sync([fromPhoneA]);

    const fromPhoneB = makeLog({ amount: 300, updatedAt: '2026-10-15T05:10:00.000Z' });
    const res = await sync([fromPhoneB]);

    expect(await DayLogModel.countDocuments()).toBe(1);
    // Phone B learns the canonical id carrying its newer data.
    expect(res.serverChanges).toEqual([{ ...fromPhoneB, id: fromPhoneA.id }]);
  });

  it('treats several platforms on the same date as separate logs', async () => {
    const logs = ['zomato', 'swiggy', 'blinkit'].map(platform =>
      makeLog({ platform: platform as DayLog['platform'] }),
    );
    const res = await sync(logs);
    expect(res.serverChanges).toHaveLength(3);
  });

  it('refuses to move an existing log to another date or platform', async () => {
    const log = makeLog();
    const first = await sync([log]);
    h.clock.advance(60_000);

    const moved = { ...log, date: '2026-10-13', updatedAt: '2026-10-15T07:00:00.000Z' };
    const res = await sync([moved], first.now);
    expect(res.serverChanges).toEqual([log]);
  });

  it('keeps only the newest change per id within one batch', async () => {
    const log = makeLog();
    const older = { ...log, amount: 1, updatedAt: '2026-10-15T05:00:00.000Z' };
    const newer = { ...log, amount: 2, updatedAt: '2026-10-15T05:05:00.000Z' };
    const res = await sync([newer, older]);
    expect(res.serverChanges).toEqual([newer]);
  });

  it('resolves two new ids for the same day within one batch by last write', async () => {
    const a = makeLog({ amount: 1, updatedAt: '2026-10-15T05:00:00.000Z' });
    const b = makeLog({ amount: 2, updatedAt: '2026-10-15T05:05:00.000Z' });
    const res = await sync([b, a]);
    expect(res.serverChanges).toEqual([{ ...b, id: a.id }]);
  });

  it('clamps timestamps from a phone clock far in the future', async () => {
    const future = makeLog({ updatedAt: '2030-01-01T00:00:00.000Z' });
    const res = await sync([future]);
    const clamped = new Date(h.clock.now().getTime() + MAX_CLIENT_CLOCK_SKEW_MS).toISOString();
    expect(res.serverChanges[0]?.updatedAt).toBe(clamped);
  });

  describe('isolation between users', () => {
    let other: Session;
    beforeEach(async () => {
      other = await login(h, OTHER_PHONE);
      await enableBackup(other);
    });

    it('never returns another user’s logs', async () => {
      await sync([makeLog()]);
      const res = await sync([], null, other);
      expect(res.serverChanges).toHaveLength(0);
    });

    it('cannot overwrite another user’s log by reusing its id', async () => {
      const mine = makeLog({ amount: 100 });
      await sync([mine]);

      const hijack = { ...mine, amount: 0, updatedAt: '2026-10-15T09:00:00.000Z' };
      const res = await sync([hijack], null, other);
      expect(res.serverChanges).toHaveLength(0);

      const stored = await DayLogModel.findById(mine.id).lean();
      expect(stored?.amount).toBe(100);
      expect(String(stored?.userId)).toBe(session.userId);
    });

    it('lets both users log the same date and platform', async () => {
      await sync([makeLog()]);
      await sync([makeLog()], null, other);
      expect(await DayLogModel.countDocuments()).toBe(2);
    });
  });

  describe('validation', () => {
    it.each([
      ['a non-UUID id', makeLog({ id: 'abc' })],
      ['an impossible date', makeLog({ date: '2026-02-30' })],
      ['an unknown platform', { ...makeLog(), platform: 'dunzo' }],
      ['a negative amount', makeLog({ amount: -1 })],
    ])('rejects %s', async (_label, change) => {
      const res = await h.agent
        .post('/sync')
        .set(session.auth)
        .send({ changes: [change], since: null })
        .expect(400);
      expect(res.body.error.code).toBe('validation_error');
    });

    it('rejects batches over the limit', async () => {
      const changes = Array.from({ length: 501 }, () => makeLog());
      await h.agent.post('/sync').set(session.auth).send({ changes, since: null }).expect(400);
    });
  });
});
