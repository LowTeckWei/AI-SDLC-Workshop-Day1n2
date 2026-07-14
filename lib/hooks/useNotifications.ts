'use client';

import { useState, useEffect, useCallback } from 'react';
import { formatSingaporeDate, getSingaporeNow } from '@/lib/timezone';

export function useNotifications() {
  const [permission, setPermission] = useState<NotificationPermission>('default');

  useEffect(() => {
    if (typeof Notification !== 'undefined') {
      setPermission(Notification.permission);
    }
  }, []);

  const requestPermission = useCallback(async () => {
    if (typeof Notification === 'undefined') return;
    const result = await Notification.requestPermission();
    setPermission(result);
  }, []);

  useEffect(() => {
    if (permission !== 'granted') return;

    const poll = async () => {
      if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return;

      try {
        const res = await fetch('/api/notifications/check');
        if (!res.ok) return;
        const { data: dueTodos } = await res.json();
        if (!Array.isArray(dueTodos)) return;

        for (const todo of dueTodos) {
          new Notification(todo.title, {
            body: `Due ${formatSingaporeDate(todo.due_date)}`,
            tag: `todo-${todo.id}`,
          });
          await fetch(`/api/todos/${todo.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ last_notification_sent: getSingaporeNow().toISOString() }),
          });
        }
      } catch {
        // Polling errors are non-fatal
      }
    };

    poll();
    const interval = setInterval(poll, 30_000);
    return () => clearInterval(interval);
  }, [permission]);

  return { permission, requestPermission };
}
