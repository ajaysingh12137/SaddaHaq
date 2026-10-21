/**
 * Server content (e-Shram steps, schemes, app config) for offline use.
 *
 * Order of preference: the last copy fetched from /content (kept in the
 * encrypted database), else the placeholder content bundled with the app. The
 * server always sends the whole set, so a refresh replaces the cache outright.
 */
import { useQuery } from '@tanstack/react-query';

import {
  type AppConfig,
  type ContentResponse,
  type EshramStep,
  SEED_APP_CONFIG,
  SEED_ESHRAM_STEPS,
  SEED_SCHEMES,
  type Scheme,
  contentResponseSchema,
  isoDateTimeSchema,
} from '@saddahaq/shared';

import { kvGet, kvSet } from '../db/kv';
import { setSession } from '../state/sessionStore';
import { api } from './api';

export interface Content {
  schemes: Scheme[];
  eshramSteps: EshramStep[];
  appConfig: AppConfig;
  /** Server timestamp of this copy; null for the bundled fallback. */
  updatedAt: string | null;
}

const CACHE_KEY = 'content.cache';

/** A cache written by an older app version may not match today's shape. */
const cachedContentSchema = contentResponseSchema.extend({
  updatedAt: isoDateTimeSchema.nullable(),
});

export const BUNDLED_CONTENT: Content = {
  schemes: SEED_SCHEMES,
  eshramSteps: SEED_ESHRAM_STEPS,
  appConfig: SEED_APP_CONFIG,
  updatedAt: null,
};

let current: Content = BUNDLED_CONTENT;

export function currentContent(): Content {
  return current;
}

function apply(content: Content): void {
  current = content;
  const { singleThreshold, multiThreshold, fyStartMonth } = content.appConfig;
  setSession({ eligibilityConfig: { singleThreshold, multiThreshold, fyStartMonth } });
}

/** Startup: use the cached copy (or the bundled one) straight away, offline or not. */
export async function loadCachedContent(): Promise<Content> {
  const parsed = cachedContentSchema.safeParse(await kvGet<unknown>(CACHE_KEY));
  apply(parsed.success ? parsed.data : BUNDLED_CONTENT);
  return current;
}

/**
 * Fetches newer content if there is any. Network errors propagate to the
 * caller (TanStack Query), which keeps showing the current copy.
 */
export async function refreshContent(): Promise<Content> {
  const fresh: ContentResponse | undefined = await api().getContent(current.updatedAt);
  if (fresh) {
    const content: Content = {
      schemes: [...fresh.schemes].sort((a, b) => a.order - b.order),
      eshramSteps: [...fresh.eshramSteps].sort((a, b) => a.order - b.order),
      appConfig: fresh.appConfig,
      updatedAt: fresh.updatedAt,
    };
    await kvSet(CACHE_KEY, content);
    apply(content);
  }
  return current;
}

export const CONTENT_QUERY_KEY = ['content'] as const;

/**
 * Content for screens. Shows the local copy immediately and refreshes from the
 * server in the background when online (on mount and when the app returns).
 */
export function useContent(): Content {
  const { data } = useQuery({
    queryKey: CONTENT_QUERY_KEY,
    queryFn: refreshContent,
    initialData: currentContent,
    // Treat the local copy as stale so the first screen to mount triggers a refresh.
    initialDataUpdatedAt: 0,
    staleTime: 60 * 60_000,
  });
  return data;
}

/** Semantic-version compare of "x.y.z" strings; negative when a < b. */
export function compareVersions(a: string, b: string): number {
  const pa = a.split('.').map(Number);
  const pb = b.split('.').map(Number);
  for (let i = 0; i < 3; i++) {
    const diff = (pa[i] ?? 0) - (pb[i] ?? 0);
    if (diff !== 0) {
      return diff;
    }
  }
  return 0;
}
