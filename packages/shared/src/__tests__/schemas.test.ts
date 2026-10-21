import {
  appConfigSchema,
  dayLogSchema,
  otpRequestSchema,
  otpVerifySchema,
  schemeSchema,
  syncRequestSchema,
  userPatchSchema,
} from '../schemas';

const validLog = {
  id: '3b241101-e2bb-4255-8caf-4136c566a962',
  date: '2026-10-14',
  platform: 'zomato',
  source: 'tap',
  amount: null,
  updatedAt: '2026-10-14T18:30:00.000Z',
  deletedAt: null,
};

describe('dayLogSchema', () => {
  it('accepts a valid log', () => {
    expect(dayLogSchema.parse(validLog)).toEqual(validLog);
  });

  it.each([
    ['non-v4 id', { id: '3b241101-e2bb-1255-8caf-4136c566a962' }],
    ['impossible date', { date: '2026-02-30' }],
    ['unknown platform', { platform: 'dunzo' }],
    ['unknown source', { source: 'scrape' }],
    ['negative amount', { amount: -5 }],
    ['bad timestamp', { updatedAt: 'yesterday' }],
  ])('rejects %s', (_label, override) => {
    expect(dayLogSchema.safeParse({ ...validLog, ...override }).success).toBe(false);
  });
});

describe('syncRequestSchema', () => {
  it('accepts a first sync', () => {
    expect(syncRequestSchema.safeParse({ changes: [validLog], since: null }).success).toBe(true);
  });

  it('caps the batch size', () => {
    const changes = Array.from({ length: 501 }, () => validLog);
    expect(syncRequestSchema.safeParse({ changes, since: null }).success).toBe(false);
  });
});

describe('auth schemas', () => {
  it('normalises the phone number', () => {
    expect(otpRequestSchema.parse({ phone: '+91 98765 43210' })).toEqual({ phone: '9876543210' });
  });

  it('rejects an invalid phone number', () => {
    expect(otpRequestSchema.safeParse({ phone: '12345' }).success).toBe(false);
  });

  it('requires a 6-digit OTP', () => {
    expect(otpVerifySchema.safeParse({ phone: '9876543210', otp: '123456' }).success).toBe(true);
    expect(otpVerifySchema.safeParse({ phone: '9876543210', otp: '12345' }).success).toBe(false);
  });
});

describe('userPatchSchema', () => {
  it('accepts a partial update', () => {
    expect(userPatchSchema.safeParse({ language: 'en' }).success).toBe(true);
  });

  it('rejects unknown fields such as a phone change', () => {
    expect(userPatchSchema.safeParse({ phoneHash: 'x' }).success).toBe(false);
  });

  it('rejects duplicate platforms', () => {
    expect(userPatchSchema.safeParse({ platforms: ['ola', 'ola'] }).success).toBe(false);
  });
});

describe('content schemas', () => {
  it('validates app config bounds', () => {
    const config = {
      minAppVersion: '0.1.0',
      singleThreshold: 90,
      multiThreshold: 120,
      fyStartMonth: 4,
    };
    expect(appConfigSchema.safeParse(config).success).toBe(true);
    expect(appConfigSchema.safeParse({ ...config, fyStartMonth: 13 }).success).toBe(false);
  });

  it('allows null helpline and url for unverified placeholder schemes', () => {
    const text = { hi: 'x', en: 'x' };
    const scheme = {
      id: 'placeholder-1',
      order: 1,
      name: text,
      covers: text,
      whoQualifies: text,
      documents: { hi: [], en: [] },
      whereToApply: text,
      helpline: null,
      url: null,
      lastVerified: '2026-10-15',
      placeholder: true,
    };
    expect(schemeSchema.safeParse(scheme).success).toBe(true);
  });
});
