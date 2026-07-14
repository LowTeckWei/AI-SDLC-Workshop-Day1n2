import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getSession } from '@/lib/auth';
import { tagDB } from '@/lib/db';

const createTagSchema = z.object({
  name: z.string().trim().min(1),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional().default('#3B82F6'),
});

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const tags = tagDB.findAllByUser(session.userId);
  return NextResponse.json({ tags });
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const parsed = createTagSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? 'Invalid input' },
      { status: 400 }
    );
  }

  try {
    const tag = tagDB.create(session.userId, parsed.data.name, parsed.data.color);
    return NextResponse.json({ tag }, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message.includes('UNIQUE')) {
      return NextResponse.json(
        { error: 'Tag with this name already exists' },
        { status: 409 }
      );
    }
    throw error;
  }
}
