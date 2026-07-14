import Database from 'better-sqlite3';
import path from 'path';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type Priority = 'high' | 'medium' | 'low';
export type RecurrencePattern = 'daily' | 'weekly' | 'monthly' | 'yearly';
export type ReminderMinutes = 15 | 30 | 60 | 120 | 1440 | 2880 | 10080; // 15m,30m,1h,2h,1d,2d,1w

export interface User {
  id: number;
  username: string;
  created_at: string;
}

export interface Authenticator {
  id: number;
  user_id: number;
  credential_id: string;
  credential_public_key: Buffer;
  counter: number;
  created_at: string;
}

export interface Session {
  userId: number;
  username: string;
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
  created_at: string;
}

export interface Template {
  id: number;
  user_id: number;
  name: string;
  description: string | null;
  category: string | null;
  title_template: string;
  priority: Priority;
  is_recurring: boolean;
  recurrence_pattern: RecurrencePattern | null;
  reminder_minutes: number | null;
  due_date_offset_minutes: number | null;
  subtasks_json: string | null;
  created_at: string;
}

export interface TemplateSubtaskSpec {
  title: string;
  position: number;
}

export interface Holiday {
  id: number;
  date: string;
  name: string;
}

// ---------------------------------------------------------------------------
// Connection & schema
// ---------------------------------------------------------------------------

declare global {
  var __todoAppDb: Database.Database | undefined;
}

function createConnection(): Database.Database {
  const dbPath = path.join(process.cwd(), 'todos.db');
  const database = new Database(dbPath);
  database.pragma('journal_mode = WAL');
  database.pragma('foreign_keys = ON');
  return database;
}

export const db: Database.Database = global.__todoAppDb ?? createConnection();
if (process.env.NODE_ENV !== 'production') {
  global.__todoAppDb = db;
}

