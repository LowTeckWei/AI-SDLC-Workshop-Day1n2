export const SINGAPORE_TIMEZONE = 'Asia/Singapore';

const SINGAPORE_OFFSET_MS = 8 * 60 * 60 * 1000; // UTC+8, no DST

/**
 * The current instant. Centralizes all "now" creation so call sites never
 * call `new Date()` directly, per project convention.
 */
export function getSingaporeNow(): Date {
  return new Date();
}

/**
 * Parses a naive Singapore-local datetime string (no UTC offset, e.g. from a
 * <input type="datetime-local"> or a stored due_date) into the Date
 * representing the correct UTC instant.
 */
export function parseSingaporeDate(input: string): Date {
  const match = input.match(
    /^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})(?::(\d{2}))?/
  );
  if (!match) return new Date(input);
  const [, y, mo, d, h, mi, s] = match;
  const utcMs =
    Date.UTC(
      Number(y),
      Number(mo) - 1,
      Number(d),
      Number(h),
      Number(mi),
      Number(s ?? '0')
    ) - SINGAPORE_OFFSET_MS;
  return new Date(utcMs);
}

/**
 * Formats a Date as a naive Singapore-local ISO datetime string
 * (YYYY-MM-DDTHH:mm:ss), suitable for storage in due_date columns.
 */
export function toSingaporeISOString(date: Date): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: SINGAPORE_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).formatToParts(date);
  const get = (type: string) => parts.find((p) => p.type === type)!.value;
  const hour = get('hour') === '24' ? '00' : get('hour');
  return `${get('year')}-${get('month')}-${get('day')}T${hour}:${get('minute')}:${get('second')}`;
}

export type SingaporeDateStyle = 'date' | 'time' | 'datetime' | 'display';

/**
 * Formats a Date, or a stored naive Singapore-local datetime string, into a
 * human-readable Singapore-local representation.
 */
export function formatSingaporeDate(
  value: Date | string,
  style: SingaporeDateStyle = 'datetime'
): string {
  const date = typeof value === 'string' ? parseSingaporeDate(value) : value;

  if (style === 'date') {
    return toSingaporeISOString(date).slice(0, 10);
  }
  if (style === 'time') {
    return toSingaporeISOString(date).slice(11, 16);
  }
  if (style === 'datetime') {
    return toSingaporeISOString(date).slice(0, 16).replace('T', ' ');
  }

  return new Intl.DateTimeFormat('en-SG', {
    timeZone: SINGAPORE_TIMEZONE,
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
}

/** Returns the year, 1-indexed month (1-12), and day-of-month for a Date, in Singapore local time. */
export function getSingaporeDateParts(date: Date): {
  year: number;
  month: number;
  day: number;
} {
  const iso = toSingaporeISOString(date);
  return {
    year: Number(iso.slice(0, 4)),
    month: Number(iso.slice(5, 7)),
    day: Number(iso.slice(8, 10)),
  };
}

/** 0 (Sunday) - 6 (Saturday), in Singapore local time. */
export function getSingaporeDayOfWeek(date: Date): number {
  const weekday = new Intl.DateTimeFormat('en-US', {
    timeZone: SINGAPORE_TIMEZONE,
    weekday: 'short',
  }).format(date);
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  return days.indexOf(weekday);
}

/** Parses a `datetime('now')`-style SQLite UTC timestamp ("YYYY-MM-DD HH:MM:SS") into a Date. */
export function parseSqliteTimestamp(timestamp: string): Date {
  return new Date(`${timestamp.replace(' ', 'T')}Z`);
}

export function addMinutes(date: Date, minutes: number): Date {
  return new Date(date.getTime() + minutes * 60_000);
}

function daysInMonth(year: number, month: number): number {
  // month is 1-indexed; day 0 of next month = last day of this month
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

/**
 * Adds calendar days/months/years to a naive Singapore-local datetime string,
 * clamping day-of-month overflow to the last valid day of the target month
 * (e.g. Jan 31 + 1 month -> Feb 28/29).
 */
export function addSingaporeCalendar(
  isoString: string,
  amount: number,
  unit: 'day' | 'month' | 'year'
): string {
  const match = isoString.match(
    /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?/
  );
  if (!match) throw new Error(`Invalid Singapore datetime string: ${isoString}`);
  const [, yStr, moStr, dStr, hStr, miStr, sStr] = match;
  const year = Number(yStr);
  const month = Number(moStr);
  const day = Number(dStr);
  const time = `${hStr}:${miStr}:${sStr ?? '00'}`;

  if (unit === 'day') {
    const utcMs = Date.UTC(year, month - 1, day + amount);
    const d = new Date(utcMs);
    const yyyy = d.getUTCFullYear();
    const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
    const dd = String(d.getUTCDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}T${time}`;
  }

  let targetYear = year;
  let targetMonth = month;
  if (unit === 'month') {
    const totalMonths = month - 1 + amount;
    targetYear = year + Math.floor(totalMonths / 12);
    targetMonth = (totalMonths % 12 + 12) % 12 + 1;
  } else {
    targetYear = year + amount;
  }
  const clampedDay = Math.min(day, daysInMonth(targetYear, targetMonth));
  const mm = String(targetMonth).padStart(2, '0');
  const dd = String(clampedDay).padStart(2, '0');
  return `${targetYear}-${mm}-${dd}T${time}`;
}
