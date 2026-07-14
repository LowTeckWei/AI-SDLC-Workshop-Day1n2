import Database from 'better-sqlite3';
import path from 'path';

export type Priority = 'high' | 'medium' | 'low';
export type RecurrencePattern = 'daily' | 'weekly' | 'monthly' | 'yearly';
export type ReminderMinutes = 15 | 30 | 60 | 120 | 1440 | 2880 | 10080;

export const REMINDER_LABELS: Record<ReminderMinutes, string> = {
  15: '15m',
  30: '30m',
  60: '1h',
  120: '2h',
  1440: '1d',
  2880: '2d',
  10080: '1w',
};

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
  last_notification_sent?: string | null;
}

interface TodoRow {
  id: number;
  user_id: number;
  title: string;
  completed: number;
  due_date: string | null;
  priority: string;
  is_recurring: number;
  recurrence_pattern: string | null;
  reminder_minutes: number | null;
  last_notification_sent: string | null;
  created_at: string;
  updated_at: string | null;
}

const DB_PATH = path.join(process.cwd(), 'todos.db');

const db = new Database(DB_PATH);

// Enable WAL mode and foreign keys
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// Create tables
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL UNIQUE,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS authenticators (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    credential_id TEXT NOT NULL UNIQUE,
    credential_public_key TEXT NOT NULL,
    counter INTEGER NOT NULL DEFAULT 0,
    transports TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS todos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    completed INTEGER NOT NULL DEFAULT 0,
    due_date TEXT,
    priority TEXT NOT NULL DEFAULT 'medium',
    is_recurring INTEGER NOT NULL DEFAULT 0,
    recurrence_pattern TEXT,
    reminder_minutes INTEGER,
    last_notification_sent TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT
  );

  CREATE INDEX IF NOT EXISTS idx_todos_user_id ON todos(user_id);
  CREATE INDEX IF NOT EXISTS idx_todos_due_date ON todos(due_date);

  CREATE TABLE IF NOT EXISTS subtasks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    todo_id INTEGER NOT NULL REFERENCES todos(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    completed INTEGER NOT NULL DEFAULT 0,
    position INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS tags (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    color TEXT NOT NULL DEFAULT '#6b7280'
  );

  CREATE TABLE IF NOT EXISTS todo_tags (
    todo_id INTEGER NOT NULL REFERENCES todos(id) ON DELETE CASCADE,
    tag_id INTEGER NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
    PRIMARY KEY (todo_id, tag_id)
  );

  CREATE TABLE IF NOT EXISTS templates (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    title TEXT NOT NULL,
    priority TEXT NOT NULL DEFAULT 'medium',
    due_date_offset_days INTEGER,
    reminder_minutes INTEGER,
    is_recurring INTEGER NOT NULL DEFAULT 0,
    recurrence_pattern TEXT,
    subtasks_json TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS holidays (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    date TEXT NOT NULL,
    year INTEGER NOT NULL
  );
`);

function rowToTodo(row: TodoRow): Todo {
  return {
    ...row,
    completed: row.completed === 1,
    is_recurring: row.is_recurring === 1,
    priority: row.priority as Priority,
    recurrence_pattern: row.recurrence_pattern as RecurrencePattern | null,
  };
}

export const userDB = {
  findByUsername(username: string): User | undefined {
    return db.prepare('SELECT * FROM users WHERE username = ?').get(username) as User | undefined;
  },

  create(username: string): User {
    const stmt = db.prepare('INSERT INTO users (username) VALUES (?)');
    const result = stmt.run(username);
    return { id: result.lastInsertRowid as number, username, created_at: new Date().toISOString() };
  },

  findById(id: number): User | undefined {
    return db.prepare('SELECT * FROM users WHERE id = ?').get(id) as User | undefined;
  },
};

export const authenticatorDB = {
  create(data: { user_id: number; credential_id: string; credential_public_key: string; counter: number; transports?: string }): Authenticator {
    const stmt = db.prepare(
      'INSERT INTO authenticators (user_id, credential_id, credential_public_key, counter, transports) VALUES (?, ?, ?, ?, ?)'
    );
    const result = stmt.run(data.user_id, data.credential_id, data.credential_public_key, data.counter, data.transports ?? null);
    return {
      id: result.lastInsertRowid as number,
      user_id: data.user_id,
      credential_id: data.credential_id,
      credential_public_key: data.credential_public_key,
      counter: data.counter,
      transports: data.transports ?? null,
      created_at: new Date().toISOString(),
    };
  },

  findByCredentialId(credentialId: string): Authenticator | undefined {
    return db.prepare('SELECT * FROM authenticators WHERE credential_id = ?').get(credentialId) as Authenticator | undefined;
  },

  findByUserId(userId: number): Authenticator[] {
    return db.prepare('SELECT * FROM authenticators WHERE user_id = ?').all(userId) as Authenticator[];
  },

  updateCounter(credentialId: string, counter: number): void {
    db.prepare('UPDATE authenticators SET counter = ? WHERE credential_id = ?').run(counter, credentialId);
  },
};

export const todoDB = {
  create(data: { user_id: number; title: string; due_date?: string | null; priority?: Priority; is_recurring?: boolean; recurrence_pattern?: RecurrencePattern | null; reminder_minutes?: number | null; tag_ids?: number[] }): Todo {
    const stmt = db.prepare(
      `INSERT INTO todos (user_id, title, due_date, priority, is_recurring, recurrence_pattern, reminder_minutes)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    );
    const result = stmt.run(
      data.user_id,
      data.title,
      data.due_date ?? null,
      data.priority ?? 'medium',
      data.is_recurring ? 1 : 0,
      data.recurrence_pattern ?? null,
      data.reminder_minutes ?? null
    );

    const todoId = result.lastInsertRowid as number;

    if (data.tag_ids && data.tag_ids.length > 0) {
      const tagStmt = db.prepare('INSERT OR IGNORE INTO todo_tags (todo_id, tag_id) VALUES (?, ?)');
      for (const tagId of data.tag_ids) {
        tagStmt.run(todoId, tagId);
      }
    }

    return this.findById(todoId)!;
  },

  findById(id: number): Todo | undefined {
    const row = db.prepare('SELECT * FROM todos WHERE id = ?').get(id) as TodoRow | undefined;
    if (!row) return undefined;

    const todo = rowToTodo(row);
    todo.subtasks = db.prepare('SELECT * FROM subtasks WHERE todo_id = ? ORDER BY position').all(id) as Subtask[];
    todo.tags = db.prepare(
      'SELECT t.* FROM tags t JOIN todo_tags tt ON t.id = tt.tag_id WHERE tt.todo_id = ?'
    ).all(id) as Tag[];

    return todo;
  },

  findAllByUser(userId: number): Todo[] {
    const rows = db.prepare('SELECT * FROM todos WHERE user_id = ?').all(userId) as TodoRow[];
    return rows.map((row) => {
      const todo = rowToTodo(row);
      todo.subtasks = db.prepare('SELECT * FROM subtasks WHERE todo_id = ? ORDER BY position').all(row.id) as Subtask[];
      todo.tags = db.prepare(
        'SELECT t.* FROM tags t JOIN todo_tags tt ON t.id = tt.tag_id WHERE tt.todo_id = ?'
      ).all(row.id) as Tag[];
      return todo;
    });
  },

  update(id: number, data: UpdateTodoInput): Todo | undefined {
    const fields: string[] = [];
    const values: unknown[] = [];

    if (data.title !== undefined) {
      fields.push('title = ?');
      values.push(data.title);
    }
    if (data.completed !== undefined) {
      fields.push('completed = ?');
      values.push(data.completed ? 1 : 0);
    }
    if (data.due_date !== undefined) {
      fields.push('due_date = ?');
      values.push(data.due_date);
    }
    if (data.priority !== undefined) {
      fields.push('priority = ?');
      values.push(data.priority);
    }
    if (data.is_recurring !== undefined) {
      fields.push('is_recurring = ?');
      values.push(data.is_recurring ? 1 : 0);
    }
    if (data.recurrence_pattern !== undefined) {
      fields.push('recurrence_pattern = ?');
      values.push(data.recurrence_pattern);
    }
    if (data.reminder_minutes !== undefined) {
      fields.push('reminder_minutes = ?');
      values.push(data.reminder_minutes);
    }
    if (data.last_notification_sent !== undefined) {
      fields.push('last_notification_sent = ?');
      values.push(data.last_notification_sent);
    }

    if (fields.length > 0) {
      fields.push("updated_at = datetime('now')");
      const sql = `UPDATE todos SET ${fields.join(', ')} WHERE id = ?`;
      values.push(id);
      db.prepare(sql).run(...values);
    }

    if (data.tag_ids !== undefined) {
      db.prepare('DELETE FROM todo_tags WHERE todo_id = ?').run(id);
      const tagStmt = db.prepare('INSERT OR IGNORE INTO todo_tags (todo_id, tag_id) VALUES (?, ?)');
      for (const tagId of data.tag_ids) {
        tagStmt.run(id, tagId);
      }
    }

    return this.findById(id);
  },

  delete(id: number): void {
    db.prepare('DELETE FROM todos WHERE id = ?').run(id);
  },
};

