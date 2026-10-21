import mongoose from 'mongoose';

import { maskPhones } from '../lib/logger';
import { type TestHarness, createHarness, useTestDatabase } from './helpers/setup';

useTestDatabase();

let h: TestHarness;
beforeEach(() => {
  h = createHarness({ env: { CORS_ORIGINS: 'https://admin.example.org' } });
});

describe('GET /health', () => {
  it('reports ok with the database up', async () => {
    const res = await h.agent.get('/health').expect(200);
    expect(res.body).toEqual({ status: 'ok', db: 'up', version: '0.1.0' });
  });

  it('reports degraded when the database is down', async () => {
    // readyState is a non-configurable prototype getter, so shadow it on the instance.
    Object.defineProperty(mongoose.connection, 'readyState', { get: () => 0, configurable: true });
    try {
      const res = await h.agent.get('/health').expect(503);
      expect(res.body).toMatchObject({ status: 'degraded', db: 'down' });
    } finally {
      delete (mongoose.connection as { readyState?: number }).readyState;
    }
  });
});

describe('error handling', () => {
  it('returns JSON 404 for unknown routes', async () => {
    const res = await h.agent.get('/nope').expect(404);
    expect(res.body.error.code).toBe('not_found');
  });

  it('returns 400 for malformed JSON', async () => {
    const res = await h.agent
      .post('/auth/otp/request')
      .set('Content-Type', 'application/json')
      .send('{"phone":')
      .expect(400);
    expect(res.body.error.code).toBe('invalid_json');
  });

  it('returns 413 for oversized bodies', async () => {
    const res = await h.agent
      .post('/auth/otp/request')
      .send({ phone: 'x'.repeat(300_000) })
      .expect(413);
    expect(res.body.error.code).toBe('payload_too_large');
  });
});

describe('security headers and CORS', () => {
  it('sets helmet headers and hides the framework', async () => {
    const res = await h.agent.get('/health');
    expect(res.headers['x-content-type-options']).toBe('nosniff');
    expect(res.headers['x-powered-by']).toBeUndefined();
  });

  it('allows listed browser origins only', async () => {
    const allowed = await h.agent.get('/health').set('Origin', 'https://admin.example.org');
    expect(allowed.headers['access-control-allow-origin']).toBe('https://admin.example.org');

    const denied = await h.agent.get('/health').set('Origin', 'https://evil.example.com');
    expect(denied.headers['access-control-allow-origin']).toBeUndefined();
  });

  it('serves native clients that send no Origin', async () => {
    await h.agent.get('/health').expect(200);
  });
});

describe('maskPhones', () => {
  it.each([
    ['call 9876543210 now', 'call ******10 now'],
    ['+91 9876543210', '******10'],
    ['919876543210', '******10'],
    ['order 12345', 'order 12345'],
    ['ts 19876543210123', 'ts 19876543210123'],
  ])('%p → %p', (input, expected) => {
    expect(maskPhones(input)).toBe(expected);
  });

  it('masks phone numbers in log messages', () => {
    h.ctx.logger.info('user 9876543210 did something');
    h.ctx.logger.info({ a: 1 }, 'second 9123456780');
    const output = h.logs.join('\n');
    expect(output).not.toContain('9876543210');
    expect(output).not.toContain('9123456780');
  });

  it('redacts sensitive fields in structured logs', () => {
    h.ctx.logger.info({ phone: '9876543210', otp: '123456', refreshToken: 'secret' }, 'x');
    const output = h.logs.join('\n');
    expect(output).not.toContain('123456');
    expect(output).not.toContain('secret');
  });
});
