export type Priority = 'high' | 'medium' | 'low';
export type RecurrencePattern = 'daily' | 'weekly' | 'monthly' | 'yearly';

export const PRIORITY_VALUES: Priority[] = ['high', 'medium', 'low'];

export const PRIORITY_ORDER: Record<Priority, number> = {
  high: 0,
  medium: 1,
  low: 2,
};

export function validatePriority(value: unknown): Priority {
  if (value === undefined || value === null) return 'medium';
  if (value === 'high' || value === 'medium' || value === 'low') return value;
  throw new Error(`Invalid priority: ${String(value)}. Must be 'high', 'medium', or 'low'.`);
}

export interface Todo {
  id: number;
  user_id: number;
  title: string;
  completed: boolean;
  due_date: string | null;
  priority: Priority;
  is_recurring: boolean;
  recurrence_pattern: RecurrencePattern | null;
  reminder_minutes: number | null;
  last_notification_sent: string | null;
  created_at: string;
  updated_at: string | null;
  subtasks?: Subtask[];
  tags?: Tag[];
}

export interface Subtask {
  id: number;
  todo_id: number;
  title: string;
  completed: boolean;
  position: number;
  created_at: string;
}

export interface Tag {
  id: number;
  user_id: number;
  name: string;
  color: string;
}

export interface User {
  id: number;
  username: string;
  created_at: string;
}

export interface Authenticator {
  id: number;
  user_id: number;
  credential_id: string;
  credential_public_key: string;
  counter: number;
  transports: string | null;
  created_at: string;
}

export interface Template {
  id: number;
  user_id: number;
  name: string;
  title: string;
  priority: Priority;
  due_date_offset_days: number | null;
  reminder_minutes: number | null;
  is_recurring: boolean;
  recurrence_pattern: RecurrencePattern | null;
  subtasks_json: string | null;
  created_at: string;
}

export interface CreateTodoInput {
  title: string;
  due_date?: string | null;
  priority?: Priority;
  is_recurring?: boolean;
  recurrence_pattern?: RecurrencePattern | null;
  reminder_minutes?: number | null;
  tag_ids?: number[];
}

export interface UpdateTodoInput extends Partial<CreateTodoInput> {
  completed?: boolean;
}
