import mongoose from 'mongoose';
import { type Logger } from 'pino';

import { type Env } from './config/env';

export interface Database {
  uri: string;
  inMemory: boolean;
  disconnect: () => Promise<void>;
}

/**
 * Connects to MONGO_URI, or — outside production only — starts an in-memory
 * MongoDB so `npm run dev` needs no database install. In-memory data is lost on exit.
 */
export async function connectDatabase(env: Env, logger: Logger): Promise<Database> {
  if (env.mongoUri) {
    await mongoose.connect(env.mongoUri);
    await mongoose.connection.syncIndexes();
    logger.info('Connected to MongoDB');
    return { uri: env.mongoUri, inMemory: false, disconnect: () => mongoose.disconnect() };
  }
  if (env.nodeEnv === 'production') {
    throw new Error('MONGO_URI is required in production');
  }

  // devDependency, loaded only in development.
  const { MongoMemoryServer } = await import('mongodb-memory-server');
  const server = await MongoMemoryServer.create();
  const uri = server.getUri('saddahaq');
  await mongoose.connect(uri);
  await mongoose.connection.syncIndexes();
  logger.warn('MONGO_URI not set: using an in-memory MongoDB. Data is lost when the server stops.');
  return {
    uri,
    inMemory: true,
    disconnect: async () => {
      await mongoose.disconnect();
      await server.stop();
    },
  };
}
