/**
 * Database Migrations
 *
 * Creates tables if they don't exist. For SQLite, we use Drizzle's push approach.
 */

import type { DrizzleDB } from "./drizzle.js";
import { getRawSqlite } from "./drizzle.js";

/**
 * Run migrations to ensure all tables exist
 */
export function runMigrations(db: DrizzleDB): void {
  const sqlite = getRawSqlite(db);

  // Users table
  sqlite.run(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      avatar_url TEXT,
      role TEXT NOT NULL DEFAULT 'USER',
      password_hash TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    )
  `);

  // Organizations table
  sqlite.run(`
    CREATE TABLE IF NOT EXISTS organizations (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      slug TEXT NOT NULL UNIQUE,
      avatar_url TEXT,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    )
  `);

  // Projects table
  sqlite.run(`
    CREATE TABLE IF NOT EXISTS projects (
      id TEXT PRIMARY KEY,
      org_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      slug TEXT NOT NULL,
      description TEXT,
      repo_url TEXT,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    )
  `);

  // Memberships table
  sqlite.run(`
    CREATE TABLE IF NOT EXISTS memberships (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      org_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
      role TEXT NOT NULL DEFAULT 'MEMBER',
      created_at INTEGER NOT NULL
    )
  `);

  // API Keys table
  sqlite.run(`
    CREATE TABLE IF NOT EXISTS api_keys (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      key_prefix TEXT NOT NULL,
      key_hash TEXT NOT NULL,
      last_used_at INTEGER,
      expires_at INTEGER,
      created_at INTEGER NOT NULL
    )
  `);

  // Sprints table
  sqlite.run(`
    CREATE TABLE IF NOT EXISTS sprints (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      project_id TEXT REFERENCES projects(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'PLANNED',
      start_date INTEGER,
      end_date INTEGER,
      created_at INTEGER NOT NULL
    )
  `);

  // Tasks table
  sqlite.run(`
    CREATE TABLE IF NOT EXISTS tasks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      project_id TEXT REFERENCES projects(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      description TEXT,
      status TEXT NOT NULL DEFAULT 'BACKLOG',
      priority TEXT NOT NULL DEFAULT 'MEDIUM',
      labels TEXT DEFAULT '[]',
      assignee_role TEXT,
      parent_id INTEGER REFERENCES tasks(id),
      sprint_id INTEGER REFERENCES sprints(id),
      locked_by TEXT,
      lock_expires_at INTEGER,
      acceptance_checklist TEXT DEFAULT '[]',
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    )
  `);

  // Comments table
  sqlite.run(`
    CREATE TABLE IF NOT EXISTS comments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      task_id INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
      author TEXT NOT NULL,
      text TEXT NOT NULL,
      created_at INTEGER NOT NULL
    )
  `);

  // Artifacts table
  sqlite.run(`
    CREATE TABLE IF NOT EXISTS artifacts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      task_id INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
      type TEXT NOT NULL,
      title TEXT NOT NULL,
      content_text TEXT,
      file_path TEXT,
      created_by TEXT NOT NULL,
      created_at INTEGER NOT NULL
    )
  `);

  // Events table
  sqlite.run(`
    CREATE TABLE IF NOT EXISTS events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      task_id INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
      type TEXT NOT NULL,
      payload TEXT,
      created_at INTEGER NOT NULL
    )
  `);

  // Documents table
  sqlite.run(`
    CREATE TABLE IF NOT EXISTS documents (
      id TEXT PRIMARY KEY,
      project_id TEXT REFERENCES projects(id) ON DELETE CASCADE,
      path TEXT NOT NULL,
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      created_by TEXT NOT NULL,
      updated_by TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    )
  `);

  // Create indexes
  sqlite.run(
    "CREATE INDEX IF NOT EXISTS idx_api_keys_key_hash ON api_keys(key_hash)"
  );
  sqlite.run(
    "CREATE INDEX IF NOT EXISTS idx_api_keys_user_id ON api_keys(user_id)"
  );
  sqlite.run(
    "CREATE INDEX IF NOT EXISTS idx_memberships_user_id ON memberships(user_id)"
  );
  sqlite.run(
    "CREATE INDEX IF NOT EXISTS idx_tasks_project_id ON tasks(project_id)"
  );
  sqlite.run("CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status)");
  sqlite.run(
    "CREATE INDEX IF NOT EXISTS idx_sprints_project_id ON sprints(project_id)"
  );
  sqlite.run(
    "CREATE INDEX IF NOT EXISTS idx_documents_project_id ON documents(project_id)"
  );

  console.log("✓ Database migrations completed");
}
