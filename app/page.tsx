'use client';

import { useState, useEffect, useCallback } from 'react';
import type { Todo, Tag, Priority, CreateTodoInput, UpdateTagInput, ReminderMinutes } from '@/lib/types';
import { PRIORITY_ORDER, REMINDER_LABELS } from '@/lib/types';
import { useNotifications } from '@/lib/hooks/useNotifications';

function sortTodos(todos: Todo[]): Todo[] {
  return [...todos].sort((a, b) => {
    if (PRIORITY_ORDER[a.priority] !== PRIORITY_ORDER[b.priority]) {
      return PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority];
    }
    const aDue = a.due_date ? new Date(a.due_date).getTime() : Infinity;
    const bDue = b.due_date ? new Date(b.due_date).getTime() : Infinity;
    if (aDue !== bDue) return aDue - bDue;
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });
}

function sectionTodos(todos: Todo[], now: Date) {
  const incomplete = todos.filter((t) => !t.completed);
  const overdue = sortTodos(
    incomplete.filter((t) => t.due_date && new Date(t.due_date) < now)
  );
  const pending = sortTodos(
    incomplete.filter((t) => !t.due_date || new Date(t.due_date) >= now)
  );
  const completed = todos
    .filter((t) => t.completed)
    .sort(
      (a, b) =>
        new Date(b.updated_at ?? b.created_at).getTime() -
        new Date(a.updated_at ?? a.created_at).getTime()
    );
  return { overdue, pending, completed };
}

function formatDueDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleString('en-SG', {
    timeZone: 'Asia/Singapore',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

const PRIORITY_STYLES: Record<Priority, string> = {
  high:   'bg-red-100 text-red-800 border-red-300 dark:bg-red-900/40 dark:text-red-300 dark:border-red-700',
  medium: 'bg-yellow-100 text-yellow-800 border-yellow-300 dark:bg-yellow-900/40 dark:text-yellow-300 dark:border-yellow-700',
  low:    'bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-900/40 dark:text-blue-300 dark:border-blue-700',
};

const PRIORITY_LABELS: Record<Priority, string> = {
  high: 'High',
  medium: 'Medium',
  low: 'Low',
};

function PriorityBadge({ priority }: { priority: Priority }) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${PRIORITY_STYLES[priority]}`}>
      {PRIORITY_LABELS[priority]}
    </span>
  );
}

function ReminderBadge({ minutes }: { minutes: ReminderMinutes }) {
  return (
    <span className="inline-flex items-center rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-800 dark:bg-blue-900 dark:text-blue-200">
      🔔 {REMINDER_LABELS[minutes]}
    </span>
  );
}

function NotificationToggle() {
  const { permission, requestPermission } = useNotifications();
  const enabled = permission === 'granted';

  return (
    <button
      onClick={requestPermission}
      disabled={enabled}
      className={`rounded-md px-3 py-1.5 text-sm ${
        enabled
          ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
          : 'bg-orange-500 text-white hover:bg-orange-600'
      }`}
    >
      {enabled ? '🔔 Notifications On' : '🔔 Enable Notifications'}
    </button>
  );
}

function TodoItem({
  todo,
  onToggle,
  onEdit,
  onDelete,
}: {
  todo: Todo;
  onToggle: (id: number, completed: boolean) => void;
  onEdit: (todo: Todo) => void;
  onDelete: (id: number) => void;
}) {
  return (
    <li className="flex items-center justify-between rounded-lg bg-white p-4 shadow-sm dark:bg-gray-800">
      <div className="flex items-start gap-3">
        <input
          type="checkbox"
          checked={todo.completed}
          onChange={(e) => onToggle(todo.id, e.target.checked)}
          className="mt-1 h-5 w-5 rounded border-gray-300 dark:border-gray-600"
          aria-label={`Mark "${todo.title}" as ${todo.completed ? 'incomplete' : 'complete'}`}
        />
        <div>
          <p className={`font-medium ${todo.completed ? 'line-through text-gray-400' : 'text-gray-800 dark:text-white'}`}>
            {todo.title}
          </p>
          <div className="mt-1 flex items-center gap-2 flex-wrap">
            <PriorityBadge priority={todo.priority} />
            {todo.due_date && (
              <span className="text-sm text-gray-500 dark:text-gray-400">
                {formatDueDate(todo.due_date)}
              </span>
            )}
            {todo.reminder_minutes != null && (
              <ReminderBadge minutes={todo.reminder_minutes as ReminderMinutes} />
            )}
            {todo.tags && todo.tags.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {todo.tags.map((tag) => (
                  <TagPill key={tag.id} tag={tag} selected />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
      <div className="flex gap-3 text-sm">
        <button onClick={() => onEdit(todo)} className="text-blue-600 hover:text-blue-800 dark:text-blue-400">
          Edit
        </button>
        <button onClick={() => onDelete(todo.id)} className="text-red-600 hover:text-red-800 dark:text-red-400">
          Delete
        </button>
      </div>
    </li>
  );
}

function EditModal({
  todo,
  tags,
  onSave,
  onCancel,
}: {
  todo: Todo;
  tags: Tag[];
  onSave: (id: number, data: Partial<CreateTodoInput>) => void;
  onCancel: () => void;
}) {
  const [title, setTitle] = useState(todo.title);
  const [priority, setPriority] = useState<Priority>(todo.priority);
  const [dueDate, setDueDate] = useState(todo.due_date ?? '');
  const [reminderMinutes, setReminderMinutes] = useState<number | null>(todo.reminder_minutes ?? null);
  const [editTagIds, setEditTagIds] = useState<number[]>(todo.tags?.map((t) => t.id) ?? []);

  function toggleTag(tag: Tag) {
    setEditTagIds((prev) =>
      prev.includes(tag.id) ? prev.filter((id) => id !== tag.id) : [...prev, tag.id]
    );
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    onSave(todo.id, {
      title: title.trim(),
      priority,
      due_date: dueDate || null,
      reminder_minutes: dueDate ? reminderMinutes : null,
      tag_ids: editTagIds,
    });
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={onCancel}
      onKeyDown={(e) => e.key === 'Escape' && onCancel()}
    >
      <div
        className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl dark:bg-gray-800"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="mb-4 text-lg font-semibold text-gray-800 dark:text-white">Edit Todo</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
              autoFocus
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Priority</label>
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value as Priority)}
              className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
            >
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Due Date</label>
            <input
              type="datetime-local"
              value={dueDate}
              onChange={(e) => {
                setDueDate(e.target.value);
                if (!e.target.value) setReminderMinutes(null);
              }}
              className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Reminder</label>
            <select
              value={reminderMinutes ?? ''}
              disabled={!dueDate}
              onChange={(e) => setReminderMinutes(e.target.value ? (Number(e.target.value) as ReminderMinutes) : null)}
              className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-700 dark:text-white disabled:opacity-50"
            >
              <option value="">None</option>
              <option value={15}>15 minutes before</option>
              <option value={30}>30 minutes before</option>
              <option value={60}>1 hour before</option>
              <option value={120}>2 hours before</option>
              <option value={1440}>1 day before</option>
              <option value={2880}>2 days before</option>
              <option value={10080}>1 week before</option>
            </select>
          </div>
          {tags.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Tags</label>
              <div className="flex flex-wrap gap-2">
                {tags.map((tag) => (
                  <TagPill
                    key={tag.id}
                    tag={tag}
                    selected={editTagIds.includes(tag.id)}
                    onClick={toggleTag}
                  />
                ))}
              </div>
            </div>
          )}
          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={onCancel}
              className="rounded-md px-4 py-2 text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!title.trim()}
              className="rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:opacity-50"
            >
              Update
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function TagPill({
  tag,
  selected = false,
  onClick,
}: {
  tag: Tag;
  selected?: boolean;
  onClick?: (tag: Tag) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onClick?.(tag)}
      style={selected ? { backgroundColor: tag.color, borderColor: tag.color } : { borderColor: tag.color }}
      className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium border transition-colors ${
        selected
          ? 'text-white'
          : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200'
      }`}
    >
      {selected && <span aria-hidden>✓</span>}
      <span className="truncate max-w-[10rem]">{tag.name}</span>
    </button>
  );
}

