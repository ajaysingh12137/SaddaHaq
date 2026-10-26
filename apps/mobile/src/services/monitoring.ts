/**
 * Crash reporting with Sentry, privacy first:
 * - Off unless a DSN is configured AND the worker turned on "Share anonymous
 *   usage data". It follows that consent live (on → start, off → stop).
 * - No user, request, screenshot or view-hierarchy data; no console breadcrumbs;
 *   URLs lose their query strings; anything that looks like a phone number is masked.
 */
import * as Sentry from '@sentry/react-native';

import { APP_VERSION } from '../config/version';
import { config } from '../config/env';
import { useSession } from '../state/sessionStore';

/** Indian mobile numbers, with or without +91 / 0 and spaces. */
const PHONE_RE = /(?:\+?91[\s-]?|\b0)?[6-9]\d{4}[\s-]?\d{5}\b/g;

export function scrubText(text: string): string {
  return text.replace(PHONE_RE, '[phone]');
}

function stripQuery(url: unknown): unknown {
  return typeof url === 'string' ? url.split('?')[0] : url;
}

export const beforeSend: NonNullable<Sentry.ReactNativeOptions['beforeSend']> = event => {
  delete event.user;
  delete event.request;
  delete event.extra;
  if (event.message) {
    event.message = scrubText(event.message);
  }
  for (const value of event.exception?.values ?? []) {
    if (value.value) {
      value.value = scrubText(value.value);
    }
  }
  return event;
};

export const beforeBreadcrumb: NonNullable<
  Sentry.ReactNativeOptions['beforeBreadcrumb']
> = crumb => {
  if (crumb.category === 'console') {
    return null;
  }
  if (crumb.data && 'url' in crumb.data) {
    crumb.data = { ...crumb.data, url: stripQuery(crumb.data.url) };
  }
  if (crumb.message) {
    crumb.message = scrubText(crumb.message);
  }
  return crumb;
};

let active = false;

export function isCrashReportingActive(): boolean {
  return active;
}

export function setCrashReporting(enabled: boolean): void {
  if (!config.sentryDsn || enabled === active) {
    return;
  }
  if (enabled) {
    Sentry.init({
      dsn: config.sentryDsn,
      release: `saddahaq@${APP_VERSION}`,
      environment: __DEV__ ? 'development' : 'production',
      sendDefaultPii: false,
      attachScreenshot: false,
      attachViewHierarchy: false,
      // Crash-free session rate is a beta metric; no performance tracing.
      enableAutoSessionTracking: true,
      tracesSampleRate: 0,
      maxBreadcrumbs: 30,
      beforeSend,
      beforeBreadcrumb,
    });
  } else {
    void Sentry.close();
  }
  active = enabled;
}

/** Keeps crash reporting in step with the analytics consent. Call once at startup. */
export function startCrashReporting(): () => void {
  const apply = () => setCrashReporting(useSession.getState().user?.consents.analytics === true);
  apply();
  return useSession.subscribe(apply);
}
