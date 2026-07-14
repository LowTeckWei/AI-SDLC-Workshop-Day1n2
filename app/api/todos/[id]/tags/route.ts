import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getSession } from '@/lib/auth';
import { todoDB, tagDB } from '@/lib/db';

const attachTagSchema = z.object({
  tagId: z.number().int().positive(),
});

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const { id } = await params;
  const todoId = Number(id);

  const todo = todoDB.findById(todoId, session.userId);
  if (!todo) {
    return NextResponse.json({ error: 'Todo not found' }, { status: 404 });
  }

  const body = await request.json().catch(() => null);
  const parsed = attachTagSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? 'Invalid input' },
      { status: 400 }
    );
  }

  const tag = tagDB.findById(parsed.data.tagId);
  if (!tag || tag.user_id !== session.userId) {
    return NextResponse.json({ error: 'Tag not found' }, { status: 404 });
  }

  tagDB.attachToTodo(todoId, parsed.data.tagId);
  return NextResponse.json({ success: true });
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const { id } = await params;
  const todoId = Number(id);

  const todo = todoDB.findById(todoId, session.userId);
  if (!todo) {
    return NextResponse.json({ error: 'Todo not found' }, { status: 404 });
  }

  const body = await request.json().catch(() => null);
  const parsed = attachTagSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? 'Invalid input' },
      { status: 400 }
    );
  }

  const tag = tagDB.findById(parsed.data.tagId);
  if (!tag || tag.user_id !== session.userId) {
    return NextResponse.json({ error: 'Tag not found' }, { status: 404 });
  }

  tagDB.detachFromTodo(todoId, parsed.data.tagId);
  return NextResponse.json({ success: true });
}
