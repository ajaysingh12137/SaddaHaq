import { API_URL, SENTRY_DSN } from '@env';

/** Build-time configuration from apps/mobile/.env (see .env.example). */
export const config = {
  apiUrl: (API_URL || 'http://10.0.2.2:4000').replace(/\/+$/, ''),
  sentryDsn: SENTRY_DSN || undefined,
  requestTimeoutMs: 15_000,
} as const;
