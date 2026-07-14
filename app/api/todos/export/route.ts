import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { todoDB, type Todo } from '@/lib/db';
import { getSingaporeNow, formatSingaporeDate, toSingaporeISOString } from '@/lib/timezone';

function csvEscape(value: string | number | boolean | null): string {
  const str = value === null || value === undefined ? '' : String(value);
  if (/[",\n]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function toCsv(todos: Todo[]): string {
  const header = [
    'ID',
    'Title',
    'Completed',
    'Due Date',
    'Priority',
    'Recurring',
    'Pattern',
    'Reminder',
  ];
  const rows = todos.map((todo) => [
    todo.id,
    todo.title,
    todo.completed ? 'Yes' : 'No',
    todo.due_date ?? '',
    todo.priority,
    todo.is_recurring ? 'Yes' : 'No',
    todo.recurrence_pattern ?? '',
    todo.reminder_minutes ?? '',
  ]);
  return [header, ...rows].map((row) => row.map(csvEscape).join(',')).join('\n');
}

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const format = request.nextUrl.searchParams.get('format') === 'csv' ? 'csv' : 'json';
  const todos = todoDB.findAllByUser(session.userId);
  const dateStamp = formatSingaporeDate(getSingaporeNow(), 'date');

  if (format === 'csv') {
    const csv = toCsv(todos);
    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="todos-${dateStamp}.csv"`,
      },
    });
  }

  const payload = {
    version: 1,
    exported_at: toSingaporeISOString(getSingaporeNow()),
    todos: todos.map((todo) => ({
      title: todo.title,
      completed: todo.completed,
      due_date: todo.due_date,
      priority: todo.priority,
      is_recurring: todo.is_recurring,
      recurrence_pattern: todo.recurrence_pattern,
      reminder_minutes: todo.reminder_minutes,
      subtasks: (todo.subtasks ?? []).map((s) => ({
        title: s.title,
        completed: s.completed,
        position: s.position,
      })),
      tags: (todo.tags ?? []).map((t) => ({ name: t.name, color: t.color })),
    })),
  };

  return new NextResponse(JSON.stringify(payload, null, 2), {
    headers: {
      'Content-Type': 'application/json',
      'Content-Disposition': `attachment; filename="todos-${dateStamp}.json"`,
    },
  });
}
