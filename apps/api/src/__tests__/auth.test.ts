import jwt from 'jsonwebtoken';

import { authResponseSchema, otpRequestResponseSchema } from '@saddahaq/shared';

import { OtpModel, RefreshTokenModel } from '../models/auth';
import { UserModel } from '../models/user';
import { OTP_MAX_ATTEMPTS } from '../modules/auth/service';
import { REFRESH_TOKEN_TTL_MS } from '../modules/auth/tokens';
import {
  OTHER_PHONE,
  TEST_PHONE,
  type TestHarness,
  createHarness,
  login,
  useTestDatabase,
} from './helpers/setup';

useTestDatabase();

let h: TestHarness;
beforeEach(() => {
  h = createHarness();
});

const requestOtp = (phone: string = TEST_PHONE) =>
  h.agent.post('/auth/otp/request').send({ phone });
const verifyOtp = (otp: string, phone: string = TEST_PHONE) =>
  h.agent.post('/auth/otp/verify').send({ phone, otp });

describe('POST /auth/otp/request', () => {
  it('sends a 6-digit OTP and stores only hashes', async () => {
    const res = await requestOtp('+91 98765 43210').expect(202);
    expect(otpRequestResponseSchema.parse(res.body)).toEqual({
      expiresInSec: 300,
      resendAfterSec: 60,
    });

    const otp = h.otp.lastOtp(TEST_PHONE);
    expect(otp).toMatch(/^\d{6}$/);

    const stored = await OtpModel.findOne().lean();
    const serialized = JSON.stringify(stored);
    expect(serialized).not.toContain(TEST_PHONE);
    expect(stored?.otpHash).not.toContain(otp);
    expect(stored?.otpHash).toMatch(/^[0-9a-f]{64}$/);
  });

  it('rejects an invalid phone number', async () => {
    const res = await requestOtp('12345').expect(400);
    expect(res.body.error.code).toBe('validation_error');
    expect(h.otp.sent).toHaveLength(0);
  });

  it('enforces a resend cooldown', async () => {
    await requestOtp().expect(202);
    h.clock.advance(30_000);
    const res = await requestOtp().expect(429);
    expect(res.body.error).toMatchObject({ code: 'otp_cooldown', details: { retryAfterSec: 30 } });

    h.clock.advance(31_000);
    await requestOtp().expect(202);
    expect(h.otp.sent).toHaveLength(2);
  });

  it('allows a new code once the previous one expired', async () => {
    await requestOtp().expect(202);
    h.clock.advance(6 * 60_000);
    await requestOtp().expect(202);
  });

  it('rate-limits OTP requests per phone number', async () => {
    h = createHarness({ rateLimits: { otpRequestPerPhone: 2 } });
    await requestOtp().expect(202);
    h.clock.advance(61_000);
    await requestOtp().expect(202);
    h.clock.advance(61_000);
    const res = await requestOtp().expect(429);
    expect(res.body.error.code).toBe('rate_limited');
    // A different number is still allowed.
    await requestOtp(OTHER_PHONE).expect(202);
  });

  it('rate-limits OTP requests per IP', async () => {
    h = createHarness({ rateLimits: { otpRequestPerIp: 1 } });
    await requestOtp().expect(202);
    await requestOtp(OTHER_PHONE).expect(429);
  });

  it('returns 502 and discards the code when SMS delivery fails', async () => {
    h.otp.failNext = true;
    const res = await requestOtp().expect(502);
    expect(res.body.error.code).toBe('otp_delivery_failed');
    expect(await OtpModel.countDocuments()).toBe(0);
  });

  it('never writes the phone number to logs', async () => {
    await requestOtp().expect(202);
    await verifyOtp(h.otp.lastOtp(TEST_PHONE)).expect(200);
    const output = h.logs.join('\n');
    expect(output.length).toBeGreaterThan(0);
    expect(output).not.toContain(TEST_PHONE);
  });
});

describe('POST /auth/otp/verify', () => {
  it('creates the user on first login and returns tokens', async () => {
    await requestOtp().expect(202);
    const res = await verifyOtp(h.otp.lastOtp(TEST_PHONE)).expect(200);

    const body = authResponseSchema.parse(res.body);
    expect(body.user).toMatchObject({
      phoneLast4: '3210',
      language: 'hi',
      platforms: [],
      eshramRegistered: false,
      consents: { backup: false, analytics: false, acceptedAt: null },
    });

    const user = await UserModel.findOne().lean();
    expect(JSON.stringify(user)).not.toContain(TEST_PHONE);
    expect(await RefreshTokenModel.countDocuments()).toBe(1);
    const token = await RefreshTokenModel.findOne().lean();
    expect(token?.tokenHash).not.toBe(body.refreshToken);
  });

  it('logs the same user in again', async () => {
    const first = await login(h);
    const second = await login(h);
    expect(second.userId).toBe(first.userId);
    expect(await UserModel.countDocuments()).toBe(1);
  });

  it('rejects a wrong code and locks after too many attempts', async () => {
    await requestOtp().expect(202);
    const otp = h.otp.lastOtp(TEST_PHONE);
    const wrong = otp === '000000' ? '111111' : '000000';

    for (let i = 0; i < OTP_MAX_ATTEMPTS; i++) {
      const res = await verifyOtp(wrong).expect(400);
      expect(res.body.error.code).toBe('otp_invalid');
    }
    const locked = await verifyOtp(otp).expect(429);
    expect(locked.body.error.code).toBe('otp_locked');
    // The code is gone; even the right one fails now.
    await verifyOtp(otp).expect(400);
  });

  it('rejects an expired code', async () => {
    await requestOtp().expect(202);
    h.clock.advance(5 * 60_000 + 1);
    await verifyOtp(h.otp.lastOtp(TEST_PHONE)).expect(400);
  });

  it('accepts each code only once', async () => {
    await requestOtp().expect(202);
    const otp = h.otp.lastOtp(TEST_PHONE);
    await verifyOtp(otp).expect(200);
    await verifyOtp(otp).expect(400);
  });

  it('does not accept one number’s code for another', async () => {
    await requestOtp().expect(202);
    await verifyOtp(h.otp.lastOtp(TEST_PHONE), OTHER_PHONE).expect(400);
  });

  it('validates the OTP format', async () => {
    const res = await verifyOtp('12ab').expect(400);
    expect(res.body.error.code).toBe('validation_error');
  });
});

