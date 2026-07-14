import type { RecurrencePattern } from '@/lib/db';
import { addSingaporeCalendar } from '@/lib/timezone';

/**
 * Computes the next due date for a recurring todo. Monthly/yearly clamp
 * day-of-month overflow to the last valid day of the target month
 * (e.g. Jan 31 monthly -> Feb 28/29, Feb 29 yearly -> Feb 28 on non-leap years).
 */
export function calculateNextDueDate(
  currentDueDate: string,
  pattern: RecurrencePattern
): string {
  switch (pattern) {
    case 'daily':
      return addSingaporeCalendar(currentDueDate, 1, 'day');
    case 'weekly':
      return addSingaporeCalendar(currentDueDate, 7, 'day');
    case 'monthly':
      return addSingaporeCalendar(currentDueDate, 1, 'month');
    case 'yearly':
      return addSingaporeCalendar(currentDueDate, 1, 'year');
  }
}
