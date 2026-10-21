import { dayLogSchema } from '@saddahaq/shared';

import {
  __resetDatabaseForTests,
  destroyDatabase,
  getDatabase,
  openDatabase,
} from '../db/database';
import { MIGRATIONS } from '../db/migrations';
import { kvDelete, kvGet, kvSet } from '../db/kv';
import { uuidv4 } from '../lib/random';
import {
  clearTokens,
  getOrCreateDatabaseKey,
  loadTokens,
  saveTokens,
} from '../security/secureStore';

afterEach(() => {
  __resetDatabaseForTests();
});

describe('uuidv4', () => {
  it('produces valid, unique version-4 UUIDs', () => {
    const ids = Array.from({ length: 200 }, uuidv4);
    expect(new Set(ids).size).toBe(200);
    for (const id of ids) {
      expect(dayLogSchema.shape.id.safeParse(id).success).toBe(true);
    }
  });
});

describe('secure store', () => {
  it('round-trips tokens and clears them', async () => {
    await saveTokens({ accessToken: 'a', refreshToken: 'b' });
    expect(await loadTokens()).toEqual({ accessToken: 'a', refreshToken: 'b' });
    await clearTokens();
    expect(await loadTokens()).toBeNull();
  });

  it('creates one 256-bit database key and reuses it', async () => {
    const key = await getOrCreateDatabaseKey();
    expect(key).toMatch(/^[0-9a-f]{64}$/);
    expect(await getOrCreateDatabaseKey()).toBe(key);
  });
});

describe('database', () => {
  it('migrates to the latest schema version', async () => {
    const db = await openDatabase();
    const { rows } = await db.execute('PRAGMA user_version');
    expect(rows[0]?.user_version).toBe(MIGRATIONS.length);
  });

  it('is idempotent across restarts', async () => {
    await openDatabase();
    await kvSet('x', 1);
    __resetDatabaseForTests();
    await openDatabase();
    expect(await kvGet('x')).toBe(1);
  });

  it('enforces one log per (date, platform)', async () => {
    const db = await openDatabase();
    const insert = (id: string) =>
      db.execute(
        "INSERT INTO day_logs (id, date, platform, source, updated_at) VALUES (?, '2026-10-14', 'zomato', 'tap', '2026-10-15T00:00:00Z')",
        [id],
      );
    await insert(uuidv4());
    await expect(insert(uuidv4())).rejects.toThrow();
  });

  it('recreates the database when the key no longer opens it', async () => {
    await openDatabase();
    await kvSet('x', 1);
    __resetDatabaseForTests();
    // Simulate a keystore reset: a new key cannot read the old file.
    const keychain = jest.requireMock('react-native-keychain');
    await keychain.resetGenericPassword({ service: 'in.saddahaq.dbkey' });

    await openDatabase();
    expect(await kvGet('x')).toBeNull();
  });

  it('throws if used before opening', () => {
    expect(() => getDatabase()).toThrow(/not opened/);
  });

  it('destroys the database and its key', async () => {
    await openDatabase();
    const key = await getOrCreateDatabaseKey();
    await destroyDatabase();
    expect(() => getDatabase()).toThrow();
    expect(await getOrCreateDatabaseKey()).not.toBe(key);
  });
});

describe('kv store', () => {
  beforeEach(async () => {
    await openDatabase();
  });

  it('stores JSON values', async () => {
    await kvSet('settings', { a: [1, 2], b: 'हिन्दी' });
    expect(await kvGet('settings')).toEqual({ a: [1, 2], b: 'हिन्दी' });
  });

  it('overwrites and deletes', async () => {
    await kvSet('k', 1);
    await kvSet('k', 2);
    expect(await kvGet('k')).toBe(2);
    await kvDelete('k');
    expect(await kvGet('k')).toBeNull();
  });

  it('returns null for corrupt values', async () => {
    await getDatabase().execute("INSERT INTO kv (key, value) VALUES ('bad', '{oops')");
    expect(await kvGet('bad')).toBeNull();
  });
});
