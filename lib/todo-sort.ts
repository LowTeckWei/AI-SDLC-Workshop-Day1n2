import type { Todo, Priority } from '@/lib/db';
import { getSingaporeNow, parseSingaporeDate, parseSqliteTimestamp } from '@/lib/timezone';

export type TodoSection = 'overdue' | 'pending' | 'completed';

const PRIORITY_ORDER: Record<Priority, number> = { high: 0, medium: 1, low: 2 };

export function getTodoSection(todo: Todo, now: Date = getSingaporeNow()): TodoSection {
  if (todo.completed) return 'completed';
  if (todo.due_date && parseSingaporeDate(todo.due_date) < now) return 'overdue';
  return 'pending';
}

/** Priority (high->low) -> due_date (earliest->latest, nulls last) -> created_at (newest->oldest). */
export function compareTodos(a: Todo, b: Todo): number {
  const priorityDiff = PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority];
  if (priorityDiff !== 0) return priorityDiff;

  const aDue = a.due_date ? parseSingaporeDate(a.due_date).getTime() : Infinity;
  const bDue = b.due_date ? parseSingaporeDate(b.due_date).getTime() : Infinity;
  if (aDue !== bDue) return aDue - bDue;

  return parseSqliteTimestamp(b.created_at).getTime() - parseSqliteTimestamp(a.created_at).getTime();
}

export interface TodoSections {
  overdue: Todo[];
  pending: Todo[];
  completed: Todo[];
}

export function groupTodosIntoSections(
  todos: Todo[],
  now: Date = getSingaporeNow()
): TodoSections {
  const overdue: Todo[] = [];
  const pending: Todo[] = [];
  const completed: Todo[] = [];

  for (const todo of todos) {
    const section = getTodoSection(todo, now);
    if (section === 'overdue') overdue.push(todo);
    else if (section === 'pending') pending.push(todo);
    else completed.push(todo);
  }

  overdue.sort(compareTodos);
  pending.sort(compareTodos);
  completed.sort(
    (a, b) => parseSqliteTimestamp(b.created_at).getTime() - parseSqliteTimestamp(a.created_at).getTime()
  );

  return { overdue, pending, completed };
}
