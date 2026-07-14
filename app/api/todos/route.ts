import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getSession } from '@/lib/auth';
import { todoDB } from '@/lib/db';
import { getSingaporeNow, parseSingaporeDate, addMinutes } from '@/lib/timezone';
import { priorityEnum, recurrencePatternEnum, reminderMinutesEnum } from '@/lib/validation';

const createTodoSchema = z.object({
  title: z.string().trim().min(1, 'Title is required'),
  due_date: z.string().nullable().optional(),
  priority: priorityEnum.optional(),
  is_recurring: z.boolean().optional(),
  recurrence_pattern: recurrencePatternEnum.nullable().optional(),
  reminder_minutes: reminderMinutesEnum.nullable().optional(),
});

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const todos = todoDB.findAllByUser(session.userId);
  return NextResponse.json({ todos });
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const parsed = createTodoSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? 'Invalid input' },
      { status: 400 }
    );
  }
  const input = parsed.data;

  if (input.due_date) {
    const minAllowed = addMinutes(getSingaporeNow(), 1);
    if (parseSingaporeDate(input.due_date) < minAllowed) {
      return NextResponse.json(
        { error: 'Due date must be at least 1 minute in the future' },
        { status: 400 }
      );
    }
  }

  if (input.is_recurring && !input.due_date) {
    return NextResponse.json(
      { error: 'Recurring todos require a due date' },
      { status: 400 }
    );
  }
  if (input.is_recurring && !input.recurrence_pattern) {
    return NextResponse.json(
      { error: 'Recurring todos require a recurrence pattern' },
      { status: 400 }
    );
  }

  const todo = todoDB.create(session.userId, {
    title: input.title,
    due_date: input.due_date ?? null,
    priority: input.priority ?? 'medium',
    is_recurring: input.is_recurring ?? false,
    recurrence_pattern: input.is_recurring ? (input.recurrence_pattern ?? null) : null,
    reminder_minutes: input.reminder_minutes ?? null,
  });

  return NextResponse.json({ todo }, { status: 201 });
}