export const tagDB = {
  create(data: { user_id: number; name: string; color?: string }): Tag {
    const stmt = db.prepare('INSERT INTO tags (user_id, name, color) VALUES (?, ?, ?)');
    const result = stmt.run(data.user_id, data.name, data.color ?? '#6b7280');
    return { id: result.lastInsertRowid as number, user_id: data.user_id, name: data.name, color: data.color ?? '#6b7280' };
  },

  findByUser(userId: number): Tag[] {
    return db.prepare('SELECT * FROM tags WHERE user_id = ?').all(userId) as Tag[];
  },

  delete(id: number): void {
    db.prepare('DELETE FROM tags WHERE id = ?').run(id);
  },
};

export const subtaskDB = {
  create(data: { todo_id: number; title: string; position: number }): Subtask {
    const stmt = db.prepare('INSERT INTO subtasks (todo_id, title, position) VALUES (?, ?, ?)');
    const result = stmt.run(data.todo_id, data.title, data.position);
    return {
      id: result.lastInsertRowid as number,
      todo_id: data.todo_id,
      title: data.title,
      completed: false,
      position: data.position,
      created_at: new Date().toISOString(),
    };
  },

  toggleComplete(id: number, completed: boolean): void {
    db.prepare('UPDATE subtasks SET completed = ? WHERE id = ?').run(completed ? 1 : 0, id);
  },

  delete(id: number): void {
    db.prepare('DELETE FROM subtasks WHERE id = ?').run(id);
  },
};

export default db;
