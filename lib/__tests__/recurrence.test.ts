import { describe, expect, it } from 'vitest';
import { calculateNextDueDate } from '@/lib/recurrence';

describe('calculateNextDueDate', () => {
  it('advances a daily recurrence by 1 day', () => {
    expect(calculateNextDueDate('2026-03-05T09:00:00', 'daily')).toBe('2026-03-06T09:00:00');
  });

  it('advances a weekly recurrence by 7 days', () => {
    expect(calculateNextDueDate('2026-03-05T09:00:00', 'weekly')).toBe('2026-03-12T09:00:00');
  });

  it('advances a monthly recurrence by 1 month, clamping day overflow', () => {
    expect(calculateNextDueDate('2026-01-31T09:00:00', 'monthly')).toBe('2026-02-28T09:00:00');
  });

  it('advances a yearly recurrence by 1 year, clamping Feb 29 on non-leap years', () => {
    expect(calculateNextDueDate('2028-02-29T09:00:00', 'yearly')).toBe('2029-02-28T09:00:00');
  });

  it('advances a daily recurrence across a month boundary', () => {
    expect(calculateNextDueDate('2026-03-31T09:00:00', 'daily')).toBe('2026-04-01T09:00:00');
  });

  it('advances a monthly recurrence across a year boundary', () => {
    expect(calculateNextDueDate('2026-12-15T09:00:00', 'monthly')).toBe('2027-01-15T09:00:00');
  });
});