function ManageTagsModal({
  tags,
  onClose,
  onCreate,
  onUpdate,
  onDelete,
}: {
  tags: Tag[];
  onClose: () => void;
  onCreate: (name: string, color: string) => Promise<void>;
  onUpdate: (id: number, input: UpdateTagInput) => Promise<void>;
  onDelete: (id: number) => Promise<void>;
}) {
  const [name, setName] = useState('');
  const [color, setColor] = useState('#3B82F6');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editName, setEditName] = useState('');
  const [editColor, setEditColor] = useState('');
  const [tagError, setTagError] = useState('');

  function startEdit(tag: Tag) {
    setEditingId(tag.id);
    setEditName(tag.name);
    setEditColor(tag.color);
    setTagError('');
  }

  async function handleCreate() {
    const trimmed = name.trim();
    if (!trimmed) return;
    setTagError('');
    try {
      await onCreate(trimmed, color);
      setName('');
      setColor('#3B82F6');
    } catch (err) {
      setTagError(err instanceof Error ? err.message : 'Failed to create tag');
    }
  }

  async function handleUpdate(id: number) {
    setTagError('');
    try {
      await onUpdate(id, { name: editName.trim(), color: editColor });
      setEditingId(null);
    } catch (err) {
      setTagError(err instanceof Error ? err.message : 'Failed to update tag');
    }
  }

  async function handleDelete(id: number) {
    if (!confirm('Delete this tag? It will be removed from all todos.')) return;
    setTagError('');
    try {
      await onDelete(id);
    } catch (err) {
      setTagError(err instanceof Error ? err.message : 'Failed to delete tag');
    }
  }

  return (
    <div
      className="fixed inset-0 bg-black/40 flex items-center justify-center z-50"
      onClick={onClose}
      onKeyDown={(e) => e.key === 'Escape' && onClose()}
    >
      <div
        className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">Manage Tags</h2>

        {tagError && (
          <p className="mb-3 text-sm text-red-600 dark:text-red-400">{tagError}</p>
        )}

        <ul className="space-y-2 mb-4 max-h-64 overflow-y-auto">
          {tags.length === 0 && (
            <li className="text-sm text-gray-400 dark:text-gray-500">No tags yet.</li>
          )}
          {tags.map((tag) =>
            editingId === tag.id ? (
              <li key={tag.id} className="flex items-center gap-2">
                <input
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="flex-1 border rounded px-2 py-1 text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                />
                <input
                  type="color"
                  value={editColor}
                  onChange={(e) => setEditColor(e.target.value)}
                  className="h-8 w-8 rounded cursor-pointer"
                />
                <button
                  onClick={() => handleUpdate(tag.id)}
                  className="text-sm text-blue-600 dark:text-blue-400 font-medium"
                >
                  Save
                </button>
                <button
                  onClick={() => setEditingId(null)}
                  className="text-sm text-gray-500 dark:text-gray-400"
                >
                  Cancel
                </button>
              </li>
            ) : (
              <li key={tag.id} className="flex items-center justify-between gap-2">
                <TagPill tag={tag} selected />
                <div className="flex gap-3 text-sm">
                  <button
                    onClick={() => startEdit(tag)}
                    className="text-blue-600 dark:text-blue-400"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(tag.id)}
                    className="text-red-600 dark:text-red-400"
                  >
                    Delete
                  </button>
                </div>
              </li>
            )
          )}
        </ul>

        <div className="flex gap-2">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
            placeholder="Tag name"
            className="flex-1 border rounded px-2 py-1 text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
          />
          <input
            type="color"
            value={color}
            onChange={(e) => setColor(e.target.value)}
            className="h-8 w-8 rounded cursor-pointer"
          />
          <button
            onClick={handleCreate}
            disabled={!name.trim()}
            className="bg-blue-600 text-white rounded px-3 py-1 text-sm disabled:opacity-50"
          >
            Create Tag
          </button>
        </div>

        <button
          onClick={onClose}
          className="mt-4 text-sm text-gray-500 dark:text-gray-400 hover:underline"
        >
          Close
        </button>
      </div>
    </div>
  );
}

