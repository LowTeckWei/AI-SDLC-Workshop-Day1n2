import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { templateDB, todoDB, subtaskDB, type TemplateSubtaskSpec } from '@/lib/db';
import { getSingaporeNow, addMinutes, toSingaporeISOString } from '@/lib/timezone';

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function POST(_request: NextRequest, { params }: RouteParams) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const { id } = await params;
  const template = templateDB.findById(Number(id), session.userId);
  if (!template) {
    return NextResponse.json({ error: 'Template not found' }, { status: 404 });
  }

  const dueDate =
    template.due_date_offset_minutes == null
      ? null
      : toSingaporeISOString(addMinutes(getSingaporeNow(), template.due_date_offset_minutes));

  const todo = todoDB.create(session.userId, {
    title: template.title_template,
    due_date: dueDate,
    priority: template.priority,
    is_recurring: template.is_recurring,
    recurrence_pattern: template.is_recurring ? template.recurrence_pattern : null,
    reminder_minutes: template.reminder_minutes,
  });

  if (template.subtasks_json) {
    let subtaskSpecs: TemplateSubtaskSpec[] = [];
    try {
      const parsed = JSON.parse(template.subtasks_json);
      if (Array.isArray(parsed)) subtaskSpecs = parsed;
    } catch {
      subtaskSpecs = [];
    }

    const sorted = [...subtaskSpecs].sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
    for (const spec of sorted) {
      if (spec?.title) subtaskDB.create(todo.id, spec.title);
    }
  }

  return NextResponse.json({ todo: todoDB.findById(todo.id, session.userId) }, { status: 201 });
}
