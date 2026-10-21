import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import { type Logger } from 'pino';
import request from 'supertest';

import { createApp } from '../../app';
import { parseEnv } from '../../config/env';
import { type AppContext } from '../../context';
import { createLogger } from '../../lib/logger';
import { type RateLimitConfig } from '../../middleware/rate-limit';
import { OtpDeliveryError, type OtpProvider } from '../../modules/auth/otp';

export const TEST_PHONE = '9876543210';
export const OTHER_PHONE = '9123456780';

/** Records OTPs instead of sending SMS. */
export class CapturingOtpProvider implements OtpProvider {
  readonly name = 'capturing';
  readonly sent: Array<{ phone: string; otp: string }> = [];
  failNext = false;

  async send(phone: string, otp: string): Promise<void> {
    if (this.failNext) {
      this.failNext = false;
      throw new OtpDeliveryError('simulated failure');
    }
    this.sent.push({ phone, otp });
  }

  lastOtp(phone: string): string {
    const entry = [...this.sent].reverse().find(s => s.phone === phone);
    if (!entry) throw new Error(`No OTP sent to ${phone}`);
    return entry.otp;
  }
}

/** A clock tests can move forward. */
export class TestClock {
  constructor(private current = new Date('2026-10-15T06:00:00.000Z')) {}
  now = () => new Date(this.current);
  advance(ms: number): void {
    this.current = new Date(this.current.getTime() + ms);
  }
}

const GENEROUS_LIMITS: RateLimitConfig = {
  windowMs: 15 * 60 * 1000,
  general: 10_000,
  otpRequestPerIp: 10_000,
  otpRequestPerPhone: 10_000,
  otpVerifyPerIp: 10_000,
};

export interface TestHarness {
  ctx: AppContext;
  agent: ReturnType<typeof request>;
  otp: CapturingOtpProvider;
  clock: TestClock;
  logs: string[];
}

export function createHarness(
  overrides: { rateLimits?: Partial<RateLimitConfig>; env?: NodeJS.ProcessEnv } = {},
): TestHarness {
  const logs: string[] = [];
  // The real logger config, writing into memory so tests can inspect output.
  const logger: Logger = createLogger('debug', false, { write: (line: string) => logs.push(line) });
  const otp = new CapturingOtpProvider();
  const clock = new TestClock();
  const ctx: AppContext = {
    env: parseEnv({ NODE_ENV: 'test', ...overrides.env }),
    logger,
    otpProvider: otp,
    rateLimits: { ...GENEROUS_LIMITS, ...overrides.rateLimits },
    now: clock.now,
  };
  return { ctx, agent: request(createApp(ctx)), otp, clock, logs };
}

/** Starts one in-memory MongoDB per test file and empties it between tests. */
export function useTestDatabase(): void {
  let server: MongoMemoryServer;

  beforeAll(async () => {
    server = await MongoMemoryServer.create();
    await mongoose.connect(server.getUri('saddahaq-test'));
    await mongoose.connection.syncIndexes();
  });

  afterEach(async () => {
    const collections = await mongoose.connection.db!.collections();
    await Promise.all(collections.map(c => c.deleteMany({})));
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await server.stop();
  });
}

export interface Session {
  accessToken: string;
  refreshToken: string;
  userId: string;
  auth: { Authorization: string };
}

export async function login(h: TestHarness, phone = TEST_PHONE): Promise<Session> {
  await h.agent.post('/auth/otp/request').send({ phone }).expect(202);
  const res = await h.agent
    .post('/auth/otp/verify')
    .send({ phone, otp: h.otp.lastOtp(phone) })
    .expect(200);
  // Let the next OTP request pass the resend cooldown.
  h.clock.advance(61_000);
  return {
    accessToken: res.body.accessToken,
    refreshToken: res.body.refreshToken,
    userId: res.body.user.id,
    auth: { Authorization: `Bearer ${res.body.accessToken}` },
  };
}
