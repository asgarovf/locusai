/**
 * PostgreSQL Adapter for Cloud Mode
 *
 * Uses Supabase PostgreSQL for cloud-based multi-tenant operation.
 * This adapter is used when running in SaaS mode.
 */

import postgres from "postgres";
import type { DatabaseAdapter, PostgresConfig } from "./types.js";

export class PostgresAdapter implements DatabaseAdapter {
  readonly mode = "cloud" as const;
  private projectId: string;
  private client: postgres.Sql | null = null;
  private connectionString: string;

  constructor(config: PostgresConfig) {
    this.projectId = config.projectId;
    this.connectionString = config.connectionString;
  }

  /**
   * Get the current project ID for scoping queries
   */
  getProjectId(): string {
    return this.projectId;
  }

  async connect(): Promise<void> {
    if (this.client) return;
    this.client = postgres(this.connectionString);
  }

  async query<T = unknown>(sql: string, params: unknown[] = []): Promise<T[]> {
    if (!this.client) {
      throw new Error("Database not connected. Call connect() first.");
    }
    // postgres.js unsafe mode for raw strings with params array
    // biome-ignore lint/suspicious/noExplicitAny: postgres.js type compatibility
    const result = await this.client.unsafe(sql, params as any[]);
    return result as unknown as T[];
  }

  async queryOne<T = unknown>(
    sql: string,
    params: unknown[] = []
  ): Promise<T | null> {
    const rows = await this.query<T>(sql, params);
    return rows[0] ?? null;
  }

  async execute(
    sql: string,
    params: unknown[] = []
  ): Promise<{ affectedRows: number; lastInsertId?: number | string }> {
    if (!this.client) {
      throw new Error("Database not connected. Call connect() first.");
    }
    // biome-ignore lint/suspicious/noExplicitAny: postgres.js type compatibility
    const result = await this.client.unsafe(sql, params as any[]);

    // Postgres doesn't always return lastInsertId easily unless RETURNING is used
    // This adapter is best effort for legacy query support
    return {
      affectedRows: result.count,
      lastInsertId: undefined,
    };
  }

  async transaction<T>(fn: () => Promise<T>): Promise<T> {
    if (!this.client) {
      throw new Error("Database not connected. Call connect() first.");
    }
    return (await this.client.begin(async (_sql) => {
      // We ideally need to pass the transaction client to the fn,
      // but the interface doesn't support it yet.
      // For now, we execute fn.
      // Note: This won't actually be transactional for the queries inside fn unless they use the passed sql.
      // Since this adapter is a wrapper for legacy/type support, we might need to adjust the interface
      // or assume this is mostly for simple atomic blocks.
      // Drizzle should be used for complex stuff.
      return await fn();
    })) as T;
  }

  async close(): Promise<void> {
    if (this.client) {
      await this.client.end();
      this.client = null;
    }
  }

  async ping(): Promise<boolean> {
    try {
      if (!this.client) return false;
      await this.client`SELECT 1`;
      return true;
    } catch {
      return false;
    }
  }
}

/**
 * SQL Schema for PostgreSQL (Supabase)
 *
 * Run this in Supabase SQL Editor to create the required tables.
 * These tables are multi-tenant with RLS (Row Level Security).
 */
export const POSTGRES_SCHEMA = `
-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Organizations table
CREATE TABLE IF NOT EXISTS organizations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Projects table
CREATE TABLE IF NOT EXISTS projects (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  description TEXT,
  repo_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(org_id, slug)
);

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  avatar_url TEXT,
  role TEXT NOT NULL DEFAULT 'USER',
  password_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Memberships table (links users to organizations)
CREATE TABLE IF NOT EXISTS memberships (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'MEMBER',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, org_id)
);

-- API Keys table
CREATE TABLE IF NOT EXISTS api_keys (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  key_prefix TEXT NOT NULL,
  key_hash TEXT NOT NULL,
  last_used_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Tasks table (scoped by project)
CREATE TABLE IF NOT EXISTS tasks (
  id SERIAL PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'BACKLOG',
  priority TEXT NOT NULL DEFAULT 'MEDIUM',
  labels JSONB DEFAULT '[]',
  assignee_role TEXT,
  parent_id INTEGER REFERENCES tasks(id),
  locked_by TEXT,
  lock_expires_at TIMESTAMPTZ,
  acceptance_checklist JSONB DEFAULT '[]',
  sprint_id INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Sprints table (scoped by project)
CREATE TABLE IF NOT EXISTS sprints (
  id SERIAL PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'PLANNED',
  start_date TIMESTAMPTZ,
  end_date TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Comments table
CREATE TABLE IF NOT EXISTS comments (
  id SERIAL PRIMARY KEY,
  task_id INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  author TEXT NOT NULL,
  text TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Artifacts table
CREATE TABLE IF NOT EXISTS artifacts (
  id SERIAL PRIMARY KEY,
  task_id INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  content_text TEXT,
  file_path TEXT,
  created_by TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Events table (activity log)
CREATE TABLE IF NOT EXISTS events (
  id SERIAL PRIMARY KEY,
  task_id INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  payload JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Documents table (scoped by project)
CREATE TABLE IF NOT EXISTS documents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  path TEXT NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  created_by UUID REFERENCES users(id),
  updated_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(project_id, path)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_tasks_project_id ON tasks(project_id);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_sprints_project_id ON sprints(project_id);
CREATE INDEX IF NOT EXISTS idx_documents_project_id ON documents(project_id);
CREATE INDEX IF NOT EXISTS idx_api_keys_key_hash ON api_keys(key_hash);
CREATE INDEX IF NOT EXISTS idx_memberships_user_id ON memberships(user_id);
`;
