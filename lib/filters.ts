import { Priority, Todo, Tag } from './db';

export interface FilterState {
  search: string;
  priority: Priority | null;
  tagId: number | null;
  completion: 'all' | 'completed' | 'incomplete';
  dueDateFrom: string | null;
  dueDateTo: string | null;
}

export const DEFAULT_FILTER_STATE: FilterState = {
  search: '',
  priority: null,
  tagId: null,
  completion: 'all',
  dueDateFrom: null,
  dueDateTo: null,
};

/**
 * Applies filters to a todo array in sequential order.
 * Each filter stage narrows the result of the previous stage.
 */
export function applyFilters(todos: Todo[], filters: FilterState): Todo[] {
  let result = todos;

  // Stage 1: Search filter
  if (filters.search.trim().length > 0) {
    const query = filters.search.trim().toLowerCase();
    result = result.filter((todo) => {
      const titleMatch = todo.title.toLowerCase().includes(query);
      const subtaskMatch = (todo.subtasks ?? []).some((subtask) =>
        subtask.title.toLowerCase().includes(query)
      );
      return titleMatch || subtaskMatch;
    });
  }

  // Stage 2: Priority filter
  if (filters.priority !== null) {
    result = result.filter((todo) => todo.priority === filters.priority);
  }

  // Stage 3: Tag filter
  if (filters.tagId !== null) {
    result = result.filter((todo) => {
      return (todo.tags ?? []).some((tag) => tag.id === filters.tagId);
    });
  }

  // Stage 4: Completion filter
  if (filters.completion === 'completed') {
    result = result.filter((todo) => todo.completed === true);
  } else if (filters.completion === 'incomplete') {
    result = result.filter((todo) => todo.completed === false);
  }

  // Stage 5: Date range filter
  if (filters.dueDateFrom !== null || filters.dueDateTo !== null) {
    result = result.filter((todo) => {
      // Exclude todos with no due date if any date filter is set
      if (todo.due_date === null) {
        return false;
      }

      // Check lower bound (inclusive)
      if (filters.dueDateFrom !== null && todo.due_date < filters.dueDateFrom) {
        return false;
      }

      // Check upper bound (inclusive)
      if (filters.dueDateTo !== null && todo.due_date > filters.dueDateTo) {
        return false;
      }

      return true;
    });
  }

  return result;
}

/**
 * Standard debounce utility: delays function invocation until the specified delay
 * has elapsed since the last call.
 */
export function debounce<T extends (...args: unknown[]) => void>(
  fn: T,
  delayMs: number
): (...args: Parameters<T>) => void {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;

  return function debounced(...args: Parameters<T>) {
    if (timeoutId !== null) {
      clearTimeout(timeoutId);
    }
    timeoutId = setTimeout(() => {
      fn(...args);
    }, delayMs);
  };
}

// ---------------------------------------------------------------------------
// Filter Preset Management (localStorage-backed)
// ---------------------------------------------------------------------------

export interface FilterPreset {
  id: string;
  name: string;
  filters: FilterState;
  createdAt: string;
}

const PRESETS_STORAGE_KEY = 'todo-app:filter-presets';

/**
 * Load all saved filter presets from localStorage.
 * Returns an empty array if storage is unavailable, the key doesn't exist, or JSON is invalid.
 */
export function loadFilterPresets(): FilterPreset[] {
  // Guard for SSR (server-side rendering)
  if (typeof window === 'undefined') {
    return [];
  }

  try {
    const stored = window.localStorage.getItem(PRESETS_STORAGE_KEY);
    if (!stored) {
      return [];
    }
    const parsed = JSON.parse(stored);
    if (!Array.isArray(parsed)) {
      return [];
    }
    return parsed;
  } catch {
    return [];
  }
}

/**
 * Save a new filter preset to localStorage.
 * Generates a UUID for the preset ID, appends it to the stored array,
 * and persists the updated array.
 * Returns the updated array of all presets.
 */
export function saveFilterPreset(name: string, filters: FilterState): FilterPreset[] {
  if (typeof window === 'undefined') {
    return [];
  }

  const presets = loadFilterPresets();
  const newPreset: FilterPreset = {
    id: crypto.randomUUID(),
    name,
    filters,
    createdAt: new Date().toISOString(),
  };

  presets.push(newPreset);
  window.localStorage.setItem(PRESETS_STORAGE_KEY, JSON.stringify(presets));
  return presets;
}

/**
 * Delete a filter preset by ID.
 * Removes the preset from storage and persists the updated array.
 * Returns the updated array of remaining presets.
 */
export function deleteFilterPreset(id: string): FilterPreset[] {
  if (typeof window === 'undefined') {
    return [];
  }

  const presets = loadFilterPresets();
  const filtered = presets.filter((preset) => preset.id !== id);
  window.localStorage.setItem(PRESETS_STORAGE_KEY, JSON.stringify(filtered));
  return filtered;
}
