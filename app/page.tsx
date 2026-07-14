'use client';

import { useState, useEffect, useCallback } from 'react';
import type { Todo, Priority, CreateTodoInput } from '@/lib/db';

const PRIORITY_ORDER: Record<Priority, number> = { high: 0, medium: 1, low: 2 };

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

function PriorityBadge({ priority }: { priority: Priority }) {
  const colors: Record<Priority, string> = {
    high: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
    medium: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
    low: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  };
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${colors[priority]}`}>
      {priority}
    </span>
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
          <div className="mt-1 flex items-center gap-2">
            <PriorityBadge priority={todo.priority} />
            {todo.due_date && (
              <span className="text-sm text-gray-500 dark:text-gray-400">
                {formatDueDate(todo.due_date)}
              </span>
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
  onSave,
  onCancel,
}: {
  todo: Todo;
  onSave: (id: number, data: Partial<CreateTodoInput>) => void;
  onCancel: () => void;
}) {
  const [title, setTitle] = useState(todo.title);
  const [priority, setPriority] = useState<Priority>(todo.priority);
  const [dueDate, setDueDate] = useState(todo.due_date ?? '');

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    onSave(todo.id, {
      title: title.trim(),
      priority,
      due_date: dueDate || null,
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
              onChange={(e) => setDueDate(e.target.value)}
              className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
            />
          </div>
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

export default function HomePage() {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [title, setTitle] = useState('');
  const [priority, setPriority] = useState<Priority>('medium');
  const [dueDate, setDueDate] = useState('');
  const [error, setError] = useState('');
  const [editingTodo, setEditingTodo] = useState<Todo | null>(null);
  const [username, setUsername] = useState('');

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
      }
    }
    checkSession();
  }, [fetchTodos]);

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
    };

    setTodos((prev) => [...prev, optimisticTodo]);
    setTitle('');
    setPriority('medium');
    setDueDate('');

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
  const { overdue, pending, completed } = sectionTodos(todos, now);

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <header className="mb-8 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-800 dark:text-white">Todo App</h1>
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-600 dark:text-gray-400">{username}</span>
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
            onChange={(e) => setDueDate(e.target.value)}
            className="rounded-md border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
          />
          <button
            type="submit"
            className="rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:opacity-50"
            disabled={!title.trim()}
          >
            Add
          </button>
        </div>
      </form>

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
          onSave={handleEdit}
          onCancel={() => setEditingTodo(null)}
        />
      )}
    </div>
  );
}
