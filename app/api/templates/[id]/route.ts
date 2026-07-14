import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getSession } from '@/lib/auth';
import { templateDB } from '@/lib/db';
import { priorityEnum, recurrencePatternEnum, reminderMinutesEnum } from '@/lib/validation';

const updateTemplateSchema = z.object({
  name: z.string().trim().min(1).optional(),
  description: z.string().nullable().optional(),
  category: z.string().nullable().optional(),
  title_template: z.string().trim().min(1).optional(),
  priority: priorityEnum.optional(),
  is_recurring: z.boolean().optional(),
  recurrence_pattern: recurrencePatternEnum.nullable().optional(),
  reminder_minutes: reminderMinutesEnum.nullable().optional(),
  due_date_offset_minutes: z.number().int().nullable().optional(),
  subtasks_json: z.string().nullable().optional(),
});

function validateSubtasksJson(subtasksJson: string | null | undefined): boolean {
  if (!subtasksJson) return true;

  try {
    const parsed = JSON.parse(subtasksJson);
    if (!Array.isArray(parsed)) return false;

    return parsed.every(
      (item) =>
        typeof item === 'object' &&
        item !== null &&
        typeof item.title === 'string' &&
        typeof item.position === 'number'
    );
  } catch {
    return false;
  }
}

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const { id } = await params;
  const templateId = Number(id);

  const existing = templateDB.findById(templateId, session.userId);
  if (!existing) {
    return NextResponse.json({ error: 'Template not found' }, { status: 404 });
  }

  const body = await request.json().catch(() => null);
  const parsed = updateTemplateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? 'Invalid input' },
      { status: 400 }
    );
  }
  const input = parsed.data;

  if (input.is_recurring && !input.recurrence_pattern) {
    return NextResponse.json(
      { error: 'Recurring templates require a recurrence pattern' },
      { status: 400 }
    );
  }

  if (!validateSubtasksJson(input.subtasks_json)) {
    return NextResponse.json(
      { error: 'Invalid subtasks_json format' },
      { status: 400 }
    );
  }

  const updated = templateDB.update(templateId, session.userId, input);
  if (!updated) {
    return NextResponse.json({ error: 'Template not found' }, { status: 404 });
  }

  return NextResponse.json({ template: updated });
}

export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const { id } = await params;
  const deleted = templateDB.delete(Number(id), session.userId);
  if (!deleted) {
    return NextResponse.json({ error: 'Template not found' }, { status: 404 });
  }
  return NextResponse.json({ success: true });
}
