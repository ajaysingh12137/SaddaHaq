import { type User } from '@saddahaq/shared';

type Handler = (
  body: unknown,
  headers: Record<string, string>,
) => { status?: number; body?: unknown } | Promise<{ status?: number; body?: unknown }>;

export interface RecordedCall {
  route: string;
  body: unknown;
  headers: Record<string, string>;
}

/** A tiny in-memory API: register handlers by "METHOD /path", inspect calls. */
export function createFakeServer() {
  const routes = new Map<string, Handler>();
  const calls: RecordedCall[] = [];

  const fetchImpl = jest.fn(async (url: string | URL | Request, init: RequestInit = {}) => {
    const path = new URL(String(url)).pathname;
    const route = `${init.method ?? 'GET'} ${path}`;
    const headers = (init.headers ?? {}) as Record<string, string>;
    const body = typeof init.body === 'string' ? JSON.parse(init.body) : undefined;
    calls.push({ route, body, headers });

    const handler = routes.get(route);
    const result = handler
      ? await handler(body, headers)
      : { status: 404, body: { error: { code: 'not_found', message: 'no route' } } };
    const status = result.status ?? 200;
    const payload = result.body === undefined ? null : JSON.stringify(result.body);
    return new Response(payload, { status, headers: { 'content-type': 'application/json' } });
  });

  return {
    fetchImpl: fetchImpl as unknown as typeof fetch,
    calls,
    on(route: string, handler: Handler) {
      routes.set(route, handler);
    },
    callsTo(route: string) {
      return calls.filter(c => c.route === route);
    },
  };
}

export function makeUser(overrides: Partial<User> = {}): User {
  return {
    id: '6ad0c3a105c7ee71c8ff58f3',
    phoneLast4: '3210',
    language: 'hi',
    platforms: [],
    eshramRegistered: false,
    consents: { backup: false, analytics: false, acceptedAt: null },
    createdAt: '2026-10-15T06:00:00.000Z',
    ...overrides,
  };
}

export const TOKENS = {
  accessToken: 'access-token-1',
  refreshToken: 'r'.repeat(43),
};
