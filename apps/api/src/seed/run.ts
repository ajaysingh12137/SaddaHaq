/** `npm run seed` — writes seed content and app config into MONGO_URI. */
import mongoose from 'mongoose';

import { loadDotEnv, parseEnv } from '../config/env';
import { createLogger } from '../lib/logger';
import { seedContent } from './seed';

async function main(): Promise<void> {
  loadDotEnv();
  const env = parseEnv(process.env);
  const logger = createLogger(env.logLevel, env.nodeEnv === 'development');

  if (!env.mongoUri) {
    logger.error(
      'MONGO_URI is not set. With no MONGO_URI, `npm run dev` seeds its in-memory database automatically.',
    );
    process.exitCode = 1;
    return;
  }

  await mongoose.connect(env.mongoUri);
  try {
    await mongoose.connection.syncIndexes();
    const summary = await seedContent(new Date());
    logger.info(summary, 'Seed complete (placeholder content — verify before launch)');
  } finally {
    await mongoose.disconnect();
  }
}

main().catch(error => {
  process.stderr.write(`Seed failed: ${error instanceof Error ? error.message : String(error)}\n`);
  process.exit(1);
});
