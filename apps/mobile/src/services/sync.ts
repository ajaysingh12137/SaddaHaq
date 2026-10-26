/**
 * Optional cloud backup of day logs (only with the worker's backup consent).
 *
 * The phone stays the source of truth: logs are written locally first and this
 * pushes them in the background. Runs on app open, after a log is saved and on
 * reconnect; there is no polling. Failures retry with exponential backoff and
 * never block the UI.
 */
import { MAX_SYNC_BATCH } from '@saddahaq/shared';

import { ApiError } from '../api/errors';
import { applyServerChanges, listUnsynced, markAllUnsynced } from '../db/dayLogs';
import { kvDelete, kvGet, kvSet } from '../db/kv';
import { loadLogs } from '../state/logsStore';
import { useSession } from '../state/sessionStore';
import { api, tokenStore } from './api';
import { flushProfile } from './session';

const SINCE_KEY = 'sync.since';
/** Stop after this many rounds in one run; the next trigger picks up the rest. */
const MAX_ROUNDS = 20;

export const BACKOFF_BASE_MS = 2_000;
export const BACKOFF_MAX_MS = 5 * 60_000;
export const MAX_RETRIES = 6;

export type SyncResult = 'synced' | 'skipped' | 'failed';

let running: Promise<SyncResult> | null = null;
let again = false;
let retryTimer: ReturnType<typeof setTimeout> | null = null;
let retries = 0;

function backupEnabled(): boolean {
  return useSession.getState().user?.consents.backup === true;
}

/** Delay before retry `attempt` (1-based): 2 s, 4 s, 8 s … capped at 5 min. */
export function backoffDelay(attempt: number): number {
  return Math.min(BACKOFF_MAX_MS, BACKOFF_BASE_MS * 2 ** (attempt - 1));
}

async function syncOnce(): Promise<SyncResult> {
  if (!backupEnabled() || !(await tokenStore.get())) {
    return 'skipped';
  }
  // A consent just turned on must reach the server before /sync accepts us.
  await flushProfile();
  if (!backupEnabled()) {
    return 'skipped';
  }

  let changedLocally = false;
  try {
    for (let round = 0; round < MAX_ROUNDS; round++) {
      const changes = await listUnsynced(MAX_SYNC_BATCH);
      const since = await kvGet<string>(SINCE_KEY);
      const response = await api().sync({ changes, since });
      const sent = new Map(changes.map(c => [c.id, c.updatedAt]));
      await applyServerChanges(response.serverChanges, sent);
      await kvSet(SINCE_KEY, response.now);
      changedLocally ||= response.serverChanges.length > 0;
      if (changes.length < MAX_SYNC_BATCH) {
        break;
      }
    }
    return 'synced';
  } finally {
    if (changedLocally) {
      await loadLogs();
    }
  }
}

function scheduleRetry(): void {
  if (retryTimer || retries >= MAX_RETRIES) {
    return;
  }
  retries += 1;
  retryTimer = setTimeout(() => {
    retryTimer = null;
    void syncNow();
  }, backoffDelay(retries));
}

/**
 * Runs a sync now (or joins the one running, then runs once more so changes
 * made meanwhile are not left behind). Never throws.
 */
export function syncNow(): Promise<SyncResult> {
  if (running) {
    again = true;
    return running;
  }
  running = (async () => {
    let result: SyncResult;
    do {
      again = false;
      try {
        result = await syncOnce();
        if (result === 'synced') {
          retries = 0;
        }
      } catch (error) {
        result = 'failed';
        // The server refused backup (consent off there) or the session ended: retrying won't help.
        const permanent =
          error instanceof ApiError && (error.status === 401 || error.status === 403);
        if (!permanent) {
          scheduleRetry();
        }
      }
    } while (again);
    return result;
  })().finally(() => {
    running = null;
  });
  return running;
}

/** Fire-and-forget trigger for UI events. */
export function requestSync(): void {
  void syncNow();
}

/**
 * Starts sync from scratch: everything on this phone is sent again and the
 * full server copy is fetched. Used when backup is turned back on (the server
 * deleted its copy when it was turned off) and when an account signs in.
 */
export async function resetSyncState(): Promise<void> {
  await markAllUnsynced();
  await kvDelete(SINCE_KEY);
}

/** Test helper. */
export function __resetSyncForTests(): void {
  if (retryTimer) {
    clearTimeout(retryTimer);
  }
  retryTimer = null;
  retries = 0;
  running = null;
  again = false;
}
