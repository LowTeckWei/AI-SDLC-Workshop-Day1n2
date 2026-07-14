import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getSession } from '@/lib/auth';
import { templateDB } from '@/lib/db';
import { priorityEnum, recurrencePatternEnum, reminderMinutesEnum } from '@/lib/validation';

const createTemplateSchema = z.object({
  name: z.string().trim().min(1, 'Name is required'),
  description: z.string().nullable().optional(),
  category: z.string().nullable().optional(),
  title_template: z.string().trim().min(1, 'Title template is required'),
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

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const templates = templateDB.findAllByUser(session.userId);
  return NextResponse.json({ templates });
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const parsed = createTemplateSchema.safeParse(body);
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

  const template = templateDB.create(session.userId, {
    name: input.name,
    description: input.description ?? null,
    category: input.category ?? null,
    title_template: input.title_template,
    priority: input.priority ?? 'medium',
    is_recurring: input.is_recurring ?? false,
    recurrence_pattern: input.is_recurring ? (input.recurrence_pattern ?? null) : null,
    reminder_minutes: input.reminder_minutes ?? null,
    due_date_offset_minutes: input.due_date_offset_minutes ?? null,
    subtasks_json: input.subtasks_json ?? null,
  });

  return NextResponse.json({ template }, { status: 201 });
}
