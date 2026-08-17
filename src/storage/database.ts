import Database from 'better-sqlite3';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';

export type SqliteDatabase = Database.Database;

export function openDatabase(filename = process.env.TASKS_OPS_DB ?? './data/tasks-ops.sqlite'): SqliteDatabase {
  if (filename !== ':memory:') mkdirSync(dirname(filename), { recursive: true });

  const db = new Database(filename);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  db.exec(`
    CREATE TABLE IF NOT EXISTS tasks (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      body TEXT,
      status TEXT NOT NULL,
      priority TEXT,
      due_date TEXT,
      tags_json TEXT NOT NULL DEFAULT '[]',
      assigned_to TEXT,
      waiting_on TEXT,
      waiting_since TEXT,
      parent_task_id TEXT,
      parent_task_title TEXT,
      relation_type TEXT,
      workspace_id TEXT,
      workspace_name TEXT,
      container_id TEXT,
      container_name TEXT,
      source_note_id TEXT,
      source_note_title TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      completed_at TEXT,
      revision INTEGER NOT NULL DEFAULT 1
    );

    CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
    CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON tasks(due_date);
    CREATE INDEX IF NOT EXISTS idx_tasks_container_id ON tasks(container_id);
    CREATE INDEX IF NOT EXISTS idx_tasks_waiting_on ON tasks(waiting_on);
    CREATE INDEX IF NOT EXISTS idx_tasks_parent_task_id ON tasks(parent_task_id);

    CREATE TABLE IF NOT EXISTS task_activity (
      id TEXT PRIMARY KEY,
      task_id TEXT NOT NULL,
      type TEXT NOT NULL,
      actor TEXT,
      timestamp TEXT NOT NULL,
      from_status TEXT,
      to_status TEXT,
      message TEXT,
      metadata_json TEXT,
      FOREIGN KEY(task_id) REFERENCES tasks(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_task_activity_task_time
      ON task_activity(task_id, timestamp DESC);
  `);

  return db;
}
