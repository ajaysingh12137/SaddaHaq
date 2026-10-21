/**
 * Extracts platform, date and amount from on-device OCR text of an earnings
 * screenshot the worker chose. Pure function: no I/O, nothing leaves the device.
 *
 * Every field is best-effort. Anything we cannot read confidently stays null
 * and the worker fills it in on the confirmation sheet.
 */

import { type ISODate, addDays, isValidYMD, parseISODate, toISODate } from '../fy';
import { PLATFORMS, PLATFORM_IDS, type PlatformId } from '../platforms';

export interface ParsedEarnings {
  platform: PlatformId | null;
  date: ISODate | null;
  amount: number | null;
}

export interface ParseEarningsOptions {
  /** Worker's local date; resolves "Today"/"Yesterday" and year-less dates. */
  today: ISODate;
}

export function parseEarningsText(text: string, options: ParseEarningsOptions): ParsedEarnings {
  const normalized = text.replace(/\r\n?/g, '\n');
  return {
    platform: detectPlatform(normalized),
    date: detectDate(normalized, options.today),
    amount: detectAmount(normalized),
  };
}

// ---------------------------------------------------------------------------
// Keyword matching

const LATIN_KEYWORD_RE = /^[a-z0-9 ]+$/;

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Positions where `keyword` occurs in lowercase `haystack`. Latin keywords need word boundaries. */
function keywordPositions(haystack: string, keyword: string): number[] {
  const positions: number[] = [];
  if (LATIN_KEYWORD_RE.test(keyword)) {
    const re = new RegExp(`(^|[^a-z0-9])${escapeRegExp(keyword)}(?=$|[^a-z0-9])`, 'g');
    for (const m of haystack.matchAll(re)) {
      positions.push((m.index as number) + (m[1] as string).length);
    }
  } else {
    let from = haystack.indexOf(keyword);
    while (from !== -1) {
      positions.push(from);
      from = haystack.indexOf(keyword, from + keyword.length);
    }
  }
  return positions;
}

// ---------------------------------------------------------------------------
// Platform

export function detectPlatform(text: string): PlatformId | null {
  const haystack = text.toLowerCase();
  let best: { id: PlatformId; count: number; first: number } | null = null;

  for (const id of PLATFORM_IDS) {
    const positions = PLATFORMS[id].keywords.flatMap(k => keywordPositions(haystack, k));
    if (positions.length === 0) {
      continue;
    }
    const candidate = { id, count: positions.length, first: Math.min(...positions) };
    if (
      best === null ||
      candidate.count > best.count ||
      (candidate.count === best.count && candidate.first < best.first)
    ) {
      best = candidate;
    }
  }
  return best ? best.id : null;
}

// ---------------------------------------------------------------------------
// Amount

/**
 * ₹ symbol, or "Rs"/"Rs."/"INR" not glued to a preceding letter (so "hours 5"
 * is not read as "rs 5"). Number allows Indian grouping, e.g. 1,23,456.50.
 */
const AMOUNT_RE = /(?:₹|(?:^|[^a-z])(?:rs\.?|inr))\s*(\d[\d,]*(?:\.\d{1,2})?)/gi;

/** Lower index = stronger signal that the amount is the day's earnings. */
const AMOUNT_KEYWORDS = [
  'total earnings',
  'net earnings',
  "today's earnings",
  'total payout',
  'earnings',
  'earned',
  'payout',
  'total',
  'कुल कमाई',
  'कमाई',
  'कुल',
] as const;

function amountsInLine(line: string): number[] {
  return Array.from(line.matchAll(AMOUNT_RE), m => Number((m[1] as string).replace(/,/g, '')));
}

function bestKeywordRank(line: string | undefined): number {
  if (line === undefined) {
    return Infinity;
  }
  const lower = line.toLowerCase();
  const rank = AMOUNT_KEYWORDS.findIndex(k => keywordPositions(lower, k).length > 0);
  return rank === -1 ? Infinity : rank;
}

export function detectAmount(text: string): number | null {
  const lines = text.split('\n');
  let best: { value: number; rank: number; distance: number } | null = null;
  const all: number[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i] as string;
    const amounts = amountsInLine(line);
    if (amounts.length === 0) {
      continue;
    }
    all.push(...amounts);
    // A label is usually on the same line, or just above/below the value.
    const neighbours = [
      { rank: bestKeywordRank(line), distance: 0 },
      { rank: bestKeywordRank(lines[i - 1]), distance: 1 },
      { rank: bestKeywordRank(lines[i + 1]), distance: 2 },
    ];
    for (const n of neighbours) {
      if (n.rank === Infinity) {
        continue;
      }
      const value = amounts[0] as number;
      if (
        best === null ||
        n.rank < best.rank ||
        (n.rank === best.rank && n.distance < best.distance)
      ) {
        best = { value, rank: n.rank, distance: n.distance };
      }
    }
  }

  if (best !== null) {
    return best.value;
  }
  const distinct = new Set(all);
  return distinct.size === 1 ? (all[0] as number) : null;
}

