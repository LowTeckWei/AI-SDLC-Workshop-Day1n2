'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import type { Todo, Holiday, Priority } from '@/lib/db';
import { generateCalendarGrid, parseMonthParam } from '@/lib/calendar';

const PRIORITY_DOT: Record<Priority, string> = {
  high: 'bg-red-500',
  medium: 'bg-amber-500',
  low: 'bg-blue-500',
};

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const WEEKDAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MAX_VISIBLE_TODOS_PER_DAY = 3;

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

function CalendarPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [todos, setTodos] = useState<Todo[]>([]);
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [selectedDay, setSelectedDay] = useState<string | null>(null);

  const { year, month } = parseMonthParam(searchParams.get('month'));

  async function loadData() {
    const [todosRes, holidaysRes] = await Promise.all([
      fetch('/api/todos'),
      fetch('/api/holidays'),
    ]);
    if (todosRes.ok) {
      const { todos: fetchedTodos } = await todosRes.json();
      setTodos(fetchedTodos);
    }
    if (holidaysRes.ok) {
      const { holidays: fetchedHolidays } = await holidaysRes.json();
      setHolidays(fetchedHolidays);
    }
  }

  useEffect(() => {
    // Legitimate fetch-on-mount; the rule can't tell this apart from a naive-derived-state effect.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadData();
  }, []);

  const weeks = useMemo(() => generateCalendarGrid(year, month), [year, month]);

  const todosByDate = useMemo(() => {
    const map = new Map<string, Todo[]>();
    for (const todo of todos) {
      if (!todo.due_date) continue;
      const dateKey = todo.due_date.slice(0, 10);
      const list = map.get(dateKey) ?? [];
      list.push(todo);
      map.set(dateKey, list);
    }
    return map;
  }, [todos]);

  const holidaysByDate = useMemo(() => {
    const map = new Map<string, string>();
    for (const holiday of holidays) map.set(holiday.date, holiday.name);
    return map;
  }, [holidays]);

  function navigateToMonth(y: number, m: number) {
    const normalizedMonth = ((((m - 1) % 12) + 12) % 12) + 1;
    const normalizedYear = y + Math.floor((m - 1) / 12);
    router.push(`/calendar?month=${normalizedYear}-${pad(normalizedMonth)}`);
  }

  const selectedDayTodos = selectedDay ? (todosByDate.get(selectedDay) ?? []) : [];
  const selectedDayHoliday = selectedDay ? holidaysByDate.get(selectedDay) : undefined;

  return (
    <main className="mx-auto max-w-4xl p-4">
      <header className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Calendar</h1>
        <Link href="/" className="text-blue-600 hover:underline dark:text-blue-400">
          Back to Todos
        </Link>
      </header>

      <div className="mb-4 flex items-center justify-between">
        <button
          type="button"
          onClick={() => navigateToMonth(year, month - 1)}
          className="rounded-md border border-gray-300 px-3 py-1 text-sm dark:border-gray-700"
        >
          ← Prev
        </button>
        <h2 className="text-lg font-medium">
          {MONTH_NAMES[month - 1]} {year}
        </h2>
        <button
          type="button"
          onClick={() => navigateToMonth(year, month + 1)}
          className="rounded-md border border-gray-300 px-3 py-1 text-sm dark:border-gray-700"
        >
          Next →
        </button>
      </div>

      <div className="grid grid-cols-7 gap-px overflow-hidden rounded-md border border-gray-200 bg-gray-200 dark:border-gray-800 dark:bg-gray-800">
        {WEEKDAY_LABELS.map((label) => (
          <div
            key={label}
            className="bg-white p-2 text-center text-xs font-medium text-gray-500 dark:bg-gray-950 dark:text-gray-400"
          >
            {label}
          </div>
        ))}
        {weeks.flat().map((day) => {
          const dayTodos = todosByDate.get(day.date) ?? [];
          const holidayName = holidaysByDate.get(day.date);
          const visibleTodos = dayTodos.slice(0, MAX_VISIBLE_TODOS_PER_DAY);
          const overflowCount = dayTodos.length - visibleTodos.length;

          return (
            <button
              key={day.date}
              type="button"
              onClick={() => setSelectedDay(day.date)}
              className={`flex min-h-24 flex-col items-start gap-1 bg-white p-1 text-left dark:bg-gray-950 ${
                !day.isCurrentMonth ? 'opacity-40' : ''
              } ${day.isToday ? 'ring-2 ring-inset ring-blue-500' : ''}`}
            >
              <span
                className={`text-xs ${day.isWeekend ? 'text-red-400' : 'text-gray-500 dark:text-gray-400'}`}
              >
                {day.day}
              </span>
              {holidayName && (
                <span className="w-full truncate text-[10px] text-green-600 dark:text-green-400">
                  {holidayName}
                </span>
              )}
              {visibleTodos.map((todo) => (
                <span key={todo.id} className="flex w-full items-center gap-1 truncate text-[10px]">
                  <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${PRIORITY_DOT[todo.priority]}`} />
                  {todo.title}
                </span>
              ))}
              {overflowCount > 0 && (
                <span className="text-[10px] text-gray-400">+{overflowCount} more</span>
              )}
            </button>
          );
        })}
      </div>

      {selectedDay && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-lg bg-white p-6 dark:bg-gray-900">
            <h2 className="mb-4 text-lg font-semibold">{selectedDay}</h2>
            {selectedDayHoliday && (
              <p className="mb-2 text-sm text-green-600 dark:text-green-400">{selectedDayHoliday}</p>
            )}
            <ul className="space-y-2">
              {selectedDayTodos.map((todo) => (
                <li key={todo.id} className="flex items-center gap-2 text-sm">
                  <span className={`h-2 w-2 rounded-full ${PRIORITY_DOT[todo.priority]}`} />
                  {todo.title}
                </li>
              ))}
              {selectedDayTodos.length === 0 && (
                <p className="text-sm text-gray-500">No todos due this day.</p>
              )}
            </ul>
            <button
              type="button"
              onClick={() => setSelectedDay(null)}
              className="mt-4 w-full rounded-md border border-gray-300 px-3 py-2 text-sm dark:border-gray-700"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </main>
  );
}

export default function CalendarPage() {
  return (
    <Suspense fallback={<div className="p-4 text-sm text-gray-500">Loading...</div>}>
      <CalendarPageInner />
    </Suspense>
  );
}
