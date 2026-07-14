'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { Todo, Tag, Template, Priority, RecurrencePattern, Subtask } from '@/lib/db';
import { groupTodosIntoSections } from '@/lib/todo-sort';
import {
  applyFilters,
  DEFAULT_FILTER_STATE,
  debounce,
  deleteFilterPreset,
  loadFilterPresets,
  saveFilterPreset,
  type FilterState,
  type FilterPreset,
} from '@/lib/filters';
import { useNotifications } from '@/lib/hooks/useNotifications';

const REMINDER_OPTIONS: { value: number; label: string }[] = [
  { value: 15, label: '15 minutes before' },
  { value: 30, label: '30 minutes before' },
  { value: 60, label: '1 hour before' },
  { value: 120, label: '2 hours before' },
  { value: 1440, label: '1 day before' },
  { value: 2880, label: '2 days before' },
  { value: 10080, label: '1 week before' },
];

const REMINDER_LABELS: Record<number, string> = {
  15: '15m',
  30: '30m',
  60: '1h',
  120: '2h',
  1440: '1d',
  2880: '2d',
  10080: '1w',
};

const PRIORITY_STYLES: Record<Priority, string> = {
  high: 'bg-red-500/10 text-red-500 dark:text-red-400',
  medium: 'bg-amber-500/10 text-amber-500 dark:text-amber-400',
  low: 'bg-blue-500/10 text-blue-500 dark:text-blue-400',
};

const PRIORITY_LABELS: Record<Priority, string> = { high: 'High', medium: 'Medium', low: 'Low' };