export default function HomePage() {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [title, setTitle] = useState('');
  const [priority, setPriority] = useState<Priority>('medium');
  const [dueDate, setDueDate] = useState('');
  const [reminderMinutes, setReminderMinutes] = useState<number | null>(null);
  const [error, setError] = useState('');
  const [editingTodo, setEditingTodo] = useState<Todo | null>(null);
  const [username, setUsername] = useState('');
  const [tags, setTags] = useState<Tag[]>([]);
  const [selectedTagIds, setSelectedTagIds] = useState<number[]>([]);
  const [showManageTags, setShowManageTags] = useState(false);
  const [activeTagFilter, setActiveTagFilter] = useState<number | null>(null);
  const [priorityFilter, setPriorityFilter] = useState<Priority | 'all'>('all');

  const fetchTags = useCallback(async () => {
    try {
      const res = await fetch('/api/tags');
      if (res.ok) {
        const data = await res.json();
        setTags(data);
      }
    } catch {
      // non-fatal
    }
  }, []);

  const fetchTodos = useCallback(async () => {
    try {
      const res = await fetch('/api/todos');
      if (res.ok) {
        const data = await res.json();
        setTodos(data);
      }
    } catch {
      setError('Failed to fetch todos');
    }
  }, []);

  useEffect(() => {
    async function checkSession() {
      const res = await fetch('/api/auth/session');
      if (res.ok) {
        const data = await res.json();
        setUsername(data.username);
        fetchTodos();
        fetchTags();
      }
    }
    checkSession();
  }, [fetchTodos, fetchTags]);

  async function handleCreateTag(name: string, color: string) {
    const res = await fetch('/api/tags', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, color }),
    });
    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || 'Failed to create tag');
    }
    await fetchTags();
  }

  async function handleUpdateTag(id: number, input: UpdateTagInput) {
    const res = await fetch(`/api/tags/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    });
    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || 'Failed to update tag');
    }
    await fetchTags();
    await fetchTodos();
  }

  async function handleDeleteTag(id: number) {
    const res = await fetch(`/api/tags/${id}`, { method: 'DELETE' });
    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || 'Failed to delete tag');
    }
    // Reset active filter if the deleted tag was the current filter
    if (activeTagFilter === id) setActiveTagFilter(null);
    await fetchTags();
    await fetchTodos();
  }

  function toggleTagSelection(tag: Tag) {
    setSelectedTagIds((prev) =>
      prev.includes(tag.id) ? prev.filter((id) => id !== tag.id) : [...prev, tag.id]
    );
  }

  async function handleAddTodo(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      setError('Title is required');
      return;
    }

    if (dueDate) {
      const due = new Date(dueDate);
      const now = new Date();
      if (due.getTime() - now.getTime() < 60_000) {
        setError('Due date must be at least 1 minute in the future');
        return;
      }
    }

    const input: CreateTodoInput = {
      title: trimmedTitle,
      priority,
      due_date: dueDate || null,
      reminder_minutes: dueDate ? reminderMinutes : null,
      tag_ids: selectedTagIds,
    };

    const optimisticTodo: Todo = {
      id: -Date.now(),
      user_id: 0,
      completed: false,
      created_at: new Date().toISOString(),
      updated_at: null,
      last_notification_sent: null,
      is_recurring: false,
      recurrence_pattern: null,
      reminder_minutes: null,
      ...input,
      due_date: input.due_date ?? null,
      priority: input.priority ?? 'medium',
      title: trimmedTitle,
      tags: tags.filter((t) => selectedTagIds.includes(t.id)),
    };

    setTodos((prev) => [...prev, optimisticTodo]);
    setTitle('');
    setPriority('medium');
    setDueDate('');
    setReminderMinutes(null);
    setSelectedTagIds([]);

    try {
      const res = await fetch('/api/todos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to create todo');
      }
      const saved: Todo = await res.json();
      setTodos((prev) => prev.map((t) => (t.id === optimisticTodo.id ? saved : t)));
    } catch (err) {
      setTodos((prev) => prev.filter((t) => t.id !== optimisticTodo.id));
      setError(err instanceof Error ? err.message : 'Could not create todo. Please try again.');
    }
  }

  async function handleToggle(id: number, completed: boolean) {
    setTodos((prev) =>
      prev.map((t) => (t.id === id ? { ...t, completed, updated_at: new Date().toISOString() } : t))
    );

    try {
      const res = await fetch(`/api/todos/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ completed }),
      });
      if (!res.ok) throw new Error('Failed to update');
      const updated = await res.json();
      setTodos((prev) => prev.map((t) => (t.id === id ? updated : t)));
    } catch {
      setTodos((prev) =>
        prev.map((t) => (t.id === id ? { ...t, completed: !completed } : t))
      );
      setError('Failed to update todo');
    }
  }

  async function handleEdit(id: number, data: Partial<CreateTodoInput>) {
    setEditingTodo(null);

    setTodos((prev) =>
      prev.map((t) => (t.id === id ? { ...t, ...data, updated_at: new Date().toISOString() } as Todo : t))
    );

    try {
      const res = await fetch(`/api/todos/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error('Failed to update');
      const updated = await res.json();
      setTodos((prev) => prev.map((t) => (t.id === id ? updated : t)));
    } catch {
      fetchTodos();
      setError('Failed to update todo');
    }
  }

  async function handleDelete(id: number) {
    const original = todos;
    setTodos((prev) => prev.filter((t) => t.id !== id));

    try {
      const res = await fetch(`/api/todos/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete');
    } catch {
      setTodos(original);
      setError('Failed to delete todo');
    }
  }

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    window.location.href = '/login';
  }

  const now = new Date();
  const filteredTodos = todos.filter((t) => {
    if (activeTagFilter && !t.tags?.some((tag) => tag.id === activeTagFilter)) return false;
    if (priorityFilter !== 'all' && t.priority !== priorityFilter) return false;
    return true;
  });
  const { overdue, pending, completed } = sectionTodos(filteredTodos, now);

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <header className="mb-8 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-800 dark:text-white">Todo App</h1>
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-600 dark:text-gray-400">{username}</span>
          <NotificationToggle />
          <button
            onClick={handleLogout}
            className="rounded-md bg-gray-200 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-300"
          >
            Logout
          </button>
        </div>
      </header>

      {error && (
        <div className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-700 dark:bg-red-900/50 dark:text-red-200">
          {error}
          <button onClick={() => setError('')} className="ml-2 font-medium underline">
            Dismiss
          </button>
        </div>
      )}

      <form onSubmit={handleAddTodo} className="mb-8 rounded-lg bg-white p-4 shadow-sm dark:bg-gray-800">
        <div className="flex flex-col gap-3 sm:flex-row">
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="What needs to be done?"
            className="flex-1 rounded-md border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
          />
          <select
            value={priority}
            onChange={(e) => setPriority(e.target.value as Priority)}
            className="rounded-md border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
          >
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
          <input
            type="datetime-local"
            value={dueDate}
            onChange={(e) => {
              setDueDate(e.target.value);
              if (!e.target.value) setReminderMinutes(null);
            }}
            className="rounded-md border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
          />
          <select
            value={reminderMinutes ?? ''}
            disabled={!dueDate}
            onChange={(e) => setReminderMinutes(e.target.value ? (Number(e.target.value) as ReminderMinutes) : null)}
            className="rounded-md border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-700 dark:text-white disabled:opacity-50"
          >
            <option value="">No reminder</option>
            <option value={15}>15 min before</option>
            <option value={30}>30 min before</option>
            <option value={60}>1 hour before</option>
            <option value={120}>2 hours before</option>
            <option value={1440}>1 day before</option>
            <option value={2880}>2 days before</option>
            <option value={10080}>1 week before</option>
          </select>
          <button
            type="submit"
            className="rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:opacity-50"
            disabled={!title.trim()}
          >
            Add
          </button>
        </div>
        {tags.length > 0 && (
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <span className="text-sm text-gray-500 dark:text-gray-400">Tags:</span>
            {tags.map((tag) => (
              <TagPill
                key={tag.id}
                tag={tag}
                selected={selectedTagIds.includes(tag.id)}
                onClick={toggleTagSelection}
              />
            ))}
          </div>
        )}
        <div className="mt-3">
          <button
            type="button"
            onClick={() => setShowManageTags(true)}
            className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
          >
            + Manage Tags
          </button>
        </div>
      </form>

      <div className="mb-6 flex items-center gap-3">
        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Filter:</label>
        <select
          value={priorityFilter}
          onChange={(e) => setPriorityFilter(e.target.value as Priority | 'all')}
          className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white"
        >
          <option value="all">All Priorities</option>
          <option value="high">High Priority</option>
          <option value="medium">Medium Priority</option>
          <option value="low">Low Priority</option>
        </select>
      </div>

      {/* Tag filter bar */}
      {tags.length > 0 && (
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Tags:</span>
          <button
            onClick={() => setActiveTagFilter(null)}
            className={`rounded-full px-3 py-1 text-xs font-medium border transition-colors ${
              activeTagFilter === null
                ? 'bg-gray-700 text-white border-gray-700 dark:bg-gray-200 dark:text-gray-800'
                : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 border-gray-300 dark:border-gray-600'
            }`}
          >
            All Tags
          </button>
          {tags.map((tag) => (
            <TagPill
              key={tag.id}
              tag={tag}
              selected={activeTagFilter === tag.id}
              onClick={(t) => setActiveTagFilter(activeTagFilter === t.id ? null : t.id)}
            />
          ))}
        </div>
      )}

      {overdue.length > 0 && (
        <section className="mb-6">
          <h2 className="mb-3 text-lg font-semibold text-red-600 dark:text-red-400">
            Overdue ({overdue.length})
          </h2>
          <ul className="space-y-2">
            {overdue.map((todo) => (
              <TodoItem
                key={todo.id}
                todo={todo}
                onToggle={handleToggle}
                onEdit={setEditingTodo}
                onDelete={handleDelete}
              />
            ))}
          </ul>
        </section>
      )}

      <section className="mb-6">
        <h2 className="mb-3 text-lg font-semibold text-gray-600 dark:text-gray-400">
          Pending ({pending.length})
        </h2>
        <ul className="space-y-2">
          {pending.length === 0 ? (
            <li className="py-8 text-center text-gray-400">No pending todos. Add one above!</li>
          ) : (
            pending.map((todo) => (
              <TodoItem
                key={todo.id}
                todo={todo}
                onToggle={handleToggle}
                onEdit={setEditingTodo}
                onDelete={handleDelete}
              />
            ))
          )}
        </ul>
      </section>

      {completed.length > 0 && (
        <section className="mb-6">
          <h2 className="mb-3 text-lg font-semibold text-gray-400 dark:text-gray-500">
            Completed ({completed.length})
          </h2>
          <ul className="space-y-2">
            {completed.map((todo) => (
              <TodoItem
                key={todo.id}
                todo={todo}
                onToggle={handleToggle}
                onEdit={setEditingTodo}
                onDelete={handleDelete}
              />
            ))}
          </ul>
        </section>
      )}

      {editingTodo && (
        <EditModal
          todo={editingTodo}
          tags={tags}
          onSave={handleEdit}
          onCancel={() => setEditingTodo(null)}
        />
      )}

      {showManageTags && (
        <ManageTagsModal
          tags={tags}
          onClose={() => setShowManageTags(false)}
          onCreate={handleCreateTag}
          onUpdate={handleUpdateTag}
          onDelete={handleDeleteTag}
        />
      )}
    </div>
  );
}
