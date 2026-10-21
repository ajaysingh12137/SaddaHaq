import {
  DEFAULT_ELIGIBILITY_CONFIG,
  type EligibilityLog,
  computeEligibility,
} from '../eligibility';
import { addDays } from '../fy';

const config = DEFAULT_ELIGIBILITY_CONFIG;
const TODAY = '2026-10-15'; // inside FY 2026–27

/** `count` consecutive daily logs for one platform starting at `start`. */
function days(platform: string, start: string, count: number): EligibilityLog[] {
  return Array.from({ length: count }, (_, i) => ({ date: addDays(start, i), platform }));
}

describe('computeEligibility', () => {
  describe('zero logs', () => {
    it('reports no_logs with nothing counted', () => {
      const r = computeEligibility([], config, { today: TODAY });
      expect(r.perPlatform).toEqual({});
      expect(r.combined).toBe(0);
      expect(r.single).toEqual({
        platform: null,
        days: 0,
        target: 90,
        remaining: 90,
        progress: 0,
        met: false,
      });
      expect(r.multi).toMatchObject({ days: 0, target: 120, remaining: 120, progress: 0 });
      expect(r.likelyEligible).toBe(false);
      expect(r.status).toBe('no_logs');
      expect(r.primaryPath).toBe('single');
      expect(r.fy.label).toBe('2026–27');
      expect(r.daysLeftInFy).toBe(168);
    });
  });

  describe('financial-year window', () => {
    it('counts the first and last day of the FY and nothing outside', () => {
      const logs: EligibilityLog[] = [
        { date: '2026-03-31', platform: 'zomato' }, // previous FY
        { date: '2026-04-01', platform: 'zomato' }, // first day
        { date: '2027-03-31', platform: 'zomato' }, // last day
        { date: '2027-04-01', platform: 'zomato' }, // next FY
      ];
      const r = computeEligibility(logs, config, { today: TODAY });
      expect(r.perPlatform).toEqual({ zomato: 2 });
    });

    it('evaluates an explicitly selected previous FY', () => {
      const logs = [...days('swiggy', '2025-04-01', 90), ...days('swiggy', '2026-04-01', 5)];
      const r = computeEligibility(logs, config, { today: TODAY, fyStartYear: 2025 });
      expect(r.fy).toMatchObject({ start: '2025-04-01', end: '2026-03-31' });
      expect(r.perPlatform).toEqual({ swiggy: 90 });
      expect(r.likelyEligible).toBe(true);
      expect(r.daysLeftInFy).toBe(0);
    });

    it('counts 29 February in a leap FY', () => {
      // FY 2027–28 contains 2028-02-29.
      const logs = days('uber', '2028-02-28', 3);
      const r = computeEligibility(logs, config, { today: '2028-03-05' });
      expect(r.fy.startYear).toBe(2027);
      expect(r.perPlatform).toEqual({ uber: 3 });
      expect(logs.map(l => l.date)).toContain('2028-02-29');
    });

    it('can fill all 366 days of a leap FY', () => {
      const r = computeEligibility(days('ola', '2027-04-01', 400), config, {
        today: '2027-04-01',
        fyStartYear: 2027,
      });
      expect(r.perPlatform).toEqual({ ola: 366 });
    });

    it('ignores malformed dates', () => {
      const r = computeEligibility([{ date: '2026-5-1', platform: 'zepto' }], config, {
        today: TODAY,
      });
      expect(r.combined).toBe(0);
    });

    it('honours a non-April FY start month from appConfig', () => {
      const r = computeEligibility(
        [
          { date: '2026-01-01', platform: 'zomato' },
          { date: '2025-12-31', platform: 'zomato' },
        ],
        { ...config, fyStartMonth: 1 },
        { today: TODAY },
      );
      expect(r.fy).toMatchObject({ start: '2026-01-01', end: '2026-12-31' });
      expect(r.combined).toBe(1);
    });
  });

  describe('duplicates and deletions', () => {
    it('counts each (date, platform) once', () => {
      const logs: EligibilityLog[] = [
        { date: '2026-05-01', platform: 'zomato' },
        { date: '2026-05-01', platform: 'zomato' },
        { date: '2026-05-01', platform: 'zomato', deletedAt: null },
      ];
      const r = computeEligibility(logs, config, { today: TODAY });
      expect(r.perPlatform).toEqual({ zomato: 1 });
      expect(r.combined).toBe(1);
    });

    it('skips soft-deleted logs', () => {
      const logs: EligibilityLog[] = [
        { date: '2026-05-01', platform: 'zomato', deletedAt: '2026-05-02T10:00:00.000Z' },
        { date: '2026-05-02', platform: 'zomato' },
      ];
      expect(computeEligibility(logs, config, { today: TODAY }).perPlatform).toEqual({ zomato: 1 });
    });
  });

  describe('combined counting', () => {
    it('counts 3 platforms on the same date as 3', () => {
      const logs = ['zomato', 'swiggy', 'blinkit'].map(platform => ({
        date: '2026-06-01',
        platform,
      }));
      const r = computeEligibility(logs, config, { today: TODAY });
      expect(r.combined).toBe(3);
      expect(r.perPlatform).toEqual({ zomato: 1, swiggy: 1, blinkit: 1 });
      expect(r.status).toBe('in_progress');
    });
  });

  describe('single path', () => {
    it('is met at exactly 90 days on one platform', () => {
      const r = computeEligibility(days('zomato', '2026-04-01', 90), config, { today: TODAY });
      expect(r.single).toMatchObject({
        platform: 'zomato',
        days: 90,
        remaining: 0,
        progress: 1,
        met: true,
      });
      expect(r.multi.met).toBe(false);
      expect(r.likelyEligible).toBe(true);
      expect(r.status).toBe('likely_eligible');
      expect(r.primaryPath).toBe('single');
    });

    it('is not met at 89 days', () => {
      const r = computeEligibility(days('zomato', '2026-04-01', 89), config, { today: TODAY });
      expect(r.single).toMatchObject({ days: 89, remaining: 1, met: false });
      expect(r.likelyEligible).toBe(false);
    });

    it('picks the platform with most days, ties going to the alphabetically first id', () => {
      const r = computeEligibility(
        [
          ...days('zomato', '2026-04-01', 10),
          ...days('swiggy', '2026-04-01', 10),
          ...days('uber', '2026-04-01', 4),
        ],
        config,
        { today: TODAY },
      );
      expect(r.single.platform).toBe('swiggy');

      const r2 = computeEligibility(
        [...days('swiggy', '2026-04-01', 10), ...days('zomato', '2026-04-01', 10)],
        config,
        { today: TODAY },
      );
      expect(r2.single.platform).toBe('swiggy');
    });

    it('clamps progress to 1 above the target', () => {
      const r = computeEligibility(days('rapido', '2026-04-01', 150), config, { today: TODAY });
      expect(r.single.progress).toBe(1);
      expect(r.single.remaining).toBe(0);
    });
  });

  describe('multi path', () => {
    it('is met at exactly 120 platform-days with no single platform at 90', () => {
      const logs = [...days('zomato', '2026-04-01', 60), ...days('swiggy', '2026-04-01', 60)];
      const r = computeEligibility(logs, config, { today: TODAY });
      expect(r.combined).toBe(120);
      expect(r.single.met).toBe(false);
      expect(r.multi).toMatchObject({ met: true, remaining: 0, progress: 1 });
      expect(r.likelyEligible).toBe(true);
      expect(r.primaryPath).toBe('multi');
    });

    it('is not met at 119', () => {
      const logs = [...days('zomato', '2026-04-01', 60), ...days('swiggy', '2026-04-01', 59)];
      const r = computeEligibility(logs, config, { today: TODAY });
      expect(r.multi).toMatchObject({ days: 119, remaining: 1, met: false });
      expect(r.likelyEligible).toBe(false);
    });
  });

  describe('primary path selection', () => {
    it('shows the single path when it needs fewer days', () => {
      // single 80 (10 left) vs combined 85 (35 left)
      const logs = [...days('zomato', '2026-04-01', 80), ...days('swiggy', '2026-04-01', 5)];
      expect(computeEligibility(logs, config, { today: TODAY }).primaryPath).toBe('single');
    });

    it('shows the multi path when it needs fewer days', () => {
      // single 40 (50 left) vs combined 100 (20 left)
      const logs = [
        ...days('zomato', '2026-04-01', 40),
        ...days('swiggy', '2026-04-01', 30),
        ...days('ola', '2026-04-01', 30),
      ];
      expect(computeEligibility(logs, config, { today: TODAY }).primaryPath).toBe('multi');
    });

    it('breaks a remaining-days tie by the higher ratio once both are met', () => {
      // single 95/90 ≈ 1.056, combined 130/120 ≈ 1.083 → multi
      const multiWins = [...days('zomato', '2026-04-01', 95), ...days('swiggy', '2026-04-01', 35)];
      expect(computeEligibility(multiWins, config, { today: TODAY }).primaryPath).toBe('multi');

      // single 100/90 ≈ 1.11, combined 121/120 ≈ 1.008 → single
      const singleWins = [
        ...days('zomato', '2026-04-01', 100),
        ...days('swiggy', '2026-04-01', 21),
      ];
      expect(computeEligibility(singleWins, config, { today: TODAY }).primaryPath).toBe('single');
    });

    it('breaks a remaining-days tie by ratio while neither is met', () => {
      // thresholds 20/30: single 10 (10 left, 0.5) vs combined 20 (10 left, 0.667) → multi
      const r = computeEligibility(
        [...days('zomato', '2026-04-01', 10), ...days('swiggy', '2026-04-01', 10)],
        { ...config, singleThreshold: 20, multiThreshold: 30 },
        { today: TODAY },
      );
      expect(r.primaryPath).toBe('multi');
    });

    it('prefers single on a full tie with one platform logged', () => {
      // Equal thresholds and one platform: single == combined on every measure.
      const r = computeEligibility(
        days('zomato', '2026-04-01', 10),
        { ...config, singleThreshold: 100, multiThreshold: 100 },
        { today: TODAY },
      );
      expect(r.single.remaining).toBe(r.multi.remaining);
      expect(r.primaryPath).toBe('single');
    });

    it('prefers multi on a full tie when several platforms are logged', () => {
      // single = 10, combined = 20; thresholds 10 and 20 → both met, ratio 1 = 1.
      const r = computeEligibility(
        [...days('zomato', '2026-04-01', 10), ...days('swiggy', '2026-04-01', 10)],
        { ...config, singleThreshold: 10, multiThreshold: 20 },
        { today: TODAY },
      );
      expect(r.single.remaining).toBe(0);
      expect(r.multi.remaining).toBe(0);
      expect(r.primaryPath).toBe('multi');
    });
  });

  describe('status', () => {
    it('is fy_ended for a past FY that was not met', () => {
      const r = computeEligibility(days('zomato', '2025-04-01', 10), config, {
        today: TODAY,
        fyStartYear: 2025,
      });
      expect(r.status).toBe('fy_ended');
      expect(r.daysLeftInFy).toBe(0);
    });

    it('is fy_ended for a past FY with no logs', () => {
      const r = computeEligibility([], config, { today: TODAY, fyStartYear: 2024 });
      expect(r.status).toBe('fy_ended');
    });

    it('prefers likely_eligible over fy_ended', () => {
      const r = computeEligibility(days('zomato', '2025-04-01', 90), config, {
        today: TODAY,
        fyStartYear: 2025,
      });
      expect(r.status).toBe('likely_eligible');
    });

    it('is no_logs for a future FY', () => {
      const r = computeEligibility([], config, { today: TODAY, fyStartYear: 2027 });
      expect(r.status).toBe('no_logs');
      expect(r.daysLeftInFy).toBe(366);
    });
  });

  describe('config validation', () => {
    it.each([
      [{ singleThreshold: 0 }],
      [{ singleThreshold: -1 }],
      [{ singleThreshold: 1.5 }],
      [{ multiThreshold: 0 }],
      [{ multiThreshold: NaN }],
    ])('rejects %p', override => {
      expect(() => computeEligibility([], { ...config, ...override }, { today: TODAY })).toThrow(
        RangeError,
      );
    });
  });
});
