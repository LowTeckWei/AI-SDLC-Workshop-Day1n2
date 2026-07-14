'use client';

import { useEffect, useRef } from 'react';
import type { Todo } from '@/lib/db';
import { getSingaporeNow, toSingaporeISOString } from '@/lib/timezone';

const POLL_INTERVAL_MS = 30_000;

export function useNotifications(): void {
  const notifiedIdsRef = useRef<Set<number>>(new Set());

  useEffect(() => {
    if (typeof window === 'undefined' || !('Notification' in window)) return;

    if (Notification.permission === 'default') {
      Notification.requestPermission();
    }

    async function checkReminders() {
      if (Notification.permission !== 'granted') return;

      const response = await fetch('/api/notifications/check');
      if (!response.ok) return;

      const { todos } = (await response.json()) as { todos: Todo[] };

      for (const todo of todos) {
        if (notifiedIdsRef.current.has(todo.id)) continue;
        notifiedIdsRef.current.add(todo.id);

        new Notification(todo.title, {
          body: todo.due_date ? `Due ${todo.due_date}` : undefined,
          tag: `todo-${todo.id}`,
        });

        await fetch(`/api/todos/${todo.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            last_notification_sent: toSingaporeISOString(getSingaporeNow()),
          }),
        });
      }
    }

    checkReminders();
    const interval = setInterval(checkReminders, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, []);
}
