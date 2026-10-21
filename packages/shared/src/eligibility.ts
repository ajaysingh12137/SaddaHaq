/**
 * Eligibility meter logic, shared by the app and the API.
 *
 * Rule (as given in the product brief; thresholds come from appConfig):
 *   - one platform: at least `singleThreshold` (90) distinct days in the FY, or
 *   - all platforms: at least `multiThreshold` (120) platform-days in the FY,
 *     where working 3 platforms on one date counts as 3.
 *
 * This only estimates from the worker's own records. The UI must say
 * "likely eligible by your records" — never that the worker IS eligible.
 */

import {
  type FinancialYear,
  type ISODate,
  daysRemainingInFinancialYear,
  financialYear,
  financialYearOf,
  isInFinancialYear,
} from './fy';

export interface EligibilityConfig {
  singleThreshold: number;
  multiThreshold: number;
  /** Month (1–12) the financial year starts in; 4 = April. */
  fyStartMonth: number;
}

export const DEFAULT_ELIGIBILITY_CONFIG: Readonly<EligibilityConfig> = {
  singleThreshold: 90,
  multiThreshold: 120,
  fyStartMonth: 4,
};

/** The minimum a log needs for counting; DayLog satisfies this. */
export interface EligibilityLog {
  date: string;
  platform: string;
  deletedAt?: string | null;
}

export interface PathProgress {
  days: number;
  target: number;
  /** Days still needed; 0 once met. */
  remaining: number;
  /** days / target, clamped to 0–1 for drawing the ring. */
  progress: number;
  met: boolean;
}

export type EligibilityPath = 'single' | 'multi';

export type EligibilityStatus = 'no_logs' | 'in_progress' | 'likely_eligible' | 'fy_ended';

export interface EligibilityResult {
  fy: FinancialYear;
  /** Distinct dates logged per platform. */
  perPlatform: Record<string, number>;
  /** Sum of perPlatform (3 platforms on one date = 3). */
  combined: number;
  /** Best single platform, or null with no logs. */
  single: PathProgress & { platform: string | null };
  multi: PathProgress;
  likelyEligible: boolean;
  /** The path closer to its target, shown on the main ring. */
  primaryPath: EligibilityPath;
  /** Days left in the FY including today; 0 for past years. */
  daysLeftInFy: number;
  status: EligibilityStatus;
}

export interface ComputeEligibilityOptions {
  /** The worker's local calendar date. */
  today: ISODate;
  /** FY to evaluate, by start year. Defaults to the FY containing `today`. */
  fyStartYear?: number;
}

function assertPositiveInteger(name: string, value: number): void {
  if (!Number.isInteger(value) || value <= 0) {
    throw new RangeError(`${name} must be a positive integer, got ${value}`);
  }
}

function pathProgress(days: number, target: number): PathProgress {
  return {
    days,
    target,
    remaining: Math.max(0, target - days),
    progress: Math.min(1, days / target),
    met: days >= target,
  };
}

/**
 * "Closer to its target" = fewer days still needed. If equal, the higher raw
 * ratio wins (matters once both are met). Still tied: prefer the multi path
 * for workers on several platforms, otherwise the single path.
 */
function choosePrimaryPath(
  single: PathProgress,
  multi: PathProgress,
  platformsLogged: number,
): EligibilityPath {
  if (single.remaining !== multi.remaining) {
    return single.remaining < multi.remaining ? 'single' : 'multi';
  }
  const singleRatio = single.days / single.target;
  const multiRatio = multi.days / multi.target;
  if (singleRatio !== multiRatio) {
    return singleRatio > multiRatio ? 'single' : 'multi';
  }
  return platformsLogged > 1 ? 'multi' : 'single';
}

export function computeEligibility(
  logs: readonly EligibilityLog[],
  config: EligibilityConfig,
  options: ComputeEligibilityOptions,
): EligibilityResult {
  assertPositiveInteger('singleThreshold', config.singleThreshold);
  assertPositiveInteger('multiThreshold', config.multiThreshold);

  const fy =
    options.fyStartYear === undefined
      ? financialYearOf(options.today, config.fyStartMonth)
      : financialYear(options.fyStartYear, config.fyStartMonth);

  const datesByPlatform = new Map<string, Set<string>>();
  for (const log of logs) {
    if (log.deletedAt || !isInFinancialYear(log.date, fy)) {
      continue;
    }
    let dates = datesByPlatform.get(log.platform);
    if (!dates) {
      dates = new Set();
      datesByPlatform.set(log.platform, dates);
    }
    dates.add(log.date);
  }

  const perPlatform: Record<string, number> = {};
  let combined = 0;
  let bestPlatform: string | null = null;
  let bestDays = 0;
  for (const [platform, dates] of datesByPlatform) {
    perPlatform[platform] = dates.size;
    combined += dates.size;
    // Ties go to the alphabetically first id so the result is deterministic.
    if (
      bestPlatform === null ||
      dates.size > bestDays ||
      (dates.size === bestDays && platform < bestPlatform)
    ) {
      bestDays = dates.size;
      bestPlatform = platform;
    }
  }

  const single = { ...pathProgress(bestDays, config.singleThreshold), platform: bestPlatform };
  const multi = pathProgress(combined, config.multiThreshold);
  const likelyEligible = single.met || multi.met;
  const daysLeftInFy = daysRemainingInFinancialYear(options.today, fy);

  let status: EligibilityStatus;
  if (likelyEligible) {
    status = 'likely_eligible';
  } else if (options.today > fy.end) {
    status = 'fy_ended';
  } else if (combined === 0) {
    status = 'no_logs';
  } else {
    status = 'in_progress';
  }

  return {
    fy,
    perPlatform,
    combined,
    single,
    multi,
    likelyEligible,
    primaryPath: choosePrimaryPath(single, multi, datesByPlatform.size),
    daysLeftInFy,
    status,
  };
}