describe('POST /auth/refresh', () => {
  it('rotates the refresh token', async () => {
    const session = await login(h);
    const res = await h.agent
      .post('/auth/refresh')
      .send({ refreshToken: session.refreshToken })
      .expect(200);
    expect(res.body.refreshToken).not.toBe(session.refreshToken);
    await h.agent.get('/me').set('Authorization', `Bearer ${res.body.accessToken}`).expect(200);
  });

  it('revokes every session when a rotated token is reused', async () => {
    const session = await login(h);
    const rotated = await h.agent
      .post('/auth/refresh')
      .send({ refreshToken: session.refreshToken })
      .expect(200);

    await h.agent.post('/auth/refresh').send({ refreshToken: session.refreshToken }).expect(401);
    // The legitimate new token was revoked too.
    await h.agent
      .post('/auth/refresh')
      .send({ refreshToken: rotated.body.refreshToken })
      .expect(401);
    expect(await RefreshTokenModel.countDocuments()).toBe(0);
  });

  it('rejects an expired refresh token', async () => {
    const session = await login(h);
    h.clock.advance(REFRESH_TOKEN_TTL_MS + 1000);
    await h.agent.post('/auth/refresh').send({ refreshToken: session.refreshToken }).expect(401);
  });

  it('rejects an unknown refresh token', async () => {
    await h.agent
      .post('/auth/refresh')
      .send({ refreshToken: 'x'.repeat(43) })
      .expect(401);
  });
});

describe('POST /auth/logout', () => {
  it('revokes the refresh token', async () => {
    const session = await login(h);
    await h.agent.post('/auth/logout').send({ refreshToken: session.refreshToken }).expect(204);
    await h.agent.post('/auth/refresh').send({ refreshToken: session.refreshToken }).expect(401);
  });

  it('is idempotent', async () => {
    const session = await login(h);
    await h.agent.post('/auth/logout').send({ refreshToken: session.refreshToken }).expect(204);
    await h.agent.post('/auth/logout').send({ refreshToken: session.refreshToken }).expect(204);
  });
});

describe('access tokens', () => {
  it('are required', async () => {
    await h.agent.get('/me').expect(401);
    await h.agent.get('/me').set('Authorization', 'Basic abc').expect(401);
    await h.agent.get('/me').set('Authorization', 'Bearer not-a-jwt').expect(401);
  });

  it('are rejected when expired', async () => {
    const session = await login(h);
    const expired = jwt.sign(
      { exp: Math.floor(Date.now() / 1000) - 10 },
      h.ctx.env.jwtAccessSecret,
      {
        subject: session.userId,
        issuer: 'saddahaq-api',
        audience: 'saddahaq-app',
      },
    );
    await h.agent.get('/me').set('Authorization', `Bearer ${expired}`).expect(401);
  });

  it('are rejected when signed with another secret', async () => {
    const session = await login(h);
    const forged = jwt.sign({}, 'some-other-secret-that-is-long-enough-123', {
      subject: session.userId,
      issuer: 'saddahaq-api',
      audience: 'saddahaq-app',
      expiresIn: 60,
    });
    await h.agent.get('/me').set('Authorization', `Bearer ${forged}`).expect(401);
  });

  it('are rejected with alg "none"', async () => {
    const session = await login(h);
    const unsigned = jwt.sign({}, '', {
      algorithm: 'none',
      subject: session.userId,
      issuer: 'saddahaq-api',
      audience: 'saddahaq-app',
    });
    await h.agent.get('/me').set('Authorization', `Bearer ${unsigned}`).expect(401);
  });

  it('are rejected when the subject is not a user id', async () => {
    const token = jwt.sign({}, h.ctx.env.jwtAccessSecret, {
      subject: 'not-an-object-id',
      issuer: 'saddahaq-api',
      audience: 'saddahaq-app',
      expiresIn: 60,
    });
    await h.agent.get('/me').set('Authorization', `Bearer ${token}`).expect(401);
  });
});
