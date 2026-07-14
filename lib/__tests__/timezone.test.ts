import { describe, expect, it } from 'vitest';
import {
  addMinutes,
  addSingaporeCalendar,
  formatSingaporeDate,
  getSingaporeDateParts,
  getSingaporeDayOfWeek,
  parseSingaporeDate,
  parseSqliteTimestamp,
  toSingaporeISOString,
} from '@/lib/timezone';

describe('parseSingaporeDate', () => {
  it('parses a naive datetime-local string as Singapore local time (UTC+8)', () => {
    const date = parseSingaporeDate('2026-03-05T09:30');
    // 2026-03-05 09:30 SGT === 2026-03-05 01:30 UTC
    expect(date.toISOString()).toBe('2026-03-05T01:30:00.000Z');
  });

  it('parses a datetime string with seconds', () => {
    const date = parseSingaporeDate('2026-03-05T09:30:45');
    expect(date.toISOString()).toBe('2026-03-05T01:30:45.000Z');
  });

  it('parses a space-separated datetime string', () => {
    const date = parseSingaporeDate('2026-03-05 09:30:00');
    expect(date.toISOString()).toBe('2026-03-05T01:30:00.000Z');
  });

  it('falls back to native Date parsing for a date-only string (no time component)', () => {
    const date = parseSingaporeDate('2026-03-05');
    expect(date.toISOString()).toBe('2026-03-05T00:00:00.000Z');
  });

  it('treats a trailing "Z" as part of the naive local time rather than UTC (regex is not end-anchored)', () => {
    // The leading `\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}` matches regardless of what
    // follows, so a full ISO string with an explicit "Z" offset is still
    // parsed as if it were naive Singapore-local time, ignoring the "Z".
    const date = parseSingaporeDate('2026-03-05T01:30:00.000Z');
    expect(date.toISOString()).toBe('2026-03-04T17:30:00.000Z');
  });
});

describe('toSingaporeISOString', () => {
  it('round-trips with parseSingaporeDate', () => {
    const original = '2026-03-05T09:30:00';
    const date = parseSingaporeDate(original);
    expect(toSingaporeISOString(date)).toBe(original);
  });

  it('handles the midnight boundary correctly', () => {
    // 2026-03-05T00:00 SGT === 2026-03-04T16:00 UTC
    const date = new Date('2026-03-04T16:00:00.000Z');
    expect(toSingaporeISOString(date)).toBe('2026-03-05T00:00:00');
  });

  it('does not emit hour "24" at the SGT day boundary', () => {
    // Exercise the hour === '24' guard: an instant that formats to 24:00 in
    // some ICU implementations must be normalized to the next day's 00:00.
    const date = new Date('2026-03-04T16:00:00.000Z');
    const iso = toSingaporeISOString(date);
    expect(iso.slice(11, 13)).not.toBe('24');
    expect(iso.slice(11, 13)).toBe('00');
  });
});

describe('formatSingaporeDate', () => {
  const instant = new Date('2026-03-05T01:30:00.000Z'); // 2026-03-05T09:30:00 SGT

  it('formats "date" style', () => {
    expect(formatSingaporeDate(instant, 'date')).toBe('2026-03-05');
  });

  it('formats "time" style', () => {
    expect(formatSingaporeDate(instant, 'time')).toBe('09:30');
  });

  it('formats "datetime" style', () => {
    expect(formatSingaporeDate(instant, 'datetime')).toBe('2026-03-05 09:30');
  });

  it('formats "display" style as a human-readable string', () => {
    const display = formatSingaporeDate(instant, 'display');
    expect(display).toContain('2026');
    expect(typeof display).toBe('string');
  });

  it('accepts a stored naive datetime string as input', () => {
    expect(formatSingaporeDate('2026-03-05T09:30:00', 'date')).toBe('2026-03-05');
  });

  it('defaults to "datetime" style when none is given', () => {
    expect(formatSingaporeDate(instant)).toBe('2026-03-05 09:30');
  });
});

describe('getSingaporeDateParts', () => {
  it('extracts year/month/day in Singapore local time', () => {
    const instant = new Date('2026-03-05T01:30:00.000Z'); // 2026-03-05T09:30 SGT
    expect(getSingaporeDateParts(instant)).toEqual({ year: 2026, month: 3, day: 5 });
  });

  it('rolls over to the next SGT day near the UTC boundary', () => {
    const instant = new Date('2026-03-04T16:00:00.000Z'); // 2026-03-05T00:00 SGT
    expect(getSingaporeDateParts(instant)).toEqual({ year: 2026, month: 3, day: 5 });
  });
});

describe('getSingaporeDayOfWeek', () => {
  it('returns 0 for Sunday in Singapore local time', () => {
    // 2026-03-08 is a Sunday; 09:00 SGT is well clear of the UTC date boundary
    const instant = parseSingaporeDate('2026-03-08T09:00:00');
    expect(getSingaporeDayOfWeek(instant)).toBe(0);
  });

  it('returns 6 for Saturday in Singapore local time', () => {
    const instant = parseSingaporeDate('2026-03-07T09:00:00');
    expect(getSingaporeDayOfWeek(instant)).toBe(6);
  });
});

describe('parseSqliteTimestamp', () => {
  it('parses a SQLite datetime(\'now\')-style UTC timestamp', () => {
    const date = parseSqliteTimestamp('2026-03-05 01:30:00');
    expect(date.toISOString()).toBe('2026-03-05T01:30:00.000Z');
  });
});

describe('addMinutes', () => {
  it('adds positive minutes', () => {
    const date = new Date('2026-03-05T01:30:00.000Z');
    expect(addMinutes(date, 90).toISOString()).toBe('2026-03-05T03:00:00.000Z');
  });

  it('subtracts when given negative minutes', () => {
    const date = new Date('2026-03-05T01:30:00.000Z');
    expect(addMinutes(date, -30).toISOString()).toBe('2026-03-05T01:00:00.000Z');
  });
});

describe('addSingaporeCalendar', () => {
  it('adds days, rolling over month boundaries', () => {
    expect(addSingaporeCalendar('2026-03-30T09:00:00', 3, 'day')).toBe('2026-04-02T09:00:00');
  });

  it('adds weeks (7 days)', () => {
    expect(addSingaporeCalendar('2026-03-05T09:00:00', 7, 'day')).toBe('2026-03-12T09:00:00');
  });

  it('adds months, clamping day overflow (Jan 31 -> Feb 28 in a non-leap year)', () => {
    expect(addSingaporeCalendar('2027-01-31T09:00:00', 1, 'month')).toBe('2027-02-28T09:00:00');
  });

  it('adds months, clamping day overflow to Feb 29 in a leap year', () => {
    expect(addSingaporeCalendar('2028-01-31T09:00:00', 1, 'month')).toBe('2028-02-29T09:00:00');
  });

  it('adds months across a year boundary', () => {
    expect(addSingaporeCalendar('2026-12-15T09:00:00', 1, 'month')).toBe('2027-01-15T09:00:00');
  });

  it('adds years, clamping Feb 29 to Feb 28 on a non-leap target year', () => {
    expect(addSingaporeCalendar('2028-02-29T09:00:00', 1, 'year')).toBe('2029-02-28T09:00:00');
  });

  it('adds years without clamping when the day is valid in the target year', () => {
    expect(addSingaporeCalendar('2026-06-15T09:00:00', 1, 'year')).toBe('2027-06-15T09:00:00');
  });

  it('throws on an invalid input string', () => {
    expect(() => addSingaporeCalendar('not-a-date', 1, 'day')).toThrow(
      'Invalid Singapore datetime string: not-a-date'
    );
  });
});
