import { contentResponseSchema } from '@saddahaq/shared';

import { SchemeModel } from '../models/content';
import { seedContent } from '../seed/seed';
import { type TestHarness, createHarness, useTestDatabase } from './helpers/setup';

useTestDatabase();

let h: TestHarness;
beforeEach(() => {
  h = createHarness();
});

describe('GET /content', () => {
  it('returns 503 before content is seeded', async () => {
    const res = await h.agent.get('/content').expect(503);
    expect(res.body.error.code).toBe('content_unavailable');
  });

  it('returns all content in both languages without login', async () => {
    await seedContent(new Date('2026-10-15T00:00:00Z'));
    const res = await h.agent.get('/content?lang=hi').expect(200);
    const content = contentResponseSchema.parse(res.body);

    expect(content.appConfig).toEqual({
      minAppVersion: '0.1.0',
      singleThreshold: 90,
      multiThreshold: 120,
      fyStartMonth: 4,
    });
    expect(content.eshramSteps.length).toBeGreaterThanOrEqual(6);
    expect(content.eshramSteps.length).toBeLessThanOrEqual(8);
    expect(content.eshramSteps.map(s => s.order)).toEqual(
      [...content.eshramSteps.map(s => s.order)].sort((a, b) => a - b),
    );
    expect(content.schemes.length).toBeGreaterThanOrEqual(4);
    for (const item of [...content.schemes, ...content.eshramSteps]) {
      expect(item.placeholder).toBe(true);
    }
    for (const scheme of content.schemes) {
      expect(scheme.name.en).toMatch(/^PLACEHOLDER — /);
      // No unverified contact details are shipped.
      expect(scheme.helpline).toBeNull();
      expect(scheme.url).toBeNull();
      expect(scheme.name.hi.length).toBeGreaterThan(0);
    }
  });

  it('answers 304 when nothing changed since the client copy', async () => {
    await seedContent(new Date('2026-10-15T00:00:00Z'));
    const first = await h.agent.get('/content').expect(200);
    await h.agent.get(`/content?since=${encodeURIComponent(first.body.updatedAt)}`).expect(304);
    await h.agent.get('/content?since=2020-01-01T00:00:00.000Z').expect(200);
  });

  it('invalidates caches when content is re-seeded, including deletions', async () => {
    await seedContent(new Date('2026-10-15T00:00:00Z'));
    await SchemeModel.create({
      slug: 'stale',
      order: 99,
      name: { hi: 'x', en: 'x' },
      covers: { hi: 'x', en: 'x' },
      whoQualifies: { hi: 'x', en: 'x' },
      documents: { hi: [], en: [] },
      whereToApply: { hi: 'x', en: 'x' },
      lastVerified: '2026-10-15',
      placeholder: true,
    });
    const before = await h.agent.get('/content').expect(200);

    await seedContent(new Date(Date.now() + 60_000));
    const after = await h.agent
      .get(`/content?since=${encodeURIComponent(before.body.updatedAt)}`)
      .expect(200);
    expect(after.body.schemes.map((s: { id: string }) => s.id)).not.toContain('stale');
  });

  it('validates query parameters', async () => {
    await h.agent.get('/content?lang=ta').expect(400);
    await h.agent.get('/content?since=yesterday').expect(400);
  });
});

describe('seedContent', () => {
  it('is idempotent', async () => {
    const first = await seedContent(new Date());
    await seedContent(new Date());
    expect(await SchemeModel.countDocuments()).toBe(first.schemes);
  });
});
