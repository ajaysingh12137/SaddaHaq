import { type DB, open } from '@op-engineering/op-sqlite';

import { clearDatabaseKey, getOrCreateDatabaseKey } from '../security/secureStore';
import { MIGRATIONS } from './migrations';

const DB_NAME = 'saddahaq.sqlite';

let instance: DB | null = null;

async function migrate(db: DB): Promise<void> {
  const { rows } = await db.execute('PRAGMA user_version');
  const current = Number(rows[0]?.user_version ?? 0);
  for (let version = current; version < MIGRATIONS.length; version++) {
    await db.transaction(async tx => {
      for (const statement of splitStatements(MIGRATIONS[version] as string)) {
        await tx.execute(statement);
      }
      await tx.execute(`PRAGMA user_version = ${version + 1}`);
    });
  }
}

function splitStatements(sql: string): string[] {
  return sql
    .split(';')
    .map(s => s.trim())
    .filter(Boolean);
}

function openWithKey(key: string): DB {
  const db = open({ name: DB_NAME, encryptionKey: key });
  // SQLCipher only fails on first read when the key is wrong.
  db.executeSync('SELECT count(*) FROM sqlite_master');
  return db;
}

/**
 * Opens the encrypted database, creating and migrating it as needed. If the
 * key no longer matches (e.g. keystore reset) the local copy is unreadable, so
 * it is recreated; synced data can be restored from backup.
 */
export async function openDatabase(): Promise<DB> {
  if (instance) {
    return instance;
  }
  const key = await getOrCreateDatabaseKey();
  let db: DB;
  try {
    db = openWithKey(key);
  } catch {
    try {
      open({ name: DB_NAME, encryptionKey: key }).delete();
    } catch {
      // Nothing to delete.
    }
    await clearDatabaseKey();
    db = openWithKey(await getOrCreateDatabaseKey());
  }
  await migrate(db);
  instance = db;
  return db;
}

export function getDatabase(): DB {
  if (!instance) {
    throw new Error('Database not opened yet; call openDatabase() during startup');
  }
  return instance;
}

/** Deletes the database file and its key (account deletion / wipe this phone). */
export async function destroyDatabase(): Promise<void> {
  const db = instance ?? (await openDatabase());
  db.close();
  db.delete();
  instance = null;
  await clearDatabaseKey();
}

/** Test helper. */
export function __resetDatabaseForTests(): void {
  instance = null;
}
