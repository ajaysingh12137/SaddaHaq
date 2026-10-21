import {
  addDays,
  daysInFinancialYear,
  daysInMonth,
  daysRemainingInFinancialYear,
  diffDays,
  financialYear,
  financialYearOf,
  isInFinancialYear,
  isLeapYear,
  isValidISODate,
  isValidYMD,
  parseISODate,
  toISODate,
  toLocalISODate,
} from '../fy';

describe('isLeapYear', () => {
  it.each([
    [2024, true],
    [2026, false],
    [2027, false],
    [2028, true],
    [1900, false],
    [2000, true],
    [2100, false],
  ])('%i → %s', (year, expected) => {
    expect(isLeapYear(year)).toBe(expected);
  });
});

describe('daysInMonth', () => {
  it('handles February in leap and common years', () => {
    expect(daysInMonth(2028, 2)).toBe(29);
    expect(daysInMonth(2027, 2)).toBe(28);
    expect(daysInMonth(2100, 2)).toBe(28);
  });
  it('handles 30- and 31-day months', () => {
    expect(daysInMonth(2026, 4)).toBe(30);
    expect(daysInMonth(2026, 12)).toBe(31);
  });
});

describe('isValidYMD', () => {
  it('accepts real dates', () => {
    expect(isValidYMD(2028, 2, 29)).toBe(true);
  });
  it.each([
    [2027, 2, 29],
    [2026, 13, 1],
    [2026, 0, 10],
    [2026, 4, 0],
    [2026, 4, 31],
    [2026.5, 4, 1],
    [2026, 4.5, 1],
    [2026, 4, 1.5],
  ])('rejects %p-%p-%p', (y, m, d) => {
    expect(isValidYMD(y, m, d)).toBe(false);
  });
});

describe('isValidISODate / parseISODate / toISODate', () => {
  it('round-trips', () => {
    expect(toISODate(2026, 4, 1)).toBe('2026-04-01');
    expect(parseISODate('2026-04-01')).toEqual({ year: 2026, month: 4, day: 1 });
  });
  it.each(['2026-4-1', '2026-02-30', '14/10/2026', '', '2026-04-01T00:00:00Z'])(
    'rejects %p',
    value => {
      expect(isValidISODate(value)).toBe(false);
      expect(() => parseISODate(value)).toThrow(RangeError);
    },
  );
});

describe('addDays / diffDays', () => {
  it('crosses month, year and leap-day boundaries', () => {
    expect(addDays('2026-03-31', 1)).toBe('2026-04-01');
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
    expect(addDays('2028-02-28', 1)).toBe('2028-02-29');
    expect(addDays('2027-02-28', 1)).toBe('2027-03-01');
    expect(addDays('2026-04-01', -1)).toBe('2026-03-31');
  });
  it('counts whole days in either direction', () => {
    expect(diffDays('2026-04-01', '2027-03-31')).toBe(364);
    expect(diffDays('2027-03-31', '2026-04-01')).toBe(-364);
    expect(diffDays('2026-10-15', '2026-10-15')).toBe(0);
  });
});

describe('toLocalISODate', () => {
  it('uses local calendar fields', () => {
    expect(toLocalISODate(new Date(2026, 9, 5, 23, 59))).toBe('2026-10-05');
  });
});

describe('financialYear', () => {
  it('builds an April–March year with a label', () => {
    expect(financialYear(2026, 4)).toEqual({
      startYear: 2026,
      start: '2026-04-01',
      end: '2027-03-31',
      label: '2026–27',
    });
  });
  it('labels a century rollover with two digits', () => {
    expect(financialYear(2099, 4).label).toBe('2099–00');
  });
  it('supports a calendar-year configuration', () => {
    expect(financialYear(2026, 1)).toEqual({
      startYear: 2026,
      start: '2026-01-01',
      end: '2026-12-31',
      label: '2026',
    });
  });
  it.each([0, 13, 4.5, NaN])('rejects start month %p', month => {
    expect(() => financialYear(2026, month)).toThrow(RangeError);
    expect(() => financialYearOf('2026-10-15', month)).toThrow(RangeError);
  });
});

describe('financialYearOf', () => {
  it.each([
    ['2026-04-01', 2026],
    ['2027-03-31', 2026],
    ['2026-03-31', 2025],
    ['2026-10-15', 2026],
    ['2027-01-01', 2026],
  ])('%s is in FY starting %i', (date, startYear) => {
    expect(financialYearOf(date, 4).startYear).toBe(startYear);
  });
});

describe('isInFinancialYear', () => {
  const fy = financialYear(2026, 4);
  it('includes both boundary days', () => {
    expect(isInFinancialYear('2026-04-01', fy)).toBe(true);
    expect(isInFinancialYear('2027-03-31', fy)).toBe(true);
  });
  it('excludes the days just outside', () => {
    expect(isInFinancialYear('2026-03-31', fy)).toBe(false);
    expect(isInFinancialYear('2027-04-01', fy)).toBe(false);
  });
  it('rejects malformed strings that would otherwise compare inside the range', () => {
    expect(isInFinancialYear('2026-5-1', fy)).toBe(false);
  });
});

describe('daysInFinancialYear', () => {
  it('is 365 normally and 366 when it contains 29 Feb', () => {
    expect(daysInFinancialYear(financialYear(2026, 4))).toBe(365);
    expect(daysInFinancialYear(financialYear(2027, 4))).toBe(366); // includes 2028-02-29
    expect(daysInFinancialYear(financialYear(2028, 4))).toBe(365);
  });
});

describe('daysRemainingInFinancialYear', () => {
  const fy = financialYear(2026, 4);
  it('counts today', () => {
    expect(daysRemainingInFinancialYear('2027-03-31', fy)).toBe(1);
    expect(daysRemainingInFinancialYear('2026-04-01', fy)).toBe(365);
    expect(daysRemainingInFinancialYear('2026-10-15', fy)).toBe(168);
  });
  it('is 0 after the year ends', () => {
    expect(daysRemainingInFinancialYear('2027-04-01', fy)).toBe(0);
  });
  it('is the full length before the year starts', () => {
    expect(daysRemainingInFinancialYear('2026-01-01', fy)).toBe(365);
  });
});
