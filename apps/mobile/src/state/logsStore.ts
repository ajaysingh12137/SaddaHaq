import { create } from 'zustand';

import { type ISODate, PLATFORM_IDS, type PlatformId } from '@saddahaq/shared';

import {
  type ScreenshotLogInput,
  type StoredDayLog,
  listLiveLogs,
  saveScreenshotLog,
  setPlatformsForDate,
} from '../db/dayLogs';
import { requestSync } from '../services/sync';

/**
 * Live day logs held in memory for the calendar and the eligibility meter.
 * A worker logs at most a few rows a day, so years of history stay small.
 * Writes go to the database first, then the store reloads from it and a
 * background sync is requested (it does nothing unless backup is on).
 */
export interface LogsState {
  logs: StoredDayLog[];
  loaded: boolean;
}

export const useLogs = create<LogsState>()(() => ({ logs: [], loaded: false }));

export const resetLogsStore = () => useLogs.setState({ logs: [], loaded: false });

export async function loadLogs(): Promise<void> {
  useLogs.setState({ logs: await listLiveLogs(), loaded: true });
}

export async function logDay(date: ISODate, platforms: readonly PlatformId[]): Promise<void> {
  await setPlatformsForDate(date, platforms);
  await loadLogs();
  requestSync();
}

export async function logFromScreenshot(input: ScreenshotLogInput) {
  const outcome = await saveScreenshotLog(input);
  await loadLogs();
  requestSync();
  return outcome;
}

/** Platforms logged on each date, in the app's standard platform order. */
export function platformsByDate(logs: readonly StoredDayLog[]): Map<ISODate, PlatformId[]> {
  const map = new Map<ISODate, PlatformId[]>();
  for (const log of logs) {
    const list = map.get(log.date);
    if (list) {
      list.push(log.platform);
    } else {
      map.set(log.date, [log.platform]);
    }
  }
  for (const list of map.values()) {
    list.sort((a, b) => PLATFORM_IDS.indexOf(a) - PLATFORM_IDS.indexOf(b));
  }
  return map;
}
