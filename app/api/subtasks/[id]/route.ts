import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getSession } from '@/lib/auth';
import { subtaskDB, todoDB } from '@/lib/db';

const updateSubtaskSchema = z.object({
  title: z.string().trim().min(1).optional(),
  completed: z.boolean().optional(),
});

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const { id } = await params;
  const subtaskId = Number(id);

  const subtask = subtaskDB.findById(subtaskId);
  if (!subtask) {
    return NextResponse.json({ error: 'Subtask not found' }, { status: 404 });
  }

  const parentTodo = todoDB.findById(subtask.todo_id, session.userId);
  if (!parentTodo) {
    return NextResponse.json({ error: 'Subtask not found' }, { status: 404 });
  }

  const body = await request.json().catch(() => null);
  const parsed = updateSubtaskSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? 'Invalid input' },
      { status: 400 }
    );
  }

  const updated = subtaskDB.update(subtaskId, parsed.data);
  return NextResponse.json({ subtask: updated });
}

export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const { id } = await params;
  const subtaskId = Number(id);

  const subtask = subtaskDB.findById(subtaskId);
  if (!subtask) {
    return NextResponse.json({ error: 'Subtask not found' }, { status: 404 });
  }

  const parentTodo = todoDB.findById(subtask.todo_id, session.userId);
  if (!parentTodo) {
    return NextResponse.json({ error: 'Subtask not found' }, { status: 404 });
  }

  subtaskDB.delete(subtaskId);
  return NextResponse.json({ success: true });
}
