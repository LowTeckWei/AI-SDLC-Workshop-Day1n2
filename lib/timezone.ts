const SINGAPORE_TZ = 'Asia/Singapore';

export function getSingaporeNow(): Date {
  const now = new Date();
  const sgString = now.toLocaleString('en-US', { timeZone: SINGAPORE_TZ });
  return new Date(sgString);
}

export function formatSingaporeDate(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleString('en-SG', {
    timeZone: SINGAPORE_TZ,
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function toSingaporeISO(date: Date): string {
  return date.toLocaleString('sv-SE', { timeZone: SINGAPORE_TZ }).replace(' ', 'T');
}

export function isSingaporePast(dateStr: string): boolean {
  const now = getSingaporeNow();
  const target = new Date(dateStr);
  return target < now;
}
