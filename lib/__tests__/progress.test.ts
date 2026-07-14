import { describe, expect, it } from 'vitest';
import { calculateSubtaskProgress } from '@/lib/progress';
import type { Subtask } from '@/lib/db';

function subtask(completed: boolean): Subtask {
  return {
    id: 1,
    todo_id: 1,
    title: 'test',
    completed,
    position: 0,
  } as Subtask;
}

describe('calculateSubtaskProgress', () => {
  it('returns zeroed values for an empty list', () => {
    expect(calculateSubtaskProgress([])).toEqual({ completedCount: 0, total: 0, percent: 0 });
  });

  it('computes a partial completion percentage, rounding to the nearest integer', () => {
    const subtasks = [subtask(true), subtask(false), subtask(false)];
    expect(calculateSubtaskProgress(subtasks)).toEqual({ completedCount: 1, total: 3, percent: 33 });
  });

  it('rounds .5 percentages up', () => {
    const subtasks = [subtask(true), subtask(false)];
    expect(calculateSubtaskProgress(subtasks)).toEqual({ completedCount: 1, total: 2, percent: 50 });
  });

  it('returns 100% when all subtasks are complete', () => {
    const subtasks = [subtask(true), subtask(true)];
    expect(calculateSubtaskProgress(subtasks)).toEqual({ completedCount: 2, total: 2, percent: 100 });
  });

  it('returns 0% when none are complete', () => {
    const subtasks = [subtask(false), subtask(false)];
    expect(calculateSubtaskProgress(subtasks)).toEqual({ completedCount: 0, total: 2, percent: 0 });
  });
});
