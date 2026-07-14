import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { getSingaporeNow } from '@/lib/timezone';
import db from '@/lib/db';

export async function GET(_request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const now = getSingaporeNow();
  // Format as 'YYYY-MM-DD HH:MM:SS' for SQLite datetime() — sv-SE locale gives this format directly
  const nowStr = now.toLocaleString('sv-SE', { timeZone: 'Asia/Singapore' });

  const dueReminders = db
    .prepare(
      `SELECT * FROM todos
       WHERE user_id = ?
         AND completed = 0
         AND due_date IS NOT NULL
         AND reminder_minutes IS NOT NULL
         AND last_notification_sent IS NULL
         AND datetime(due_date, '-' || reminder_minutes || ' minutes') <= datetime(?)`
    )
    .all(session.userId, nowStr);

  return NextResponse.json({ success: true, data: dueReminders });
}
