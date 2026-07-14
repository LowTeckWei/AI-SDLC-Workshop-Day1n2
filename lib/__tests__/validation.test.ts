import { describe, expect, it } from 'vitest';
import { priorityEnum, recurrencePatternEnum, reminderMinutesEnum } from '@/lib/validation';

describe('priorityEnum', () => {
  it.each(['high', 'medium', 'low'])('accepts "%s"', (value) => {
    expect(priorityEnum.safeParse(value).success).toBe(true);
  });

  it('rejects an unrecognized priority', () => {
    expect(priorityEnum.safeParse('urgent').success).toBe(false);
  });

  it('rejects a non-string value', () => {
    expect(priorityEnum.safeParse(1).success).toBe(false);
  });
});

describe('recurrencePatternEnum', () => {
  it.each(['daily', 'weekly', 'monthly', 'yearly'])('accepts "%s"', (value) => {
    expect(recurrencePatternEnum.safeParse(value).success).toBe(true);
  });

  it('rejects an unrecognized pattern', () => {
    expect(recurrencePatternEnum.safeParse('hourly').success).toBe(false);
  });
});

describe('reminderMinutesEnum', () => {
  it.each([15, 30, 60, 120, 1440, 2880, 10080])('accepts %d', (value) => {
    expect(reminderMinutesEnum.safeParse(value).success).toBe(true);
  });

  it('rejects a value not in the allowed set', () => {
    expect(reminderMinutesEnum.safeParse(45).success).toBe(false);
  });

  it('rejects a string that looks like a valid number', () => {
    expect(reminderMinutesEnum.safeParse('15').success).toBe(false);
  });
});
