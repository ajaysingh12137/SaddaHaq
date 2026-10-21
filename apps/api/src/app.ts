import { randomUUID } from 'node:crypto';

import * as Sentry from '@sentry/node';
import cors from 'cors';
import express, { type Express } from 'express';
import helmet from 'helmet';
import mongoose from 'mongoose';
import { pinoHttp } from 'pino-http';

import { type AppContext } from './context';
import { errorHandler, notFoundHandler } from './middleware/errors';
import { createRateLimiters } from './middleware/rate-limit';
import { authRoutes } from './modules/auth/routes';
import { contentRoutes } from './modules/content/routes';
import { syncRoutes } from './modules/sync/routes';
import { userRoutes } from './modules/users/routes';

export const API_VERSION = '0.1.0';

export function createApp(ctx: AppContext): Express {
  const app = express();
  const limiters = createRateLimiters(ctx.rateLimits, ctx.env.phoneHashSecret);

  app.set('trust proxy', ctx.env.trustProxy);
  app.use(helmet());
  app.use(
    cors({
      // Native apps send no Origin header; browsers must be on the allowlist.
      origin: (origin, callback) => {
        callback(null, origin === undefined || ctx.env.corsOrigins.includes(origin));
      },
    }),
  );
  app.use(express.json({ limit: '256kb' }));
  app.use(
    pinoHttp({
      logger: ctx.logger,
      genReqId: req => (req.headers['x-request-id'] as string | undefined) ?? randomUUID(),
      // Only method, path and status: no bodies, no query strings, no headers.
      serializers: {
        req: req => ({ id: req.id, method: req.method, path: String(req.url).split('?')[0] }),
        res: res => ({ statusCode: res.statusCode }),
      },
      autoLogging: { ignore: req => req.url === '/health' },
    }),
  );
  app.use(limiters.general);

  app.get('/health', (_req, res) => {
    const dbUp = mongoose.connection.readyState === 1;
    res.status(dbUp ? 200 : 503).json({
      status: dbUp ? 'ok' : 'degraded',
      db: dbUp ? 'up' : 'down',
      version: API_VERSION,
    });
  });

  app.use('/auth', authRoutes(ctx, limiters));
  app.use('/me', userRoutes(ctx));
  app.use('/content', contentRoutes());
  app.use('/sync', syncRoutes(ctx));

  app.use(notFoundHandler);
  if (ctx.env.sentryDsn) {
    Sentry.setupExpressErrorHandler(app);
  }
  app.use(errorHandler(ctx));

  return app;
}