function PriorityBadge({ priority }: { priority: Priority }) {
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${PRIORITY_STYLES[priority]}`}>
      {PRIORITY_LABELS[priority]}
    </span>
  );
}

function RecurrenceBadge({ pattern }: { pattern: RecurrencePattern }) {
  return (
    <span className="rounded-full bg-purple-500/10 px-2 py-0.5 text-xs font-medium text-purple-500 dark:text-purple-400">
      🔄 {pattern}
    </span>
  );
}

function ReminderBadge({ minutes }: { minutes: number }) {
  return (
    <span className="rounded-full bg-gray-500/10 px-2 py-0.5 text-xs font-medium text-gray-600 dark:text-gray-300">
      🔔 {REMINDER_LABELS[minutes] ?? `${minutes}m`}
    </span>
  );
}

function TagBadge({ tag, onRemove }: { tag: Tag; onRemove?: () => void }) {
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium text-white"
      style={{ backgroundColor: tag.color }}
    >
      {tag.name}
      {onRemove && (
        <button type="button" onClick={onRemove} className="leading-none" aria-label={`Remove ${tag.name}`}>
          ×
        </button>
      )}
    </span>
  );
}

function SubtaskProgress({ subtasks }: { subtasks: Subtask[] }) {
  if (subtasks.length === 0) return null;
  const completedCount = subtasks.filter((s) => s.completed).length;
  const percent = Math.round((completedCount / subtasks.length) * 100);
  return (
    <div className="mt-2">
      <div className="mb-1 text-xs text-gray-500 dark:text-gray-400">
        {completedCount}/{subtasks.length} subtasks
      </div>
      <div className="h-1.5 w-full rounded-full bg-gray-200 dark:bg-gray-800">
        <div
          className={`h-1.5 rounded-full ${percent === 100 ? 'bg-green-500' : 'bg-blue-500'}`}
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}

interface NewTodoFormState {
  title: string;
  due_date: string;
  priority: Priority;
  is_recurring: boolean;
  recurrence_pattern: RecurrencePattern;
  reminder_minutes: number | '';
  tagIds: number[];
}

const EMPTY_NEW_TODO: NewTodoFormState = {
  title: '',
  due_date: '',
  priority: 'medium',
  is_recurring: false,
  recurrence_pattern: 'daily',
  reminder_minutes: '',
  tagIds: [],
};

export default function HomePage() {
  const router = useRouter();
  useNotifications();

  const [username, setUsername] = useState<string | null>(null);
  const [todos, setTodos] = useState<Todo[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [newTodo, setNewTodo] = useState<NewTodoFormState>(EMPTY_NEW_TODO);
  const [editingTodoId, setEditingTodoId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<NewTodoFormState | null>(null);
  const [subtaskDrafts, setSubtaskDrafts] = useState<Record<number, string>>({});

  const [filters, setFilters] = useState<FilterState>(DEFAULT_FILTER_STATE);
  const [searchInput, setSearchInput] = useState('');
  const [presets, setPresets] = useState<FilterPreset[]>(() => loadFilterPresets());
  const [presetName, setPresetName] = useState('');

  const [isTagsModalOpen, setIsTagsModalOpen] = useState(false);
  const [isTemplatesModalOpen, setIsTemplatesModalOpen] = useState(false);
  const [newTagName, setNewTagName] = useState('');
  const [newTagColor, setNewTagColor] = useState('#3B82F6');

  const [newTemplateName, setNewTemplateName] = useState('');
  const [newTemplateTitle, setNewTemplateTitle] = useState('');
  const [newTemplateSubtasks, setNewTemplateSubtasks] = useState<string[]>([]);
  const [newTemplateSubtaskDraft, setNewTemplateSubtaskDraft] = useState('');

  const importInputRef = useRef<HTMLInputElement>(null);

  const debouncedSetSearch = useMemo(
    () => debounce((...args: unknown[]) => setFilters((f) => ({ ...f, search: args[0] as string })), 300),
    []
  );

  useEffect(() => {
    void loadAll();
  }, []);

  async function loadAll() {
    setIsLoading(true);
    setError(null);
    try {
      const [meRes, todosRes, tagsRes, templatesRes] = await Promise.all([
        fetch('/api/auth/me'),
        fetch('/api/todos'),
        fetch('/api/tags'),
        fetch('/api/templates'),
      ]);

      if (meRes.ok) {
        const me = await meRes.json();
        setUsername(me.username);
      }
      if (todosRes.ok) {
        const { todos: fetchedTodos } = await todosRes.json();
        setTodos(fetchedTodos);
      }
      if (tagsRes.ok) {
        const { tags: fetchedTags } = await tagsRes.json();
        setTags(fetchedTags);
      }
      if (templatesRes.ok) {
        const { templates: fetchedTemplates } = await templatesRes.json();
        setTemplates(fetchedTemplates);
      }
    } catch {
      setError('Failed to load data');
    } finally {
      setIsLoading(false);
    }
  }

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
    router.refresh();
  }

  function buildTodoPayload(form: NewTodoFormState) {
    return {
      title: form.title.trim(),
      due_date: form.due_date ? form.due_date : null,
      priority: form.priority,
      is_recurring: form.is_recurring,
      recurrence_pattern: form.is_recurring ? form.recurrence_pattern : null,
      reminder_minutes: form.reminder_minutes === '' ? null : form.reminder_minutes,
    };
  }

  async function handleCreateTodo(e: React.FormEvent) {
    e.preventDefault();
    if (!newTodo.title.trim()) return;

    const response = await fetch('/api/todos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(buildTodoPayload(newTodo)),
    });
    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      setError(body.error ?? 'Failed to create todo');
      return;
    }
    const { todo } = await response.json();

    for (const tagId of newTodo.tagIds) {
      await fetch(`/api/todos/${todo.id}/tags`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tagId }),
      });
    }

    setNewTodo(EMPTY_NEW_TODO);
    void loadAll();
  }

  async function handleToggleComplete(todo: Todo) {
    setTodos((prev) =>
      prev.map((t) => (t.id === todo.id ? { ...t, completed: !t.completed } : t))
    );
    const response = await fetch(`/api/todos/${todo.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ completed: !todo.completed }),
    });
    if (!response.ok) {
      void loadAll();
      return;
    }
    void loadAll();
  }

  async function handleDeleteTodo(id: number) {
    setTodos((prev) => prev.filter((t) => t.id !== id));
    await fetch(`/api/todos/${id}`, { method: 'DELETE' });
  }

  function startEditingTodo(todo: Todo) {
    setEditingTodoId(todo.id);
    setEditForm({
      title: todo.title,
      due_date: todo.due_date ?? '',
      priority: todo.priority,
      is_recurring: todo.is_recurring,
      recurrence_pattern: todo.recurrence_pattern ?? 'daily',
      reminder_minutes: todo.reminder_minutes ?? '',
      tagIds: (todo.tags ?? []).map((t) => t.id),
    });
  }

  async function handleSaveEdit(todoId: number) {
    if (!editForm) return;
    const response = await fetch(`/api/todos/${todoId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(buildTodoPayload(editForm)),
    });
    if (response.ok) {
      setEditingTodoId(null);
      setEditForm(null);
      void loadAll();
    } else {
      const body = await response.json().catch(() => ({}));
      setError(body.error ?? 'Failed to update todo');
    }
  }

  async function handleAddSubtask(todoId: number) {
    const title = (subtaskDrafts[todoId] ?? '').trim();
    if (!title) return;
    await fetch(`/api/todos/${todoId}/subtasks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title }),
    });
    setSubtaskDrafts((prev) => ({ ...prev, [todoId]: '' }));
    void loadAll();
  }

  async function handleToggleSubtask(subtask: Subtask) {
    await fetch(`/api/subtasks/${subtask.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ completed: !subtask.completed }),
    });
    void loadAll();
  }

  async function handleDeleteSubtask(subtaskId: number) {
    await fetch(`/api/subtasks/${subtaskId}`, { method: 'DELETE' });
    void loadAll();
  }

  async function handleAttachTag(todoId: number, tagId: number) {
    await fetch(`/api/todos/${todoId}/tags`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tagId }),
    });
    void loadAll();
  }

  async function handleDetachTag(todoId: number, tagId: number) {
    await fetch(`/api/todos/${todoId}/tags`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tagId }),
    });
    void loadAll();
  }

  async function handleCreateTag(e: React.FormEvent) {
    e.preventDefault();
    if (!newTagName.trim()) return;
    const response = await fetch('/api/tags', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newTagName.trim(), color: newTagColor }),
    });
    if (response.ok) {
      setNewTagName('');
      void loadAll();
    } else {
      const body = await response.json().catch(() => ({}));
      setError(body.error ?? 'Failed to create tag');
    }
  }

  async function handleUpdateTag(id: number, input: { name?: string; color?: string }) {
    await fetch(`/api/tags/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    });
    void loadAll();
  }

  async function handleDeleteTag(id: number) {
    await fetch(`/api/tags/${id}`, { method: 'DELETE' });
    void loadAll();
  }

  async function handleUseTemplate(templateId: number) {
    await fetch(`/api/templates/${templateId}/use`, { method: 'POST' });
    void loadAll();
  }

  async function handleDeleteTemplate(id: number) {
    await fetch(`/api/templates/${id}`, { method: 'DELETE' });
    void loadAll();
  }

  function addNewTemplateSubtask() {
    const title = newTemplateSubtaskDraft.trim();
    if (!title) return;
    setNewTemplateSubtasks((prev) => [...prev, title]);
    setNewTemplateSubtaskDraft('');
  }

  function removeNewTemplateSubtask(index: number) {
    setNewTemplateSubtasks((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleCreateTemplate(e: React.FormEvent) {
    e.preventDefault();
    if (!newTemplateName.trim() || !newTemplateTitle.trim()) return;

    const subtasksJson =
      newTemplateSubtasks.length > 0
        ? JSON.stringify(newTemplateSubtasks.map((title, position) => ({ title, position })))
        : null;

    const response = await fetch('/api/templates', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: newTemplateName.trim(),
        title_template: newTemplateTitle.trim(),
        subtasks_json: subtasksJson,
      }),
    });

    if (response.ok) {
      setNewTemplateName('');
      setNewTemplateTitle('');
      setNewTemplateSubtasks([]);
      void loadAll();
    } else {
      const body = await response.json().catch(() => ({}));
      setError(body.error ?? 'Failed to create template');
    }
  }

  function handleSearchChange(value: string) {
    setSearchInput(value);
    debouncedSetSearch(value);
  }

  function handleSavePreset() {
    if (!presetName.trim()) return;
    const updated = saveFilterPreset(presetName.trim(), filters);
    setPresets(updated);
    setPresetName('');
  }

  function handleApplyPreset(preset: FilterPreset) {
    setFilters(preset.filters);
    setSearchInput(preset.filters.search);
  }

  function handleDeletePreset(id: string) {
    setPresets(deleteFilterPreset(id));
  }

  async function handleExport(format: 'json' | 'csv') {
    const response = await fetch(`/api/todos/export?format=${format}`);
    if (!response.ok) return;
    const blob = await response.blob();
    const disposition = response.headers.get('Content-Disposition') ?? '';
    const filenameMatch = disposition.match(/filename="(.+)"/);
    const filename = filenameMatch?.[1] ?? `todos.${format}`;

    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  async function handleImportFile(file: File) {
    const text = await file.text();
    let parsed: unknown;
    try {
      parsed = JSON.parse(text);
    } catch {
      setError('Import file is not valid JSON');
      return;
    }
    const response = await fetch('/api/todos/import', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(parsed),
    });
    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      setError(body.error ?? 'Import failed');
      return;
    }
    void loadAll();
  }

  const filteredTodos = useMemo(() => applyFilters(todos, filters), [todos, filters]);
  const sections = useMemo(() => groupTodosIntoSections(filteredTodos), [filteredTodos]);

  function renderTodoItem(todo: Todo) {
    const isEditing = editingTodoId === todo.id;
    const availableTags = tags.filter((tag) => !(todo.tags ?? []).some((t) => t.id === tag.id));

    if (isEditing && editForm) {
      return (
        <li key={todo.id} className="rounded-md border border-gray-200 p-3 dark:border-gray-800">
          <div className="space-y-2">
            <input
              value={editForm.title}
              onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
              className="w-full rounded-md border border-gray-300 px-2 py-1 text-sm dark:border-gray-700 dark:bg-gray-900"
            />
            <div className="flex flex-wrap gap-2">
              <input
                type="datetime-local"
                value={editForm.due_date.slice(0, 16)}
                onChange={(e) => setEditForm({ ...editForm, due_date: e.target.value })}
                className="rounded-md border border-gray-300 px-2 py-1 text-sm dark:border-gray-700 dark:bg-gray-900"
              />
              <select
                value={editForm.priority}
                onChange={(e) => setEditForm({ ...editForm, priority: e.target.value as Priority })}
                className="rounded-md border border-gray-300 px-2 py-1 text-sm dark:border-gray-700 dark:bg-gray-900"
              >
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
              <label className="flex items-center gap-1 text-sm">
                <input
                  type="checkbox"
                  checked={editForm.is_recurring}
                  onChange={(e) => setEditForm({ ...editForm, is_recurring: e.target.checked })}
                />
                Recurring
              </label>
              {editForm.is_recurring && (
                <select
                  value={editForm.recurrence_pattern}
                  onChange={(e) =>
                    setEditForm({ ...editForm, recurrence_pattern: e.target.value as RecurrencePattern })
                  }
                  className="rounded-md border border-gray-300 px-2 py-1 text-sm dark:border-gray-700 dark:bg-gray-900"
                >
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                  <option value="yearly">Yearly</option>
                </select>
              )}
              <select
                value={editForm.reminder_minutes}
                disabled={!editForm.due_date}
                onChange={(e) =>
                  setEditForm({
                    ...editForm,
                    reminder_minutes: e.target.value === '' ? '' : Number(e.target.value),
                  })
                }
                className="rounded-md border border-gray-300 px-2 py-1 text-sm disabled:opacity-50 dark:border-gray-700 dark:bg-gray-900"
              >
                <option value="">No reminder</option>
                {REMINDER_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => handleSaveEdit(todo.id)}
                className="rounded-md bg-blue-600 px-3 py-1 text-sm text-white"
              >
                Save
              </button>
              <button
                type="button"
                onClick={() => {
                  setEditingTodoId(null);
                  setEditForm(null);
                }}
                className="rounded-md border border-gray-300 px-3 py-1 text-sm dark:border-gray-700"
              >
                Cancel
              </button>
            </div>
          </div>
        </li>
      );
    }

    return (
      <li key={todo.id} className="rounded-md border border-gray-200 p-3 dark:border-gray-800">
        <div className="flex items-start gap-3">
          <input
            type="checkbox"
            checked={todo.completed}
            onChange={() => handleToggleComplete(todo)}
            className="mt-1"
          />
          <div className="flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className={todo.completed ? 'line-through text-gray-400' : ''}>{todo.title}</span>
              <PriorityBadge priority={todo.priority} />
              {todo.is_recurring && todo.recurrence_pattern && (
                <RecurrenceBadge pattern={todo.recurrence_pattern} />
              )}
              {todo.reminder_minutes != null && <ReminderBadge minutes={todo.reminder_minutes} />}
              {(todo.tags ?? []).map((tag) => (
                <TagBadge key={tag.id} tag={tag} onRemove={() => handleDetachTag(todo.id, tag.id)} />
              ))}
            </div>
            {todo.due_date && (
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">Due {todo.due_date}</p>
            )}

            <SubtaskProgress subtasks={todo.subtasks ?? []} />
            <ul className="mt-2 space-y-1">
              {(todo.subtasks ?? []).map((subtask) => (
                <li key={subtask.id} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={subtask.completed}
                    onChange={() => handleToggleSubtask(subtask)}
                  />
                  <span className={subtask.completed ? 'line-through text-gray-400' : ''}>
                    {subtask.title}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleDeleteSubtask(subtask.id)}
                    className="text-gray-400 hover:text-red-500"
                    aria-label="Delete subtask"
                  >
                    ×
                  </button>
                </li>
              ))}
            </ul>
            <div className="mt-2 flex gap-2">
              <input
                value={subtaskDrafts[todo.id] ?? ''}
                onChange={(e) => setSubtaskDrafts((prev) => ({ ...prev, [todo.id]: e.target.value }))}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddSubtask(todo.id);
                  }
                }}
                placeholder="Add subtask"
                className="flex-1 rounded-md border border-gray-300 px-2 py-1 text-xs dark:border-gray-700 dark:bg-gray-900"
              />
              <button
                type="button"
                onClick={() => handleAddSubtask(todo.id)}
                className="rounded-md border border-gray-300 px-2 py-1 text-xs dark:border-gray-700"
              >
                Add
              </button>
            </div>

            {availableTags.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1">
                {availableTags.map((tag) => (
                  <button
                    key={tag.id}
                    type="button"
                    onClick={() => handleAttachTag(todo.id, tag.id)}
                    className="rounded-full border border-dashed px-2 py-0.5 text-xs text-gray-500 dark:border-gray-700 dark:text-gray-400"
                  >
                    + {tag.name}
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => startEditingTodo(todo)}
              className="text-sm text-gray-500 hover:text-blue-500"
            >
              Edit
            </button>
            <button
              type="button"
              onClick={() => handleDeleteTodo(todo.id)}
              className="text-sm text-gray-500 hover:text-red-500"
            >
              Delete
            </button>
          </div>
        </div>
      </li>
    );
  }

  return (
    <main className="mx-auto max-w-3xl p-4">
      <header className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Todo App</h1>
        <div className="flex items-center gap-4 text-sm">
          {username && <span className="text-gray-500">{username}</span>}
          <Link href="/calendar" className="text-blue-600 hover:underline dark:text-blue-400">
            Calendar
          </Link>
          <button
            type="button"
            onClick={() => setIsTagsModalOpen(true)}
            className="text-blue-600 hover:underline dark:text-blue-400"
          >
            Manage Tags
          </button>
          <button
            type="button"
            onClick={() => setIsTemplatesModalOpen(true)}
            className="text-blue-600 hover:underline dark:text-blue-400"
          >
            Templates
          </button>
          <button type="button" onClick={handleLogout} className="text-gray-500 hover:text-red-500">
            Log out
          </button>
        </div>
      </header>

      {error && (
        <div className="mb-4 rounded-md bg-red-500/10 px-3 py-2 text-sm text-red-600 dark:text-red-400">
          {error}
        </div>
      )}

      <form onSubmit={handleCreateTodo} className="mb-6 space-y-2 rounded-md border border-gray-200 p-4 dark:border-gray-800">
        <input
          value={newTodo.title}
          onChange={(e) => setNewTodo({ ...newTodo, title: e.target.value })}
          placeholder="What needs to be done?"
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900"
        />
        <div className="flex flex-wrap gap-2">
          <input
            type="datetime-local"
            value={newTodo.due_date}
            onChange={(e) => setNewTodo({ ...newTodo, due_date: e.target.value })}
            className="rounded-md border border-gray-300 px-2 py-1 text-sm dark:border-gray-700 dark:bg-gray-900"
          />
          <select
            value={newTodo.priority}
            onChange={(e) => setNewTodo({ ...newTodo, priority: e.target.value as Priority })}
            className="rounded-md border border-gray-300 px-2 py-1 text-sm dark:border-gray-700 dark:bg-gray-900"
          >
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
          <label className="flex items-center gap-1 text-sm">
            <input
              type="checkbox"
              checked={newTodo.is_recurring}
              onChange={(e) => setNewTodo({ ...newTodo, is_recurring: e.target.checked })}
            />
            Recurring
          </label>
          {newTodo.is_recurring && (
            <select
              value={newTodo.recurrence_pattern}
              onChange={(e) =>
                setNewTodo({ ...newTodo, recurrence_pattern: e.target.value as RecurrencePattern })
              }
              className="rounded-md border border-gray-300 px-2 py-1 text-sm dark:border-gray-700 dark:bg-gray-900"
            >
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
              <option value="yearly">Yearly</option>
            </select>
          )}
          <select
            value={newTodo.reminder_minutes}
            disabled={!newTodo.due_date}
            onChange={(e) =>
              setNewTodo({
                ...newTodo,
                reminder_minutes: e.target.value === '' ? '' : Number(e.target.value),
              })
            }
            className="rounded-md border border-gray-300 px-2 py-1 text-sm disabled:opacity-50 dark:border-gray-700 dark:bg-gray-900"
          >
            <option value="">No reminder</option>
            {REMINDER_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
        {tags.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {tags.map((tag) => {
              const selected = newTodo.tagIds.includes(tag.id);
              return (
                <button
                  key={tag.id}
                  type="button"
                  onClick={() =>
                    setNewTodo((prev) => ({
                      ...prev,
                      tagIds: selected
                        ? prev.tagIds.filter((id) => id !== tag.id)
                        : [...prev.tagIds, tag.id],
                    }))
                  }
                  className="rounded-full px-2 py-0.5 text-xs font-medium text-white"
                  style={{ backgroundColor: tag.color, opacity: selected ? 1 : 0.4 }}
                >
                  {tag.name}
                </button>
              );
            })}
          </div>
        )}
        <button type="submit" className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white">
          Add Todo
        </button>
      </form>

      <div className="mb-6 space-y-2 rounded-md border border-gray-200 p-4 dark:border-gray-800">
        <div className="flex flex-wrap gap-2">
          <input
            value={searchInput}
            onChange={(e) => handleSearchChange(e.target.value)}
            placeholder="Search todos..."
            className="flex-1 rounded-md border border-gray-300 px-2 py-1 text-sm dark:border-gray-700 dark:bg-gray-900"
          />
          <select
            value={filters.priority ?? ''}
            onChange={(e) =>
              setFilters({ ...filters, priority: (e.target.value || null) as Priority | null })
            }
            className="rounded-md border border-gray-300 px-2 py-1 text-sm dark:border-gray-700 dark:bg-gray-900"
          >
            <option value="">All priorities</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
          <select
            value={filters.tagId ?? ''}
            onChange={(e) =>
              setFilters({ ...filters, tagId: e.target.value ? Number(e.target.value) : null })
            }
            className="rounded-md border border-gray-300 px-2 py-1 text-sm dark:border-gray-700 dark:bg-gray-900"
          >
            <option value="">All tags</option>
            {tags.map((tag) => (
              <option key={tag.id} value={tag.id}>
                {tag.name}
              </option>
            ))}
          </select>
          <select
            value={filters.completion}
            onChange={(e) =>
              setFilters({ ...filters, completion: e.target.value as FilterState['completion'] })
            }
            className="rounded-md border border-gray-300 px-2 py-1 text-sm dark:border-gray-700 dark:bg-gray-900"
          >
            <option value="all">All</option>
            <option value="incomplete">Incomplete</option>
            <option value="completed">Completed</option>
          </select>
          <input
            type="date"
            value={filters.dueDateFrom ?? ''}
            onChange={(e) => setFilters({ ...filters, dueDateFrom: e.target.value || null })}
            className="rounded-md border border-gray-300 px-2 py-1 text-sm dark:border-gray-700 dark:bg-gray-900"
          />
          <input
            type="date"
            value={filters.dueDateTo ?? ''}
            onChange={(e) => setFilters({ ...filters, dueDateTo: e.target.value || null })}
            className="rounded-md border border-gray-300 px-2 py-1 text-sm dark:border-gray-700 dark:bg-gray-900"
          />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <input
            value={presetName}
            onChange={(e) => setPresetName(e.target.value)}
            placeholder="Preset name"
            className="rounded-md border border-gray-300 px-2 py-1 text-xs dark:border-gray-700 dark:bg-gray-900"
          />
          <button
            type="button"
            onClick={handleSavePreset}
            className="rounded-md border border-gray-300 px-2 py-1 text-xs dark:border-gray-700"
          >
            Save preset
          </button>
          {presets.map((preset) => (
            <span key={preset.id} className="flex items-center gap-1 rounded-full border border-gray-300 px-2 py-0.5 text-xs dark:border-gray-700">
              <button type="button" onClick={() => handleApplyPreset(preset)}>
                {preset.name}
              </button>
              <button type="button" onClick={() => handleDeletePreset(preset.id)} aria-label="Delete preset">
                ×
              </button>
            </span>
          ))}
        </div>
      </div>

      <div className="mb-6 flex gap-2">
        <button
          type="button"
          onClick={() => handleExport('json')}
          className="rounded-md border border-gray-300 px-3 py-1 text-sm dark:border-gray-700"
        >
          Export JSON
        </button>
        <button
          type="button"
          onClick={() => handleExport('csv')}
          className="rounded-md border border-gray-300 px-3 py-1 text-sm dark:border-gray-700"
        >
          Export CSV
        </button>
        <button
          type="button"
          onClick={() => importInputRef.current?.click()}
          className="rounded-md border border-gray-300 px-3 py-1 text-sm dark:border-gray-700"
        >
          Import
        </button>
        <input
          ref={importInputRef}
          type="file"
          accept="application/json"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void handleImportFile(file);
            e.target.value = '';
          }}
        />
      </div>

      {isLoading ? (
        <p className="text-sm text-gray-500">Loading...</p>
      ) : (
        <div className="space-y-6">
          <section>
            <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-red-500">
              Overdue ({sections.overdue.length})
            </h2>
            <ul className="space-y-2">{sections.overdue.map(renderTodoItem)}</ul>
          </section>
          <section>
            <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-gray-500">
              Pending ({sections.pending.length})
            </h2>
            <ul className="space-y-2">{sections.pending.map(renderTodoItem)}</ul>
          </section>
          <section>
            <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-gray-500">
              Completed ({sections.completed.length})
            </h2>
            <ul className="space-y-2">{sections.completed.map(renderTodoItem)}</ul>
          </section>
        </div>
      )}

      {isTagsModalOpen && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-lg bg-white p-6 dark:bg-gray-900">
            <h2 className="mb-4 text-lg font-semibold">Manage Tags</h2>
            <form onSubmit={handleCreateTag} className="mb-4 flex gap-2">
              <input
                value={newTagName}
                onChange={(e) => setNewTagName(e.target.value)}
                placeholder="Tag name"
                className="flex-1 rounded-md border border-gray-300 px-2 py-1 text-sm dark:border-gray-700 dark:bg-gray-900"
              />
              <input
                type="color"
                value={newTagColor}
                onChange={(e) => setNewTagColor(e.target.value)}
                className="h-8 w-10"
              />
              <button type="submit" className="rounded-md bg-blue-600 px-3 py-1 text-sm text-white">
                Add
              </button>
            </form>
            <ul className="space-y-2">
              {tags.map((tag) => (
                <li key={tag.id} className="flex items-center gap-2">
                  <input
                    type="color"
                    value={tag.color}
                    onChange={(e) => handleUpdateTag(tag.id, { color: e.target.value })}
                    className="h-6 w-8"
                  />
                  <input
                    defaultValue={tag.name}
                    onBlur={(e) => {
                      if (e.target.value.trim() && e.target.value !== tag.name) {
                        handleUpdateTag(tag.id, { name: e.target.value.trim() });
                      }
                    }}
                    className="flex-1 rounded-md border border-gray-300 px-2 py-1 text-sm dark:border-gray-700 dark:bg-gray-900"
                  />
                  <button
                    type="button"
                    onClick={() => handleDeleteTag(tag.id)}
                    className="text-sm text-gray-500 hover:text-red-500"
                  >
                    Delete
                  </button>
                </li>
              ))}
            </ul>
            <button
              type="button"
              onClick={() => setIsTagsModalOpen(false)}
              className="mt-4 w-full rounded-md border border-gray-300 px-3 py-2 text-sm dark:border-gray-700"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {isTemplatesModalOpen && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-lg bg-white p-6 dark:bg-gray-900">
            <h2 className="mb-4 text-lg font-semibold">Templates</h2>
            <form onSubmit={handleCreateTemplate} className="mb-4 space-y-2 rounded-md border border-gray-200 p-3 dark:border-gray-800">
              <input
                value={newTemplateName}
                onChange={(e) => setNewTemplateName(e.target.value)}
                placeholder="Template name"
                className="w-full rounded-md border border-gray-300 px-2 py-1 text-sm dark:border-gray-700 dark:bg-gray-900"
              />
              <input
                value={newTemplateTitle}
                onChange={(e) => setNewTemplateTitle(e.target.value)}
                placeholder="Todo title"
                className="w-full rounded-md border border-gray-300 px-2 py-1 text-sm dark:border-gray-700 dark:bg-gray-900"
              />
              <div className="flex gap-2">
                <input
                  value={newTemplateSubtaskDraft}
                  onChange={(e) => setNewTemplateSubtaskDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      addNewTemplateSubtask();
                    }
                  }}
                  placeholder="Subtask title"
                  className="flex-1 rounded-md border border-gray-300 px-2 py-1 text-xs dark:border-gray-700 dark:bg-gray-900"
                />
                <button
                  type="button"
                  onClick={addNewTemplateSubtask}
                  className="rounded-md border border-gray-300 px-2 py-1 text-xs dark:border-gray-700"
                >
                  Add subtask
                </button>
              </div>
              {newTemplateSubtasks.length > 0 && (
                <ul className="space-y-1">
                  {newTemplateSubtasks.map((title, index) => (
                    <li key={index} className="flex items-center justify-between text-xs">
                      <span>{title}</span>
                      <button type="button" onClick={() => removeNewTemplateSubtask(index)} aria-label="Remove subtask">
                        ×
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              <button type="submit" className="w-full rounded-md bg-blue-600 px-3 py-1 text-sm text-white">
                Create Template
              </button>
            </form>
            <ul className="space-y-2">
              {templates.map((template) => (
                <li key={template.id} className="flex items-center justify-between gap-2 rounded-md border border-gray-200 p-2 dark:border-gray-800">
                  <div>
                    <p className="text-sm font-medium">{template.name}</p>
                    {template.description && (
                      <p className="text-xs text-gray-500">{template.description}</p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => handleUseTemplate(template.id)}
                      className="rounded-md bg-blue-600 px-2 py-1 text-xs text-white"
                    >
                      Use
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteTemplate(template.id)}
                      className="text-xs text-gray-500 hover:text-red-500"
                    >
                      Delete
                    </button>
                  </div>
                </li>
              ))}
              {templates.length === 0 && (
                <p className="text-sm text-gray-500">No templates yet.</p>
              )}
            </ul>
            <button
              type="button"
              onClick={() => setIsTemplatesModalOpen(false)}
              className="mt-4 w-full rounded-md border border-gray-300 px-3 py-2 text-sm dark:border-gray-700"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
