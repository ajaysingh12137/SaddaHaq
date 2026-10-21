import { getDatabase } from './database';

/** Small JSON key-value store for settings and session state. */
export async function kvGet<T>(key: string): Promise<T | null> {
  const { rows } = await getDatabase().execute('SELECT value FROM kv WHERE key = ?', [key]);
  const raw = rows[0]?.value;
  if (typeof raw !== 'string') {
    return null;
  }
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export async function kvSet<T>(key: string, value: T): Promise<void> {
  await getDatabase().execute(
    'INSERT INTO kv (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value',
    [key, JSON.stringify(value)],
  );
}

export async function kvDelete(key: string): Promise<void> {
  await getDatabase().execute('DELETE FROM kv WHERE key = ?', [key]);
}
