import { getSingaporeNow, getSingaporeDateParts } from '@/lib/timezone';

export interface CalendarDay {
  date: string; // YYYY-MM-DD (Singapore local)
  day: number;
  month: number; // 1-12
  year: number;
  isCurrentMonth: boolean;
  isToday: boolean;
  isPast: boolean;
  isWeekend: boolean;
}

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

function daysInMonth(year: number, month: number): number {
  // day 0 of next month = last day of `month` (1-indexed)
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

/**
 * Generates a full calendar grid (always complete weeks: 5 or 6 rows) for the
 * given year/month (1-indexed), including leading/trailing adjacent-month
 * days needed to fill the first and last week.
 */
export function generateCalendarGrid(
  year: number,
  month: number,
  now: Date = getSingaporeNow()
): CalendarDay[][] {
  const firstWeekday = new Date(Date.UTC(year, month - 1, 1)).getUTCDay(); // 0=Sun
  const daysInTargetMonth = daysInMonth(year, month);
  const daysInPrevMonth = daysInMonth(year, month - 1 === 0 ? 12 : month - 1);

  const leadingCount = firstWeekday;
  const totalDaysNeeded = leadingCount + daysInTargetMonth;
  const totalWeeks = Math.ceil(totalDaysNeeded / 7);
  const totalCells = totalWeeks * 7;
  const trailingCount = totalCells - totalDaysNeeded;

  const todayParts = getSingaporeDateParts(now);
  const todayStr = `${todayParts.year}-${pad(todayParts.month)}-${pad(todayParts.day)}`;

  function makeDay(y: number, m: number, d: number, isCurrentMonth: boolean): CalendarDay {
    const dateStr = `${y}-${pad(m)}-${pad(d)}`;
    const weekday = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
    return {
      date: dateStr,
      day: d,
      month: m,
      year: y,
      isCurrentMonth,
      isToday: dateStr === todayStr,
      isPast: dateStr < todayStr,
      isWeekend: weekday === 0 || weekday === 6,
    };
  }

  const days: CalendarDay[] = [];

  const prevMonth = month - 1 === 0 ? 12 : month - 1;
  const prevYear = month - 1 === 0 ? year - 1 : year;
  for (let i = 0; i < leadingCount; i++) {
    const day = daysInPrevMonth - leadingCount + 1 + i;
    days.push(makeDay(prevYear, prevMonth, day, false));
  }

  for (let day = 1; day <= daysInTargetMonth; day++) {
    days.push(makeDay(year, month, day, true));
  }

  const nextMonth = month + 1 === 13 ? 1 : month + 1;
  const nextYear = month + 1 === 13 ? year + 1 : year;
  for (let day = 1; day <= trailingCount; day++) {
    days.push(makeDay(nextYear, nextMonth, day, false));
  }

  const weeks: CalendarDay[][] = [];
  for (let i = 0; i < days.length; i += 7) {
    weeks.push(days.slice(i, i + 7));
  }
  return weeks;
}

/** Parses a `?month=YYYY-MM` URL param, falling back to the current Singapore month if invalid. */
export function parseMonthParam(
  param: string | null,
  now: Date = getSingaporeNow()
): { year: number; month: number } {
  const fallback = getSingaporeDateParts(now);
  if (!param) return { year: fallback.year, month: fallback.month };

  const match = param.match(/^(\d{4})-(\d{2})$/);
  if (!match) return { year: fallback.year, month: fallback.month };

  const year = Number(match[1]);
  const month = Number(match[2]);
  if (month < 1 || month > 12) return { year: fallback.year, month: fallback.month };

  return { year, month };
}
