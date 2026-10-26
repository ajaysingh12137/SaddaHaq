import * as Sentry from '@sentry/react-native';

import { makeUser } from '../test-utils/fakeServer';

const mockConfig = { sentryDsn: 'https://key@example.ingest.sentry.io/1' as string | undefined };
jest.mock('../config/env', () => ({
  config: new Proxy({}, { get: (_t, key: string) => mockConfig[key as 'sentryDsn'] }),
}));

const withConsent = (analytics: boolean) =>
  makeUser({ consents: { backup: false, analytics, acceptedAt: '2026-10-15T06:00:00.000Z' } });

let monitoring: typeof import('../services/monitoring');
// Loaded in the same isolated registry as `monitoring`, so both share one store.
let session: typeof import('../state/sessionStore');
const setSession = (patch: Parameters<typeof session.setSession>[0]) => session.setSession(patch);

beforeEach(() => {
  jest.isolateModules(() => {
    monitoring = require('../services/monitoring');
    session = require('../state/sessionStore');
  });
  jest.mocked(Sentry.init).mockClear();
  jest.mocked(Sentry.close).mockClear();
  mockConfig.sentryDsn = 'https://key@example.ingest.sentry.io/1';
  session.resetSessionStore();
});

describe('crash reporting consent', () => {
  it('stays off until the worker turns on anonymous usage data, and follows the switch', () => {
    setSession({ user: withConsent(false) });
    const stop = monitoring.startCrashReporting();
    expect(Sentry.init).not.toHaveBeenCalled();

    setSession({ user: withConsent(true) });
    expect(Sentry.init).toHaveBeenCalledTimes(1);
    expect(monitoring.isCrashReportingActive()).toBe(true);

    setSession({ user: withConsent(false) });
    expect(Sentry.close).toHaveBeenCalledTimes(1);
    expect(monitoring.isCrashReportingActive()).toBe(false);
    stop();
  });

  it('never starts without a DSN', () => {
    mockConfig.sentryDsn = undefined;
    setSession({ user: withConsent(true) });
    monitoring.startCrashReporting()();
    expect(Sentry.init).not.toHaveBeenCalled();
  });

  it('initialises with privacy-preserving options', () => {
    monitoring.setCrashReporting(true);
    expect(Sentry.init).toHaveBeenCalledWith(
      expect.objectContaining({
        sendDefaultPii: false,
        attachScreenshot: false,
        attachViewHierarchy: false,
        tracesSampleRate: 0,
      }),
    );
  });
});

describe('scrubbing', () => {
  it('masks Indian mobile numbers in any form', () => {
    for (const phone of ['9876543210', '+91 98765 43210', '+91-9876543210', '09876543210']) {
      expect(monitoring.scrubText(`failed for ${phone}!`)).toBe('failed for [phone]!');
    }
    expect(monitoring.scrubText('amount 1234 on 2026-10-20')).toBe('amount 1234 on 2026-10-20');
  });

  it('drops user, request and extra data from events', () => {
    const event = monitoring.beforeSend(
      {
        message: 'otp for 9876543210',
        user: { id: 'x' },
        request: { url: 'https://api/x' },
        extra: { body: 'secret' },
        exception: { values: [{ value: 'bad 9876543210' }] },
      } as never,
      {},
    ) as Sentry.ErrorEvent;
    expect(event).toEqual({
      message: 'otp for [phone]',
      exception: { values: [{ value: 'bad [phone]' }] },
    });
  });

  it('drops console breadcrumbs and strips query strings from URLs', () => {
    expect(monitoring.beforeBreadcrumb({ category: 'console', message: 'x' }, {})).toBeNull();
    expect(
      monitoring.beforeBreadcrumb(
        { category: 'fetch', data: { url: 'https://api/content?since=2026', method: 'GET' } },
        {},
      ),
    ).toEqual({ category: 'fetch', data: { url: 'https://api/content', method: 'GET' } });
  });
});
