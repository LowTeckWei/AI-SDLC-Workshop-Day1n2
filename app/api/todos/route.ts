import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { todoDB, validatePriority } from '@/lib/db';
import type { Priority } from '@/lib/db';
import { getSingaporeNow } from '@/lib/timezone';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const body = await request.json();
  const title = (body.title ?? '').trim();
  if (!title) {
    return NextResponse.json({ error: 'Title is required' }, { status: 400 });
  }

  if (body.due_date) {
    const due = new Date(body.due_date);
    if (isNaN(due.getTime())) {
      return NextResponse.json({ error: 'Invalid due date' }, { status: 400 });
    }
    const minDue = new Date(getSingaporeNow().getTime() + 60_000);
    if (due < minDue) {
      return NextResponse.json(
        { error: 'Due date must be at least 1 minute in the future' },
        { status: 400 }
      );
    }
  }

  let priority: Priority;
  try {
    priority = validatePriority(body.priority);
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 400 });
  }

  const todo = todoDB.create({
    user_id: session.userId,
    title,
    due_date: body.due_date ?? null,
    priority,
    is_recurring: body.is_recurring ?? false,
    recurrence_pattern: body.recurrence_pattern ?? null,
    reminder_minutes: body.reminder_minutes ?? null,
    tag_ids: body.tag_ids ?? [],
  });

  return NextResponse.json(todo, { status: 201 });
}

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }
  return NextResponse.json(todoDB.findAllByUser(session.userId));
}