// ---------------------------------------------------------------------------
// Date

const MONTHS: Record<string, number> = {
  jan: 1,
  feb: 2,
  mar: 3,
  apr: 4,
  may: 5,
  jun: 6,
  jul: 7,
  aug: 8,
  sep: 9,
  oct: 10,
  nov: 11,
  dec: 12,
};

const MONTH_NAME =
  'jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|june?|july?|aug(?:ust)?|sept?(?:ember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?';

interface DateMatch {
  index: number;
  resolve: (today: ISODate) => ISODate | null;
}

function monthFromName(name: string): number {
  return MONTHS[name.slice(0, 3).toLowerCase()] as number;
}

/** Builds a date; a missing year means the most recent such date on or before today. */
function buildDate(
  day: number,
  month: number,
  year: number | null,
  today: ISODate,
): ISODate | null {
  if (year !== null) {
    return isValidYMD(year, month, day) ? toISODate(year, month, day) : null;
  }
  const thisYear = parseISODate(today).year;
  for (const y of [thisYear, thisYear - 1]) {
    if (isValidYMD(y, month, day)) {
      const candidate = toISODate(y, month, day);
      if (candidate <= today) {
        return candidate;
      }
    }
  }
  return null;
}

function expandYear(token: string | undefined): number | null {
  if (token === undefined) {
    return null;
  }
  const year = Number(token);
  return token.length === 2 ? 2000 + year : year;
}

/** "Today"/"Yesterday" are only a fallback: they often appear in headings like "Today's earnings". */
const RELATIVE_DATE_RE = /\b(today|yesterday)\b|आज/i;

const EXPLICIT_DATE_PATTERNS: ReadonlyArray<{
  re: RegExp;
  toMatch: (m: RegExpMatchArray) => DateMatch['resolve'];
}> = [
  {
    // 2026-10-14
    re: /\b(\d{4})-(\d{1,2})-(\d{1,2})\b/g,
    toMatch: m => today => buildDate(Number(m[3]), Number(m[2]), Number(m[1]), today),
  },
  {
    // 14/10/2026, 14-10-26, 14.10.2026 (day first, as used in India)
    re: /\b(\d{1,2})[/.-](\d{1,2})[/.-](\d{4}|\d{2})\b/g,
    toMatch: m => today => buildDate(Number(m[1]), Number(m[2]), expandYear(m[3]), today),
  },
  {
    // 14 Oct, 14th October 2026, 14 Oct, 2026
    re: new RegExp(
      `\\b(\\d{1,2})(?:st|nd|rd|th)?\\s+(${MONTH_NAME})\\b\\.?(?:,?\\s*(\\d{4})\\b)?`,
      'gi',
    ),
    toMatch: m => today =>
      buildDate(Number(m[1]), monthFromName(m[2] as string), expandYear(m[3]), today),
  },
  {
    // Oct 14, October 14th 2026
    re: new RegExp(
      `\\b(${MONTH_NAME})\\b\\.?\\s+(\\d{1,2})(?:st|nd|rd|th)?\\b(?:,?\\s*(\\d{4})\\b)?`,
      'gi',
    ),
    toMatch: m => today =>
      buildDate(Number(m[2]), monthFromName(m[1] as string), expandYear(m[3]), today),
  },
];

export function detectDate(text: string, today: ISODate): ISODate | null {
  const matches: DateMatch[] = [];
  for (const { re, toMatch } of EXPLICIT_DATE_PATTERNS) {
    for (const m of text.matchAll(re)) {
      matches.push({ index: m.index as number, resolve: toMatch(m) });
    }
  }
  // The first readable explicit date in the screenshot wins.
  matches.sort((a, b) => a.index - b.index);
  for (const match of matches) {
    const date = match.resolve(today);
    if (date !== null) {
      return date;
    }
  }
  const relative = RELATIVE_DATE_RE.exec(text);
  if (relative === null) {
    return null;
  }
  return relative[1]?.toLowerCase() === 'yesterday' ? addDays(today, -1) : today;
}
