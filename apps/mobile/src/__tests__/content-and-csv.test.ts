import {
  type ContentResponse,
  DEFAULT_ELIGIBILITY_CONFIG,
  SEED_APP_CONFIG,
  SEED_ESHRAM_STEPS,
  SEED_SCHEMES,
  contentResponseSchema,
} from '@saddahaq/shared';

import packageJson from '../../package.json';
import { APP_VERSION } from '../config/version';
import { __resetDatabaseForTests, openDatabase } from '../db/database';
import { kvGet, kvSet } from '../db/kv';
import { logsToCsv } from '../lib/csv';
import { __useFetchForTests } from '../services/api';
import {
  BUNDLED_CONTENT,
  compareVersions,
  currentContent,
  loadCachedContent,
  refreshContent,
} from '../services/content';
import { resetSessionStore, useSession } from '../state/sessionStore';
import { createFakeServer } from '../test-utils/fakeServer';

let server: ReturnType<typeof createFakeServer>;

const serverContent = (overrides: Partial<ContentResponse> = {}): ContentResponse => ({
  schemes: [...SEED_SCHEMES].reverse(),
  eshramSteps: SEED_ESHRAM_STEPS,
  appConfig: { ...SEED_APP_CONFIG, singleThreshold: 100 },
  updatedAt: '2026-10-20T00:00:00.000Z',
  ...overrides,
});

beforeEach(async () => {
  resetSessionStore();
  __resetDatabaseForTests();
  await openDatabase();
  server = createFakeServer();
  __useFetchForTests(server.fetchImpl);
});

describe('bundled content', () => {
  it('is valid against the API schema, so the app works before the first fetch', () => {
    expect(
      contentResponseSchema.safeParse({ ...BUNDLED_CONTENT, updatedAt: new Date().toISOString() })
        .success,
    ).toBe(true);
  });

  it('is clearly marked as placeholder, with no invented helplines or URLs', () => {
    for (const scheme of BUNDLED_CONTENT.schemes) {
      expect(scheme.placeholder).toBe(true);
      expect(scheme.name.en).toMatch(/^PLACEHOLDER — /);
      expect(scheme.helpline).toBeNull();
      expect(scheme.url).toBeNull();
    }
    expect(BUNDLED_CONTENT.eshramSteps.length).toBeGreaterThanOrEqual(6);
    expect(BUNDLED_CONTENT.eshramSteps.length).toBeLessThanOrEqual(8);
  });
});

describe('content cache', () => {
  it('falls back to the bundled content on first launch', async () => {
    await loadCachedContent();
    expect(currentContent()).toBe(BUNDLED_CONTENT);
    expect(useSession.getState().eligibilityConfig).toEqual(DEFAULT_ELIGIBILITY_CONFIG);
  });

  it('fetches, sorts, caches and applies server content', async () => {
    server.on('GET /content', () => ({ body: serverContent() }));
    await loadCachedContent();
    await refreshContent();

    expect(server.callsTo('GET /content')).toHaveLength(1);
    expect(currentContent().schemes.map(s => s.order)).toEqual([1, 2, 3, 4, 5]);
    expect(useSession.getState().eligibilityConfig.singleThreshold).toBe(100);

    // A restart (offline) uses the cached copy, thresholds included.
    resetSessionStore();
    __resetDatabaseForTests();
    await openDatabase();
    await loadCachedContent();
    expect(currentContent().updatedAt).toBe('2026-10-20T00:00:00.000Z');
    expect(useSession.getState().eligibilityConfig.singleThreshold).toBe(100);
  });

  it('sends the cached timestamp and keeps its copy on 304', async () => {
    server.on('GET /content', () => ({ body: serverContent() }));
    await loadCachedContent();
    await refreshContent();
    server.on('GET /content', () => ({ status: 304 }));
    await refreshContent();
    const urls = jest.mocked(server.fetchImpl).mock.calls.map(c => String(c[0]));
    expect(urls[1]).toContain('since=2026-10-20T00%3A00%3A00.000Z');
    expect(currentContent().updatedAt).toBe('2026-10-20T00:00:00.000Z');
  });

  it('keeps the current copy when offline', async () => {
    jest.mocked(server.fetchImpl).mockRejectedValueOnce(new TypeError('Network request failed'));
    await loadCachedContent();
    await expect(refreshContent()).rejects.toMatchObject({ code: 'network' });
    expect(currentContent()).toBe(BUNDLED_CONTENT);
  });

  it('ignores a cache in an outdated shape', async () => {
    await kvSet('content.cache', { schemes: 'old format' });
    await loadCachedContent();
    expect(currentContent()).toBe(BUNDLED_CONTENT);
    expect(await kvGet('content.cache')).toEqual({ schemes: 'old format' });
  });
});

describe('versions', () => {
  it('APP_VERSION matches package.json', () => {
    expect(APP_VERSION).toBe(packageJson.version);
  });

  it.each([
    ['0.1.0', '0.1.0', 0],
    ['0.1.0', '0.2.0', -1],
    ['1.0.0', '0.9.9', 1],
    ['0.10.0', '0.9.0', 1],
  ])('compares %s with %s', (a, b, sign) => {
    expect(Math.sign(compareVersions(a, b))).toBe(sign);
  });
});

describe('logsToCsv', () => {
  const name = (id: string) => ({ zomato: 'Zomato', uber: 'Uber', other: 'Other, misc' })[id] ?? id;

  it('writes a header and one row per log, oldest first, in platform order', () => {
    const csv = logsToCsv(
      [
        { date: '2026-10-20', platform: 'uber', source: 'tap', amount: null },
        { date: '2026-10-19', platform: 'zomato', source: 'ocr', amount: 850.5 },
        { date: '2026-10-20', platform: 'zomato', source: 'tap', amount: null },
      ],
      name as never,
    );
    expect(csv).toBe(
      [
        'date,app,source,amount',
        '2026-10-19,Zomato,screenshot,850.5',
        '2026-10-20,Zomato,tap,',
        '2026-10-20,Uber,tap,',
        '',
      ].join('\r\n'),
    );
  });

  it('quotes fields that contain commas or quotes', () => {
    const csv = logsToCsv(
      [{ date: '2026-10-19', platform: 'other', source: 'tap', amount: null }],
      name as never,
    );
    expect(csv.split('\r\n')[1]).toBe('2026-10-19,"Other, misc",tap,');
  });
});
