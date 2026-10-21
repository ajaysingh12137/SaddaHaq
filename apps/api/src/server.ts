// Keep first: loads .env and initialises Sentry before Express/Mongoose are imported.
import './instrument';

import { createApp } from './app';
import { parseEnv } from './config/env';
import { type AppContext } from './context';
import { connectDatabase } from './db';
import { createLogger } from './lib/logger';
import { DEFAULT_RATE_LIMITS } from './middleware/rate-limit';
import { createOtpProvider } from './modules/auth/otp';
import { purgePendingDeletions } from './modules/users/service';
import { seedContent } from './seed/seed';
import { AppConfigModel } from './models/content';

async function main(): Promise<void> {
  const env = parseEnv(process.env);
  const logger = createLogger(env.logLevel, env.nodeEnv === 'development');
  const ctx: AppContext = {
    env,
    logger,
    otpProvider: createOtpProvider(env, logger),
    rateLimits: DEFAULT_RATE_LIMITS,
    now: () => new Date(),
  };

  const db = await connectDatabase(env, logger);
  await purgePendingDeletions(ctx);

  if (db.inMemory && !(await AppConfigModel.exists({ key: 'default' }))) {
    await seedContent(new Date());
    logger.info('Seeded placeholder content into the in-memory database');
  }

  const server = createApp(ctx).listen(env.port, () => {
    logger.info({ port: env.port, otpProvider: ctx.otpProvider.name }, 'SaddaHaQ API listening');
  });

  const shutdown = (signal: string) => {
    logger.info({ signal }, 'Shutting down');
    server.close(() => {
      void db.disconnect().finally(() => process.exit(0));
    });
  };
  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}

main().catch(error => {
  // Logger may not exist yet (e.g. invalid env), so fall back to stderr.
  process.stderr.write(
    `Failed to start: ${error instanceof Error ? error.message : String(error)}\n`,
  );
  process.exit(1);
});
