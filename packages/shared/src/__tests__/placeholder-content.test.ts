import {
  SEED_APP_CONFIG,
  SEED_AUTHORED_ON,
  SEED_ESHRAM_STEPS,
  SEED_SCHEMES,
} from '../content/placeholder';
import { DEFAULT_ELIGIBILITY_CONFIG } from '../eligibility';
import { appConfigSchema, eshramStepSchema, schemeSchema } from '../schemas';

describe('placeholder content', () => {
  it('matches the API schemas', () => {
    for (const scheme of SEED_SCHEMES) expect(schemeSchema.parse(scheme)).toEqual(scheme);
    for (const step of SEED_ESHRAM_STEPS) expect(eshramStepSchema.parse(step)).toEqual(step);
    expect(appConfigSchema.parse(SEED_APP_CONFIG)).toEqual(SEED_APP_CONFIG);
  });

  it('marks every scheme as unverified and invents no helplines or URLs', () => {
    expect(SEED_SCHEMES.length).toBeGreaterThanOrEqual(4);
    for (const scheme of SEED_SCHEMES) {
      expect(scheme.placeholder).toBe(true);
      expect(scheme.name.en.startsWith('PLACEHOLDER — ')).toBe(true);
      expect(scheme.name.hi.startsWith('प्लेसहोल्डर — ')).toBe(true);
      expect(scheme.helpline).toBeNull();
      expect(scheme.url).toBeNull();
      expect(scheme.lastVerified).toBe(SEED_AUTHORED_ON);
      // No rupee amounts anywhere in the copy.
      expect(JSON.stringify(scheme)).not.toMatch(/₹|\brs\.?\s?\d/i);
    }
  });

  it('has a 6–8 step e-Shram guide in order, all marked as placeholder', () => {
    expect(SEED_ESHRAM_STEPS.length).toBeGreaterThanOrEqual(6);
    expect(SEED_ESHRAM_STEPS.length).toBeLessThanOrEqual(8);
    expect(SEED_ESHRAM_STEPS.map(s => s.order)).toEqual(SEED_ESHRAM_STEPS.map((_, i) => i + 1));
    expect(SEED_ESHRAM_STEPS.every(s => s.placeholder)).toBe(true);
  });

  it('uses unique ids', () => {
    for (const list of [SEED_SCHEMES, SEED_ESHRAM_STEPS]) {
      expect(new Set(list.map(item => item.id)).size).toBe(list.length);
    }
  });

  it('ships the same thresholds as the eligibility defaults', () => {
    const { singleThreshold, multiThreshold, fyStartMonth } = SEED_APP_CONFIG;
    expect({ singleThreshold, multiThreshold, fyStartMonth }).toEqual(DEFAULT_ELIGIBILITY_CONFIG);
  });
});
