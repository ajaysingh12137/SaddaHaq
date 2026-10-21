/**
 * Must be imported before anything else in server.ts so Sentry can instrument
 * Express and Mongoose. Does nothing unless SENTRY_DSN is set.
 */
import * as Sentry from '@sentry/node';

import { loadDotEnv, parseEnv } from './config/env';

loadDotEnv();
const env = parseEnv(process.env);

if (env.sentryDsn) {
  Sentry.init({
    dsn: env.sentryDsn,
    environment: env.nodeEnv,
    // Collect no user info, cookies, headers, bodies or query strings.
    dataCollection: {
      userInfo: false,
      cookies: false,
      httpHeaders: false,
      httpBodies: [],
      urlQueryParams: false,
    },
    tracesSampleRate: 0,
    beforeSend(event) {
      // Never ship request bodies, cookies, headers or user identity.
      if (event.request) {
        delete event.request.data;
        delete event.request.cookies;
        delete event.request.headers;
        delete event.request.query_string;
      }
      delete event.user;
      return event;
    },
  });
}
