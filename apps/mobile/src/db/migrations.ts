/**
 * Schema migrations, applied in order and tracked with PRAGMA user_version.
 * Never edit a shipped migration — add a new one.
 */
export const MIGRATIONS: readonly string[] = [
  // 1: key-value settings and day logs
  `
  CREATE TABLE IF NOT EXISTS kv (
    key TEXT PRIMARY KEY NOT NULL,
    value TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS day_logs (
    id TEXT PRIMARY KEY NOT NULL,
    date TEXT NOT NULL,
    platform TEXT NOT NULL,
    source TEXT NOT NULL CHECK (source IN ('tap', 'ocr')),
    amount REAL,
    updated_at TEXT NOT NULL,
    deleted_at TEXT,
    synced INTEGER NOT NULL DEFAULT 0
  );
  CREATE UNIQUE INDEX IF NOT EXISTS day_logs_date_platform ON day_logs (date, platform);
  CREATE INDEX IF NOT EXISTS day_logs_unsynced ON day_logs (synced) WHERE synced = 0;
  `,
];
