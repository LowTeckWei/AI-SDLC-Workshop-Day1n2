import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { todoDB } from '@/lib/db';
import { getSingaporeNow, parseSingaporeDate, addMinutes } from '@/lib/timezone';

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const now = getSingaporeNow();
  const todos = todoDB.findAllByUser(session.userId);

  const dueReminders = todos.filter((todo) => {
    if (todo.completed || !todo.due_date || todo.reminder_minutes == null) return false;

    const dueDate = parseSingaporeDate(todo.due_date);
    const windowStart = addMinutes(dueDate, -todo.reminder_minutes);

    if (now < windowStart || now > dueDate) return false;

    if (todo.last_notification_sent) {
      const lastSent = parseSingaporeDate(todo.last_notification_sent);
      if (lastSent >= windowStart) return false;
    }

    return true;
  });

  return NextResponse.json({ todos: dueReminders });
}