function initSchema(): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS authenticators (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      credential_id TEXT UNIQUE NOT NULL,
      credential_public_key BLOB NOT NULL,
      counter INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_authenticators_user_id ON authenticators(user_id);

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
    CREATE INDEX IF NOT EXISTS idx_subtasks_todo_id ON subtasks(todo_id);

    CREATE TABLE IF NOT EXISTS tags (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      color TEXT NOT NULL DEFAULT '#3B82F6',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE(user_id, name)
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
      description TEXT,
      category TEXT,
      title_template TEXT NOT NULL,
      priority TEXT NOT NULL DEFAULT 'medium',
      is_recurring INTEGER NOT NULL DEFAULT 0,
      recurrence_pattern TEXT,
      reminder_minutes INTEGER,
      due_date_offset_minutes INTEGER,
      subtasks_json TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS holidays (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date TEXT NOT NULL,
      name TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE UNIQUE INDEX IF NOT EXISTS idx_holidays_date ON holidays(date);
  `);
}

initSchema();

// ---------------------------------------------------------------------------
// Row <-> domain conversion helpers
// ---------------------------------------------------------------------------

interface TodoRow {
  id: number;
  user_id: number;
  title: string;
  completed: number;
  due_date: string | null;
  priority: Priority;
  is_recurring: number;
  recurrence_pattern: RecurrencePattern | null;
  reminder_minutes: number | null;
  last_notification_sent: string | null;
  created_at: string;
  updated_at: string | null;
}

function rowToTodo(row: TodoRow): Todo {
  return {
    id: row.id,
    user_id: row.user_id,
    title: row.title,
    completed: Boolean(row.completed),
    due_date: row.due_date,
    priority: row.priority,
    is_recurring: Boolean(row.is_recurring),
    recurrence_pattern: row.recurrence_pattern,
    reminder_minutes: row.reminder_minutes,
    last_notification_sent: row.last_notification_sent,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

interface SubtaskRow {
  id: number;
  todo_id: number;
  title: string;
  completed: number;
  position: number;
  created_at: string;
}

function rowToSubtask(row: SubtaskRow): Subtask {
  return {
    id: row.id,
    todo_id: row.todo_id,
    title: row.title,
    completed: Boolean(row.completed),
    position: row.position,
    created_at: row.created_at,
  };
}

interface TemplateRow {
  id: number;
  user_id: number;
  name: string;
  description: string | null;
  category: string | null;
  title_template: string;
  priority: Priority;
  is_recurring: number;
  recurrence_pattern: RecurrencePattern | null;
  reminder_minutes: number | null;
  due_date_offset_minutes: number | null;
  subtasks_json: string | null;
  created_at: string;
}

function rowToTemplate(row: TemplateRow): Template {
  return {
    id: row.id,
    user_id: row.user_id,
    name: row.name,
    description: row.description,
    category: row.category,
    title_template: row.title_template,
    priority: row.priority,
    is_recurring: Boolean(row.is_recurring),
    recurrence_pattern: row.recurrence_pattern,
    reminder_minutes: row.reminder_minutes,
    due_date_offset_minutes: row.due_date_offset_minutes,
    subtasks_json: row.subtasks_json,
    created_at: row.created_at,
  };
}

// ---------------------------------------------------------------------------
// userDB
// ---------------------------------------------------------------------------

export const userDB = {
  findById(id: number): User | undefined {
    return db.prepare('SELECT * FROM users WHERE id = ?').get(id) as
      | User
      | undefined;
  },

  findByUsername(username: string): User | undefined {
    return db.prepare('SELECT * FROM users WHERE username = ?').get(username) as
      | User
      | undefined;
  },

  create(username: string): User {
    const result = db
      .prepare('INSERT INTO users (username) VALUES (?)')
      .run(username);
    return this.findById(result.lastInsertRowid as number)!;
  },
};

// ---------------------------------------------------------------------------
// authenticatorDB
// ---------------------------------------------------------------------------

export const authenticatorDB = {
  findByUserId(userId: number): Authenticator[] {
    return db
      .prepare('SELECT * FROM authenticators WHERE user_id = ?')
      .all(userId) as Authenticator[];
  },

  findByCredentialId(credentialId: string): Authenticator | undefined {
    return db
      .prepare('SELECT * FROM authenticators WHERE credential_id = ?')
      .get(credentialId) as Authenticator | undefined;
  },

  create(data: {
    user_id: number;
    credential_id: string;
    credential_public_key: Buffer;
    counter: number;
  }): Authenticator {
    const result = db
      .prepare(
        `INSERT INTO authenticators (user_id, credential_id, credential_public_key, counter)
         VALUES (?, ?, ?, ?)`
      )
      .run(
        data.user_id,
        data.credential_id,
        data.credential_public_key,
        data.counter ?? 0
      );
    return db
      .prepare('SELECT * FROM authenticators WHERE id = ?')
      .get(result.lastInsertRowid as number) as Authenticator;
  },

  updateCounter(id: number, counter: number): void {
    db.prepare('UPDATE authenticators SET counter = ? WHERE id = ?').run(
      counter ?? 0,
      id
    );
  },
};

// ---------------------------------------------------------------------------
// todoDB
// ---------------------------------------------------------------------------

export interface CreateTodoInput {
  title: string;
  due_date?: string | null;
  priority?: Priority;
  is_recurring?: boolean;
  recurrence_pattern?: RecurrencePattern | null;
  reminder_minutes?: number | null;
}

export interface UpdateTodoInput {
  title?: string;
  completed?: boolean;
  due_date?: string | null;
  priority?: Priority;
  is_recurring?: boolean;
  recurrence_pattern?: RecurrencePattern | null;
  reminder_minutes?: number | null;
  last_notification_sent?: string | null;
}

export const todoDB = {
  findAllByUser(userId: number): Todo[] {
    const rows = db
      .prepare('SELECT * FROM todos WHERE user_id = ?')
      .all(userId) as TodoRow[];
    return rows.map((row) => this.attachRelations(rowToTodo(row)));
  },

  findById(id: number, userId: number): Todo | undefined {
    const row = db
      .prepare('SELECT * FROM todos WHERE id = ? AND user_id = ?')
      .get(id, userId) as TodoRow | undefined;
    if (!row) return undefined;
    return this.attachRelations(rowToTodo(row));
  },

  attachRelations(todo: Todo): Todo {
    return {
      ...todo,
      subtasks: subtaskDB.findByTodoId(todo.id),
      tags: tagDB.findByTodoId(todo.id),
    };
  },

  create(userId: number, input: CreateTodoInput): Todo {
    const result = db
      .prepare(
        `INSERT INTO todos
          (user_id, title, due_date, priority, is_recurring, recurrence_pattern, reminder_minutes)
         VALUES (?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        userId,
        input.title,
        input.due_date ?? null,
        input.priority ?? 'medium',
        input.is_recurring ? 1 : 0,
        input.recurrence_pattern ?? null,
        input.reminder_minutes ?? null
      );
    return this.findById(result.lastInsertRowid as number, userId)!;
  },

  update(id: number, userId: number, input: UpdateTodoInput): Todo | undefined {
    const existing = this.findById(id, userId);
    if (!existing) return undefined;

    const merged = { ...existing, ...input };
    db.prepare(
      `UPDATE todos SET
        title = ?, completed = ?, due_date = ?, priority = ?,
        is_recurring = ?, recurrence_pattern = ?, reminder_minutes = ?,
        last_notification_sent = ?, updated_at = datetime('now')
       WHERE id = ? AND user_id = ?`
    ).run(
      merged.title,
      merged.completed ? 1 : 0,
      merged.due_date,
      merged.priority,
      merged.is_recurring ? 1 : 0,
      merged.recurrence_pattern,
      merged.reminder_minutes,
      merged.last_notification_sent,
      id,
      userId
    );
    return this.findById(id, userId);
  },

  delete(id: number, userId: number): boolean {
    const result = db
      .prepare('DELETE FROM todos WHERE id = ? AND user_id = ?')
      .run(id, userId);
    return result.changes > 0;
  },
};

// ---------------------------------------------------------------------------
// subtaskDB
// ---------------------------------------------------------------------------

export const subtaskDB = {
  findByTodoId(todoId: number): Subtask[] {
    const rows = db
      .prepare('SELECT * FROM subtasks WHERE todo_id = ? ORDER BY position ASC, id ASC')
      .all(todoId) as SubtaskRow[];
    return rows.map(rowToSubtask);
  },

  findById(id: number): Subtask | undefined {
    const row = db.prepare('SELECT * FROM subtasks WHERE id = ?').get(id) as
      | SubtaskRow
      | undefined;
    return row ? rowToSubtask(row) : undefined;
  },

  create(todoId: number, title: string): Subtask {
    const maxPositionRow = db
      .prepare('SELECT MAX(position) as maxPosition FROM subtasks WHERE todo_id = ?')
      .get(todoId) as { maxPosition: number | null };
    const nextPosition = (maxPositionRow.maxPosition ?? -1) + 1;

    const result = db
      .prepare('INSERT INTO subtasks (todo_id, title, position) VALUES (?, ?, ?)')
      .run(todoId, title, nextPosition);
    return this.findById(result.lastInsertRowid as number)!;
  },

  update(
    id: number,
    input: { title?: string; completed?: boolean }
  ): Subtask | undefined {
    const existing = this.findById(id);
    if (!existing) return undefined;
    const merged = { ...existing, ...input };
    db.prepare('UPDATE subtasks SET title = ?, completed = ? WHERE id = ?').run(
      merged.title,
      merged.completed ? 1 : 0,
      id
    );
    return this.findById(id);
  },

  delete(id: number): boolean {
    const result = db.prepare('DELETE FROM subtasks WHERE id = ?').run(id);
    return result.changes > 0;
  },
};

// ---------------------------------------------------------------------------
// tagDB
// ---------------------------------------------------------------------------

export const tagDB = {
  findAllByUser(userId: number): Tag[] {
    return db
      .prepare('SELECT * FROM tags WHERE user_id = ? ORDER BY name ASC')
      .all(userId) as Tag[];
  },

  findById(id: number): Tag | undefined {
    return db.prepare('SELECT * FROM tags WHERE id = ?').get(id) as
      | Tag
      | undefined;
  },

  findByTodoId(todoId: number): Tag[] {
    return db
      .prepare(
        `SELECT tags.* FROM tags
         JOIN todo_tags ON todo_tags.tag_id = tags.id
         WHERE todo_tags.todo_id = ?
         ORDER BY tags.name ASC`
      )
      .all(todoId) as Tag[];
  },

  findByNameCaseInsensitive(userId: number, name: string): Tag | undefined {
    return db
      .prepare(
        'SELECT * FROM tags WHERE user_id = ? AND LOWER(name) = LOWER(?)'
      )
      .get(userId, name) as Tag | undefined;
  },

  create(userId: number, name: string, color = '#3B82F6'): Tag {
    const result = db
      .prepare('INSERT INTO tags (user_id, name, color) VALUES (?, ?, ?)')
      .run(userId, name, color);
    return this.findById(result.lastInsertRowid as number)!;
  },

  findOrCreateByName(userId: number, name: string, color = '#3B82F6'): Tag {
    const existing = this.findByNameCaseInsensitive(userId, name);
    if (existing) return existing;
    return this.create(userId, name, color);
  },

  update(
    id: number,
    input: { name?: string; color?: string }
  ): Tag | undefined {
    const existing = this.findById(id);
    if (!existing) return undefined;
    const merged = { ...existing, ...input };
    db.prepare('UPDATE tags SET name = ?, color = ? WHERE id = ?').run(
      merged.name,
      merged.color,
      id
    );
    return this.findById(id);
  },

  delete(id: number): boolean {
    const result = db.prepare('DELETE FROM tags WHERE id = ?').run(id);
    return result.changes > 0;
  },

  attachToTodo(todoId: number, tagId: number): void {
    db.prepare(
      'INSERT OR IGNORE INTO todo_tags (todo_id, tag_id) VALUES (?, ?)'
    ).run(todoId, tagId);
  },

  detachFromTodo(todoId: number, tagId: number): void {
    db.prepare(
      'DELETE FROM todo_tags WHERE todo_id = ? AND tag_id = ?'
    ).run(todoId, tagId);
  },
};

// ---------------------------------------------------------------------------
// templateDB
// ---------------------------------------------------------------------------

export interface CreateTemplateInput {
  name: string;
  description?: string | null;
  category?: string | null;
  title_template: string;
  priority?: Priority;
  is_recurring?: boolean;
  recurrence_pattern?: RecurrencePattern | null;
  reminder_minutes?: number | null;
  due_date_offset_minutes?: number | null;
  subtasks_json?: string | null;
}

export type UpdateTemplateInput = Partial<CreateTemplateInput>;

export const templateDB = {
  findAllByUser(userId: number): Template[] {
    const rows = db
      .prepare('SELECT * FROM templates WHERE user_id = ? ORDER BY created_at DESC')
      .all(userId) as TemplateRow[];
    return rows.map(rowToTemplate);
  },

  findById(id: number, userId: number): Template | undefined {
    const row = db
      .prepare('SELECT * FROM templates WHERE id = ? AND user_id = ?')
      .get(id, userId) as TemplateRow | undefined;
    return row ? rowToTemplate(row) : undefined;
  },

  create(userId: number, input: CreateTemplateInput): Template {
    const result = db
      .prepare(
        `INSERT INTO templates
          (user_id, name, description, category, title_template, priority,
           is_recurring, recurrence_pattern, reminder_minutes, due_date_offset_minutes, subtasks_json)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        userId,
        input.name,
        input.description ?? null,
        input.category ?? null,
        input.title_template,
        input.priority ?? 'medium',
        input.is_recurring ? 1 : 0,
        input.recurrence_pattern ?? null,
        input.reminder_minutes ?? null,
        input.due_date_offset_minutes ?? null,
        input.subtasks_json ?? null
      );
    return this.findById(result.lastInsertRowid as number, userId)!;
  },

  update(
    id: number,
    userId: number,
    input: UpdateTemplateInput
  ): Template | undefined {
    const existing = this.findById(id, userId);
    if (!existing) return undefined;
    const merged = { ...existing, ...input };
    db.prepare(
      `UPDATE templates SET
        name = ?, description = ?, category = ?, title_template = ?, priority = ?,
        is_recurring = ?, recurrence_pattern = ?, reminder_minutes = ?,
        due_date_offset_minutes = ?, subtasks_json = ?
       WHERE id = ? AND user_id = ?`
    ).run(
      merged.name,
      merged.description,
      merged.category,
      merged.title_template,
      merged.priority,
      merged.is_recurring ? 1 : 0,
      merged.recurrence_pattern,
      merged.reminder_minutes,
      merged.due_date_offset_minutes,
      merged.subtasks_json,
      id,
      userId
    );
    return this.findById(id, userId);
  },

  delete(id: number, userId: number): boolean {
    const result = db
      .prepare('DELETE FROM templates WHERE id = ? AND user_id = ?')
      .run(id, userId);
    return result.changes > 0;
  },
};

// ---------------------------------------------------------------------------
// holidayDB
// ---------------------------------------------------------------------------

export const holidayDB = {
  findAll(): Holiday[] {
    return db.prepare('SELECT * FROM holidays ORDER BY date ASC').all() as Holiday[];
  },

  findByDateRange(startDate: string, endDate: string): Holiday[] {
    return db
      .prepare('SELECT * FROM holidays WHERE date >= ? AND date <= ? ORDER BY date ASC')
      .all(startDate, endDate) as Holiday[];
  },

  create(date: string, name: string): Holiday {
    db.prepare(
      'INSERT OR IGNORE INTO holidays (date, name) VALUES (?, ?)'
    ).run(date, name);
    return db.prepare('SELECT * FROM holidays WHERE date = ?').get(date) as Holiday;
  },
};
