import pino from 'pino';

import { parseEnv } from '../config/env';
import { createOtpProvider } from '../modules/auth/otp';
import { Msg91OtpProvider } from '../modules/auth/otp/msg91';
import { OtpDeliveryError } from '../modules/auth/otp/provider';

const SECRET = 'a'.repeat(40);

describe('parseEnv', () => {
  it('uses development defaults', () => {
    const env = parseEnv({});
    expect(env).toMatchObject({
      nodeEnv: 'development',
      port: 4000,
      otpProvider: 'console',
      mongoUri: undefined,
      corsOrigins: [],
      sentryDsn: undefined,
    });
    expect(env.jwtAccessSecret.length).toBeGreaterThanOrEqual(32);
  });

  it('requires secrets, a database and a real OTP provider in production', () => {
    expect(() => parseEnv({ NODE_ENV: 'production' })).toThrow(
      /MONGO_URI[\s\S]*JWT_ACCESS_SECRET[\s\S]*PHONE_HASH_SECRET[\s\S]*console OTP provider/,
    );
  });

  it('accepts a complete production config', () => {
    const env = parseEnv({
      NODE_ENV: 'production',
      MONGO_URI: 'mongodb://db/saddahaq',
      JWT_ACCESS_SECRET: SECRET,
      PHONE_HASH_SECRET: SECRET,
      OTP_PROVIDER: 'msg91',
      MSG91_AUTH_KEY: 'key',
      MSG91_TEMPLATE_ID: 'tpl',
      CORS_ORIGINS: 'https://a.example, https://b.example',
      SENTRY_DSN: 'https://public@sentry.example/1',
    });
    expect(env.msg91).toEqual({ authKey: 'key', templateId: 'tpl', otpVar: 'otp' });
    expect(env.corsOrigins).toEqual(['https://a.example', 'https://b.example']);
    expect(env.sentryDsn).toBe('https://public@sentry.example/1');
  });

  it('requires MSG91 credentials when that provider is chosen', () => {
    expect(() => parseEnv({ OTP_PROVIDER: 'msg91' })).toThrow(/MSG91_AUTH_KEY/);
  });

  it('rejects short secrets', () => {
    expect(() => parseEnv({ JWT_ACCESS_SECRET: 'short' })).toThrow(/JWT_ACCESS_SECRET/);
  });

  it('can switch Sentry off while keeping the DSN configured', () => {
    expect(
      parseEnv({ SENTRY_DSN: 'https://x@y/1', SENTRY_ENABLED: 'false' }).sentryDsn,
    ).toBeUndefined();
  });
});

describe('createOtpProvider', () => {
  const logger = pino({ level: 'silent' });

  it('uses the console provider by default', () => {
    expect(createOtpProvider(parseEnv({}), logger).name).toBe('console');
  });

  it('uses MSG91 when configured', () => {
    const env = parseEnv({ OTP_PROVIDER: 'msg91', MSG91_AUTH_KEY: 'k', MSG91_TEMPLATE_ID: 't' });
    expect(createOtpProvider(env, logger).name).toBe('msg91');
  });

  it('console provider logs only the last 4 digits of the number', async () => {
    const lines: string[] = [];
    const captured = pino({ level: 'info' }, { write: (l: string) => lines.push(l) });
    await createOtpProvider(parseEnv({}), captured).send('9876543210', '123456');
    const output = lines.join('');
    expect(output).toContain('3210');
    expect(output).not.toContain('9876543210');
  });
});

describe('Msg91OtpProvider', () => {
  const config = { authKey: 'auth-key', templateId: 'template-1', otpVar: 'otp' };

  it('posts the OTP to the Flow API', async () => {
    const fetchMock = jest.fn().mockResolvedValue(new Response('{}', { status: 200 }));
    await new Msg91OtpProvider(config, fetchMock).send('9876543210', '123456');

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('https://control.msg91.com/api/v5/flow/');
    expect(init.method).toBe('POST');
    expect((init.headers as Record<string, string>).authkey).toBe('auth-key');
    expect(JSON.parse(init.body as string)).toEqual({
      template_id: 'template-1',
      short_url: '0',
      recipients: [{ mobiles: '919876543210', otp: '123456' }],
    });
  });

  it('fails on a non-2xx response', async () => {
    const fetchMock = jest.fn().mockResolvedValue(new Response('nope', { status: 401 }));
    await expect(new Msg91OtpProvider(config, fetchMock).send('9876543210', '1')).rejects.toThrow(
      OtpDeliveryError,
    );
  });

  it('fails on a network error', async () => {
    const fetchMock = jest.fn().mockRejectedValue(new TypeError('network down'));
    await expect(new Msg91OtpProvider(config, fetchMock).send('9876543210', '1')).rejects.toThrow(
      OtpDeliveryError,
    );
  });
});
