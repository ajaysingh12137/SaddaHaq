import { userSchema } from '@saddahaq/shared';

import { ApiClient } from '../api/client';
import { ApiError, errorMessage } from '../api/errors';
import { type StoredTokens } from '../security/secureStore';
import { TOKENS, createFakeServer, makeUser } from '../test-utils/fakeServer';

function setup(initial: StoredTokens | null = TOKENS) {
  const server = createFakeServer();
  let tokens = initial;
  const onAuthLost = jest.fn();
  const client = new ApiClient({
    baseUrl: 'http://api.test',
    tokens: {
      get: async () => tokens,
      set: async next => {
        tokens = next;
      },
    },
    onAuthLost,
    timeoutMs: 1000,
    fetchImpl: server.fetchImpl,
  });
  return { server, client, onAuthLost, tokens: () => tokens };
}

describe('ApiClient', () => {
  it('sends JSON with the bearer token and validates the response', async () => {
    const { server, client } = setup();
    server.on('PATCH /me', body => ({
      body: makeUser({ language: (body as { language: 'en' }).language }),
    }));

    const user = await client.patch('/me', { body: { language: 'en' }, schema: userSchema });
    expect(user.language).toBe('en');

    const [call] = server.calls;
    expect(call?.headers.Authorization).toBe(`Bearer ${TOKENS.accessToken}`);
    expect(call?.headers['Content-Type']).toBe('application/json');
  });

  it('omits the token for public calls', async () => {
    const { server, client } = setup();
    server.on('POST /auth/otp/request', () => ({ status: 202, body: {} }));
    await client.post('/auth/otp/request', { body: { phone: '9876543210' }, auth: false });
    expect(server.calls[0]?.headers.Authorization).toBeUndefined();
  });

  it('turns error bodies into ApiError', async () => {
    const { server, client } = setup();
    server.on('POST /auth/otp/verify', () => ({
      status: 400,
      body: { error: { code: 'otp_invalid', message: 'wrong' } },
    }));
    await expect(client.post('/auth/otp/verify', { auth: false })).rejects.toMatchObject({
      status: 400,
      code: 'otp_invalid',
    });
  });

  it('rejects responses that do not match the schema', async () => {
    const { server, client } = setup();
    server.on('GET /me', () => ({ body: { id: 1 } }));
    await expect(client.get('/me', { schema: userSchema })).rejects.toMatchObject({
      code: 'invalid_response',
    });
  });

  it('handles 204 and 304', async () => {
    const { server, client } = setup();
    server.on('DELETE /me', () => ({ status: 204 }));
    server.on('GET /content', () => ({ status: 304 }));
    await expect(client.delete('/me')).resolves.toBeUndefined();
    await expect(client.get('/content', { allowNotModified: true })).resolves.toBeUndefined();
  });

  it('reports network failures', async () => {
    const { client } = setup();
    const failing = new ApiClient({
      baseUrl: 'http://api.test',
      tokens: { get: async () => null, set: async () => undefined },
      onAuthLost: jest.fn(),
      timeoutMs: 1000,
      fetchImpl: jest.fn().mockRejectedValue(new TypeError('Network request failed')),
    });
    await expect(failing.get('/me')).rejects.toMatchObject({ status: 0, code: 'network' });
    expect(client).toBeDefined();
  });

  it('times out slow requests', async () => {
    jest.useFakeTimers();
    const slow = new ApiClient({
      baseUrl: 'http://api.test',
      tokens: { get: async () => null, set: async () => undefined },
      onAuthLost: jest.fn(),
      timeoutMs: 1000,
      fetchImpl: ((_url: string, init: RequestInit) =>
        new Promise((_resolve, reject) => {
          init.signal?.addEventListener('abort', () => reject(new Error('aborted')));
        })) as unknown as typeof fetch,
    });
    try {
      // Async variant lets the client register its timer after awaiting the token store.
      await Promise.all([
        expect(slow.get('/me')).rejects.toMatchObject({ code: 'timeout' }),
        jest.advanceTimersByTimeAsync(1001),
      ]);
    } finally {
      jest.useRealTimers();
    }
  });

  it('refreshes once on 401 and retries with the new token', async () => {
    const { server, client, tokens } = setup();
    server.on('GET /me', (_body, headers) =>
      headers.Authorization === 'Bearer access-token-2'
        ? { body: makeUser() }
        : { status: 401, body: { error: { code: 'unauthorized' } } },
    );
    server.on('POST /auth/refresh', () => ({
      body: { accessToken: 'access-token-2', refreshToken: 's'.repeat(43) },
    }));

    await expect(client.get('/me', { schema: userSchema })).resolves.toMatchObject({
      phoneLast4: '3210',
    });
    expect(tokens()).toEqual({ accessToken: 'access-token-2', refreshToken: 's'.repeat(43) });
  });

  it('shares one refresh between concurrent requests', async () => {
    const { server, client } = setup();
    server.on('GET /me', (_body, headers) =>
      headers.Authorization === 'Bearer access-token-2'
        ? { body: makeUser() }
        : { status: 401, body: {} },
    );
    server.on('POST /auth/refresh', async () => {
      await new Promise<void>(resolve => setTimeout(() => resolve(), 10));
      return { body: { accessToken: 'access-token-2', refreshToken: 's'.repeat(43) } };
    });

    await Promise.all([client.get('/me'), client.get('/me'), client.get('/me')]);
    expect(server.callsTo('POST /auth/refresh')).toHaveLength(1);
  });

  it('signals a lost session when refresh fails', async () => {
    const { server, client, onAuthLost } = setup();
    server.on('GET /me', () => ({ status: 401, body: { error: { code: 'unauthorized' } } }));
    server.on('POST /auth/refresh', () => ({ status: 401, body: {} }));

    await expect(client.get('/me')).rejects.toMatchObject({ status: 401 });
    expect(onAuthLost).toHaveBeenCalledTimes(1);
  });

  it('signals a lost session when there is no refresh token', async () => {
    const { server, client, onAuthLost } = setup(null);
    server.on('GET /me', () => ({ status: 401, body: {} }));
    await expect(client.get('/me')).rejects.toBeInstanceOf(ApiError);
    expect(onAuthLost).toHaveBeenCalled();
  });
});

describe('errorMessage', () => {
  it.each([
    [new ApiError(0, 'network', ''), { key: 'errors.network' }],
    [new ApiError(400, 'otp_invalid', ''), { key: 'errors.otp_invalid' }],
    [
      new ApiError(429, 'otp_cooldown', '', { retryAfterSec: 42 }),
      { key: 'errors.otp_cooldown', values: { seconds: 42 } },
    ],
    [new ApiError(500, 'internal', ''), { key: 'errors.server' }],
    [new Error('x'), { key: 'errors.server' }],
  ])('%p', (error, expected) => {
    expect(errorMessage(error)).toEqual(expected);
  });
});
