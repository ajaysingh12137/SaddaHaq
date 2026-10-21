import { type ZodType, type z } from 'zod';

import { refreshResponseSchema } from '@saddahaq/shared';

import { type StoredTokens } from '../security/secureStore';
import { ApiError, networkError, timeoutError } from './errors';

export interface TokenStore {
  get: () => Promise<StoredTokens | null>;
  set: (tokens: StoredTokens) => Promise<void>;
}

export interface ApiClientOptions {
  baseUrl: string;
  tokens: TokenStore;
  /** Called when a refresh fails: the session is over. */
  onAuthLost: () => void;
  timeoutMs: number;
  fetchImpl?: typeof fetch;
}

export interface RequestOptions<S extends ZodType | undefined> {
  body?: unknown;
  auth?: boolean;
  /** Validates the JSON response. */
  schema?: S;
  /** Treat 304 as success with `undefined`. */
  allowNotModified?: boolean;
}

type Result<S> = S extends ZodType ? z.output<S> : undefined;

interface ErrorBody {
  error?: { code?: string; message?: string; details?: unknown };
}

export class ApiClient {
  private refreshing: Promise<boolean> | null = null;
  private readonly fetchImpl: typeof fetch;

  constructor(private readonly options: ApiClientOptions) {
    this.fetchImpl = options.fetchImpl ?? fetch;
  }

  get<S extends ZodType | undefined = undefined>(path: string, opts: RequestOptions<S> = {}) {
    return this.request<S>('GET', path, opts);
  }

  post<S extends ZodType | undefined = undefined>(path: string, opts: RequestOptions<S> = {}) {
    return this.request<S>('POST', path, opts);
  }

  patch<S extends ZodType | undefined = undefined>(path: string, opts: RequestOptions<S> = {}) {
    return this.request<S>('PATCH', path, opts);
  }

  delete<S extends ZodType | undefined = undefined>(path: string, opts: RequestOptions<S> = {}) {
    return this.request<S>('DELETE', path, opts);
  }

  async request<S extends ZodType | undefined>(
    method: string,
    path: string,
    opts: RequestOptions<S>,
  ): Promise<Result<S>> {
    const auth = opts.auth ?? true;
    let response = await this.send(method, path, opts.body, auth);

    // One refresh-and-retry on an expired access token.
    if (response.status === 401 && auth) {
      if (await this.refreshTokens()) {
        response = await this.send(method, path, opts.body, auth);
      }
      if (response.status === 401) {
        this.options.onAuthLost();
      }
    }

    if (response.status === 204 || (response.status === 304 && opts.allowNotModified)) {
      return undefined as Result<S>;
    }

    const payload: unknown = await response.json().catch(() => undefined);
    if (!response.ok) {
      const error = (payload as ErrorBody | undefined)?.error;
      throw new ApiError(
        response.status,
        error?.code ?? 'http_error',
        error?.message ?? `HTTP ${response.status}`,
        error?.details,
      );
    }
    if (!opts.schema) {
      return undefined as Result<S>;
    }
    const parsed = opts.schema.safeParse(payload);
    if (!parsed.success) {
      throw new ApiError(response.status, 'invalid_response', 'Unexpected response from server');
    }
    return parsed.data as Result<S>;
  }

  private async send(
    method: string,
    path: string,
    body: unknown,
    auth: boolean,
  ): Promise<Response> {
    const headers: Record<string, string> = { Accept: 'application/json' };
    if (body !== undefined) {
      headers['Content-Type'] = 'application/json';
    }
    if (auth) {
      const tokens = await this.options.tokens.get();
      if (tokens) {
        headers.Authorization = `Bearer ${tokens.accessToken}`;
      }
    }

    const controller = new AbortController();
    let timedOut = false;
    const timer = setTimeout(() => {
      timedOut = true;
      controller.abort();
    }, this.options.timeoutMs);
    try {
      return await this.fetchImpl(`${this.options.baseUrl}${path}`, {
        method,
        headers,
        body: body === undefined ? undefined : JSON.stringify(body),
        signal: controller.signal,
      });
    } catch {
      throw timedOut ? timeoutError() : networkError();
    } finally {
      clearTimeout(timer);
    }
  }

  /** Single-flight: concurrent 401s share one refresh call. */
  private refreshTokens(): Promise<boolean> {
    if (!this.refreshing) {
      this.refreshing = this.doRefresh().finally(() => {
        this.refreshing = null;
      });
    }
    return this.refreshing;
  }

  private async doRefresh(): Promise<boolean> {
    const tokens = await this.options.tokens.get();
    if (!tokens) {
      return false;
    }
    let response: Response;
    try {
      response = await this.send(
        'POST',
        '/auth/refresh',
        { refreshToken: tokens.refreshToken },
        false,
      );
    } catch {
      return false;
    }
    if (!response.ok) {
      return false;
    }
    const parsed = refreshResponseSchema.safeParse(await response.json().catch(() => undefined));
    if (!parsed.success) {
      return false;
    }
    await this.options.tokens.set(parsed.data);
    return true;
  }
}
