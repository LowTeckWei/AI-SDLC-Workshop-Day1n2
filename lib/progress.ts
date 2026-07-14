import type { Subtask } from '@/lib/db';

export interface SubtaskProgress {
  completedCount: number;
  total: number;
  percent: number;
}

export function calculateSubtaskProgress(subtasks: Subtask[]): SubtaskProgress {
  const total = subtasks.length;
  const completedCount = subtasks.filter((s) => s.completed).length;
  const percent = total === 0 ? 0 : Math.round((completedCount / total) * 100);
  return { completedCount, total, percent };
}
