import { NextResponse } from 'next/server';
import { getSession, deleteSession } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function POST() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  await deleteSession();
  return NextResponse.json({ success: true });
}
