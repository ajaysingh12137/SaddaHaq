import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { detectAmount, detectDate, detectPlatform, parseEarningsText } from '../ocr/parser';

const TODAY = '2026-10-15';

function fixture(name: string): string {
  return readFileSync(join(__dirname, 'fixtures', 'ocr', `${name}.txt`), 'utf8');
}

describe('parseEarningsText — fixtures', () => {
  it.each([
    ['zomato-daily', { platform: 'zomato', date: '2026-10-14', amount: 1245.5 }],
    ['swiggy-weekly', { platform: 'swiggy', date: '2026-10-07', amount: 8430 }],
    ['uber-trip', { platform: 'uber', date: '2026-10-12', amount: 286 }],
    ['rapido-hindi', { platform: 'rapido', date: '2026-10-15', amount: 640 }],
    ['blinkit-no-amount', { platform: 'blinkit', date: '2026-10-14', amount: null }],
    ['instamart-single-amount', { platform: 'swiggy', date: '2026-10-13', amount: 123456.75 }],
    ['ambiguous-amounts', { platform: 'ola', date: '2026-10-14', amount: null }],
    ['garbage', { platform: null, date: null, amount: null }],
  ])('%s', (name, expected) => {
    expect(parseEarningsText(fixture(name), { today: TODAY })).toEqual(expected);
  });

  it('handles Windows line endings', () => {
    const text = fixture('uber-trip').replace(/\n/g, '\r\n');
    expect(parseEarningsText(text, { today: TODAY }).amount).toBe(286);
  });

  it('returns all nulls for empty text', () => {
    expect(parseEarningsText('', { today: TODAY })).toEqual({
      platform: null,
      date: null,
      amount: null,
    });
  });
});

describe('detectPlatform', () => {
  it('requires whole-word matches for Latin keywords', () => {
    expect(detectPlatform('zomatoes are tasty')).toBeNull();
    expect(detectPlatform('Olaf went online')).toBeNull();
    expect(detectPlatform('Paid via Ola')).toBe('ola');
    expect(detectPlatform('URBAN COMPANY partner')).toBe('urban_company');
  });

  it('matches Devanagari keywords as substrings', () => {
    expect(detectPlatform('स्विगी पार्टनर')).toBe('swiggy');
  });

  it('prefers the most frequently mentioned platform', () => {
    expect(detectPlatform('zomato\nswiggy\nswiggy instamart')).toBe('swiggy');
  });

  it('breaks a count tie by earliest mention', () => {
    expect(detectPlatform('Zepto then Uber')).toBe('zepto');
    expect(detectPlatform('Uber then Zepto')).toBe('uber');
  });
});

describe('detectAmount', () => {
  it.each([
    ['₹500', 500],
    ['₹ 1,00,000', 100000],
    ['Rs.500', 500],
    ['Rs 1,234.5', 1234.5],
    ['INR500', 500],
    ['total: rs. 75.25', 75.25],
  ])('reads %p', (text, expected) => {
    expect(detectAmount(text)).toBe(expected);
  });

  it('does not read "hours"/"HOURS" as rupees', () => {
    expect(detectAmount('Online 9 hours 5')).toBeNull();
    expect(detectAmount('ONLINE HOURS 5')).toBeNull();
  });

  it('prefers a stronger keyword even if it is further away', () => {
    const text = ['Payout ₹100', 'Total earnings', '₹900'].join('\n');
    expect(detectAmount(text)).toBe(900);
  });

  it('prefers the same line over a label above at equal strength', () => {
    const text = ['Earnings', '₹100', '₹200 earnings'].join('\n');
    expect(detectAmount(text)).toBe(200);
  });

  it('keeps the first candidate when a later one is equally strong and further', () => {
    const text = ['₹300 earnings', 'Earnings', '₹400'].join('\n');
    expect(detectAmount(text)).toBe(300);
  });

  it('reads a label below the value', () => {
    expect(detectAmount('₹450\nTotal earnings\nOrders 5\n₹30')).toBe(450);
  });

  it('prefers a label above over the same label below when ambiguous', () => {
    expect(detectAmount('₹450\nTotal\n₹30')).toBe(30);
  });

  it('accepts repeated identical amounts without a keyword', () => {
    expect(detectAmount('₹250\nPaid ₹250')).toBe(250);
  });

  it('gives up on several different amounts without a keyword', () => {
    expect(detectAmount('₹250\n₹30')).toBeNull();
  });
});

describe('detectDate', () => {
  it.each([
    ['Today', TODAY],
    ['TODAY 9:41', TODAY],
    ['yesterday', '2026-10-14'],
    ['आज', TODAY],
    ['14/10/2026', '2026-10-14'],
    ['14-10-26', '2026-10-14'],
    ['01.04.2026', '2026-04-01'],
    ['2026-10-13', '2026-10-13'],
    ['14 Oct', '2026-10-14'],
    ['14th October 2026', '2026-10-14'],
    ['14 Oct, 2025', '2025-10-14'],
    ['Oct 14', '2026-10-14'],
    ['Sept 3rd, 2026', '2026-09-03'],
    ['15 Oct', '2026-10-15'],
  ])('reads %p', (text, expected) => {
    expect(detectDate(text, TODAY)).toBe(expected);
  });

  it('puts a year-less date that would be in the future into last year', () => {
    expect(detectDate('20 Dec', TODAY)).toBe('2025-12-20');
  });

  it('resolves a year-less 29 Feb only when a recent leap year exists', () => {
    expect(detectDate('29 Feb', TODAY)).toBeNull();
    expect(detectDate('29 Feb', '2028-03-01')).toBe('2028-02-29');
    expect(detectDate('29 Feb', '2029-01-10')).toBe('2028-02-29');
  });

  it('skips impossible dates and uses the next readable one', () => {
    expect(detectDate('31/02/2026 then 01/03/2026', TODAY)).toBe('2026-03-01');
    expect(detectDate('2026-13-01', TODAY)).toBeNull();
  });

  it('prefers an explicit date over "Today" in a heading', () => {
    expect(detectDate("Today's earnings\nMon, 14 Oct", TODAY)).toBe('2026-10-14');
  });

  it('falls back to "Yesterday" when there is no explicit date', () => {
    expect(detectDate('Yesterday\nv4.8.2', TODAY)).toBe('2026-10-14');
  });

  it('uses the earliest date in the text', () => {
    expect(detectDate('Oct 12, 2026\nPrinted 15/10/2026', TODAY)).toBe('2026-10-12');
  });

  it('ignores version numbers and times', () => {
    expect(detectDate('v4.8.2 at 10:30', TODAY)).toBeNull();
  });
});
