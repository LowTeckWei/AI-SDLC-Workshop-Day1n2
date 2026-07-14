import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getSession } from '@/lib/auth';
import { todoDB, tagDB } from '@/lib/db';
import { calculateNextDueDate } from '@/lib/recurrence';
import { getSingaporeNow, parseSingaporeDate, addMinutes } from '@/lib/timezone';
import { priorityEnum, recurrencePatternEnum, reminderMinutesEnum } from '@/lib/validation';

const updateTodoSchema = z.object({
  title: z.string().trim().min(1).optional(),
  completed: z.boolean().optional(),
  due_date: z.string().nullable().optional(),
  priority: priorityEnum.optional(),
  is_recurring: z.boolean().optional(),
  recurrence_pattern: recurrencePatternEnum.nullable().optional(),
  reminder_minutes: reminderMinutesEnum.nullable().optional(),
  last_notification_sent: z.string().nullable().optional(),
});

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(_request: NextRequest, { params }: RouteParams) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const { id } = await params;
  const todo = todoDB.findById(Number(id), session.userId);
  if (!todo) {
    return NextResponse.json({ error: 'Todo not found' }, { status: 404 });
  }
  return NextResponse.json({ todo });
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const { id } = await params;
  const todoId = Number(id);

  const existing = todoDB.findById(todoId, session.userId);
  if (!existing) {
    return NextResponse.json({ error: 'Todo not found' }, { status: 404 });
  }

  const body = await request.json().catch(() => null);
  const parsed = updateTodoSchema.safeParse(body);
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

  const wasCompleted = existing.completed;
  const updated = todoDB.update(todoId, session.userId, input);
  if (!updated) {
    return NextResponse.json({ error: 'Todo not found' }, { status: 404 });
  }

  const justCompleted = input.completed === true && !wasCompleted;
  if (
    justCompleted &&
    updated.is_recurring &&
    updated.recurrence_pattern &&
    updated.due_date
  ) {
    const nextDueDate = calculateNextDueDate(updated.due_date, updated.recurrence_pattern);
    const nextTodo = todoDB.create(session.userId, {
      title: updated.title,
      due_date: nextDueDate,
      priority: updated.priority,
      is_recurring: true,
      recurrence_pattern: updated.recurrence_pattern,
      reminder_minutes: updated.reminder_minutes,
    });
    for (const tag of updated.tags ?? []) {
      tagDB.attachToTodo(nextTodo.id, tag.id);
    }
  }

  return NextResponse.json({ todo: todoDB.findById(todoId, session.userId) });
}

export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const { id } = await params;
  const deleted = todoDB.delete(Number(id), session.userId);
  if (!deleted) {
    return NextResponse.json({ error: 'Todo not found' }, { status: 404 });
  }
  return NextResponse.json({ success: true });
}
