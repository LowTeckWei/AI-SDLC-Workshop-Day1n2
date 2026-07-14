import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getSession } from '@/lib/auth';
import { db, todoDB, tagDB, subtaskDB } from '@/lib/db';
import { priorityEnum, recurrencePatternEnum, reminderMinutesEnum } from '@/lib/validation';

const importSubtaskSchema = z.object({
  title: z.string().min(1),
  completed: z.boolean().optional().default(false),
  position: z.number().int().optional().default(0),
});

const importTagSchema = z.object({
  name: z.string().min(1),
  color: z.string().optional().default('#3B82F6'),
});

const importTodoSchema = z.object({
  title: z.string().min(1),
  completed: z.boolean().optional().default(false),
  due_date: z.string().nullable().optional(),
  priority: priorityEnum.optional().default('medium'),
  is_recurring: z.boolean().optional().default(false),
  recurrence_pattern: recurrencePatternEnum.nullable().optional(),
  reminder_minutes: reminderMinutesEnum.nullable().optional(),
  subtasks: z.array(importSubtaskSchema).optional().default([]),
  tags: z.array(importTagSchema).optional().default([]),
});

const importEnvelopeSchema = z.object({
  version: z.literal(1),
  exported_at: z.string(),
  todos: z.array(importTodoSchema),
});

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const parsed = importEnvelopeSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: `Invalid import file format: ${parsed.error.issues[0]?.message ?? 'unknown error'}` },
      { status: 400 }
    );
  }

  const userId = session.userId;
  const envelope = parsed.data;

  const runImport = db.transaction(() => {
    let importedCount = 0;

    for (const todoInput of envelope.todos) {
      const todo = todoDB.create(userId, {
        title: todoInput.title,
        due_date: todoInput.due_date ?? null,
        priority: todoInput.priority,
        is_recurring: todoInput.is_recurring,
        recurrence_pattern: todoInput.is_recurring
          ? (todoInput.recurrence_pattern ?? null)
          : null,
        reminder_minutes: todoInput.reminder_minutes ?? null,
      });

      if (todoInput.completed) {
        todoDB.update(todo.id, userId, { completed: true });
      }

      for (const subtaskInput of todoInput.subtasks) {
        const subtask = subtaskDB.create(todo.id, subtaskInput.title);
        if (subtaskInput.completed) {
          subtaskDB.update(subtask.id, { completed: true });
        }
      }

      for (const tagInput of todoInput.tags) {
        const tag = tagDB.findOrCreateByName(userId, tagInput.name, tagInput.color);
        tagDB.attachToTodo(todo.id, tag.id);
      }

      importedCount += 1;
    }

    return importedCount;
  });

  const importedCount = runImport();

  return NextResponse.json({ success: true, imported: importedCount });
}
