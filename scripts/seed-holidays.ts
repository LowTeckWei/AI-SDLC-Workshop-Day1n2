import { holidayDB } from '../lib/db';

/**
 * Seed script for Singapore public holidays.
 * Seeds holidays for the current year and next year.
 * Run via: npx tsx scripts/seed-holidays.ts
 */

interface HolidayRecord {
  date: string;
  name: string;
}

function getHolidaysForYear(year: number): HolidayRecord[] {
  const holidays: HolidayRecord[] = [];

  // Fixed holidays (same date every year)
  holidays.push({ date: `${year}-01-01`, name: 'New Year\'s Day' });
  holidays.push({ date: `${year}-05-01`, name: 'Labour Day' });
  holidays.push({ date: `${year}-08-09`, name: 'National Day' });
  holidays.push({ date: `${year}-12-25`, name: 'Christmas Day' });

  // Movable holidays based on lunar/Islamic calendars
  // Dates are based on accurate estimates for Singapore MOM-gazetted holidays
  if (year === 2026) {
    holidays.push({ date: '2026-02-17', name: 'Chinese New Year Day 1' });
    holidays.push({ date: '2026-02-18', name: 'Chinese New Year Day 2' });
    holidays.push({ date: '2026-04-03', name: 'Good Friday' });
    holidays.push({ date: '2026-04-24', name: 'Hari Raya Puasa' });
    holidays.push({ date: '2026-05-24', name: 'Vesak Day' });
    holidays.push({ date: '2026-07-07', name: 'Hari Raya Haji' });
    holidays.push({ date: '2026-10-29', name: 'Deepavali' });
  } else if (year === 2027) {
    holidays.push({ date: '2027-02-05', name: 'Chinese New Year Day 1' });
    holidays.push({ date: '2027-02-06', name: 'Chinese New Year Day 2' });
    holidays.push({ date: '2027-03-26', name: 'Good Friday' });
    holidays.push({ date: '2027-04-13', name: 'Hari Raya Puasa' });
    holidays.push({ date: '2027-05-13', name: 'Vesak Day' });
    holidays.push({ date: '2027-06-26', name: 'Hari Raya Haji' });
    holidays.push({ date: '2027-10-18', name: 'Deepavali' });
  } else if (year === 2025) {
    holidays.push({ date: '2025-01-29', name: 'Chinese New Year Day 1' });
    holidays.push({ date: '2025-01-30', name: 'Chinese New Year Day 2' });
    holidays.push({ date: '2025-04-18', name: 'Good Friday' });
    holidays.push({ date: '2025-04-04', name: 'Hari Raya Puasa' });
    holidays.push({ date: '2025-05-15', name: 'Vesak Day' });
    holidays.push({ date: '2025-06-17', name: 'Hari Raya Haji' });
    holidays.push({ date: '2025-11-01', name: 'Deepavali' });
  } else if (year === 2028) {
    holidays.push({ date: '2028-01-26', name: 'Chinese New Year Day 1' });
    holidays.push({ date: '2028-01-27', name: 'Chinese New Year Day 2' });
    holidays.push({ date: '2028-03-31', name: 'Good Friday' });
    holidays.push({ date: '2028-04-01', name: 'Hari Raya Puasa' });
    holidays.push({ date: '2028-05-01', name: 'Vesak Day' });
    holidays.push({ date: '2028-06-15', name: 'Hari Raya Haji' });
    holidays.push({ date: '2028-10-07', name: 'Deepavali' });
  }

  return holidays;
}

function main(): void {
  const now = new Date();
  const currentYear = now.getFullYear();
  const nextYear = currentYear + 1;

  console.log(`Seeding Singapore public holidays for ${currentYear} and ${nextYear}...`);

  const currentYearHolidays = getHolidaysForYear(currentYear);
  const nextYearHolidays = getHolidaysForYear(nextYear);

  let seedCount = 0;

  for (const holiday of currentYearHolidays) {
    holidayDB.create(holiday.date, holiday.name);
    seedCount++;
  }

  for (const holiday of nextYearHolidays) {
    holidayDB.create(holiday.date, holiday.name);
    seedCount++;
  }

  console.log(`Successfully seeded ${seedCount} holidays.`);
  console.log(`${currentYearHolidays.length} holidays for ${currentYear}`);
  console.log(`${nextYearHolidays.length} holidays for ${nextYear}`);
}

main();
