import { ApiClient, type TokenStore } from '../api/client';
import { type Endpoints, createEndpoints } from '../api/endpoints';
import { config } from '../config/env';
import { type StoredTokens, loadTokens, saveTokens } from '../security/secureStore';

/** Keeps tokens in memory so each request does not hit the keystore. */
class CachedTokenStore implements TokenStore {
  private cache: StoredTokens | null | undefined;

  async get(): Promise<StoredTokens | null> {
    if (this.cache === undefined) {
      this.cache = await loadTokens();
    }
    return this.cache;
  }

  async set(tokens: StoredTokens): Promise<void> {
    this.cache = tokens;
    await saveTokens(tokens);
  }

  /** Drops the cache; the next read goes to the keystore. */
  forget(): void {
    this.cache = undefined;
  }
}

export const tokenStore = new CachedTokenStore();

let authLostHandler: () => void = () => undefined;

/** Registered by the session service to sign the worker out. */
export function onAuthLost(handler: () => void): void {
  authLostHandler = handler;
}

function build(fetchImpl?: typeof fetch): Endpoints {
  const client = new ApiClient({
    baseUrl: config.apiUrl,
    tokens: tokenStore,
    onAuthLost: () => authLostHandler(),
    timeoutMs: config.requestTimeoutMs,
    fetchImpl,
  });
  return createEndpoints(client);
}

let endpoints: Endpoints | null = null;

export function api(): Endpoints {
  endpoints ??= build();
  return endpoints;
}

/** Test helper: route requests through a fake fetch. */
export function __useFetchForTests(fetchImpl: typeof fetch): void {
  endpoints = build(fetchImpl);
  tokenStore.forget();
}
