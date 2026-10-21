/**
 * op-sqlite stand-in backed by Node's built-in SQLite, so repository tests run
 * real SQL. Encryption is simulated: reopening with a different key fails.
 */
const { DatabaseSync } = require('node:sqlite');

const databases = new Map();

const toBindable = value => (typeof value === 'boolean' ? Number(value) : value);

function run(db, sql, params = []) {
  const trimmed = sql.trim();
  const isMulti = params.length === 0 && trimmed.replace(/;\s*$/, '').includes(';');
  if (isMulti) {
    db.exec(trimmed);
    return { rows: [], rowsAffected: 0 };
  }
  const rows = db.prepare(trimmed).all(...params.map(toBindable));
  const { c } = db.prepare('SELECT changes() AS c').get();
  return { rows, rowsAffected: c, insertId: undefined };
}

function open({ name, encryptionKey }) {
  let entry = databases.get(name);
  if (!entry) {
    entry = { db: new DatabaseSync(':memory:'), key: encryptionKey };
    databases.set(name, entry);
  }
  const { db } = entry;
  // Like SQLCipher, a wrong key only fails on the first read, not on open.
  const guarded = (sql, params) => {
    if (entry.key !== encryptionKey) {
      throw new Error('file is not a database');
    }
    return run(db, sql, params);
  };
  const api = {
    execute: async (sql, params) => guarded(sql, params),
    executeSync: (sql, params) => guarded(sql, params),
    transaction: async fn => {
      db.exec('BEGIN');
      try {
        await fn({ execute: async (sql, params) => run(db, sql, params) });
        db.exec('COMMIT');
      } catch (error) {
        db.exec('ROLLBACK');
        throw error;
      }
    },
    close: () => {},
    delete: () => {
      databases.delete(name);
    },
  };
  return api;
}

module.exports = {
  open,
  __reset: () => databases.clear(),
};
