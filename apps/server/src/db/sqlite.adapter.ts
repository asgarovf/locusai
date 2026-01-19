/**
 * SQLite Adapter for Local Mode
 *
 * Uses Bun's built-in SQLite for local-first operation.
 * This is a wrapper around the existing SQLite logic.
 */

import { Database, type SQLQueryBindings } from "bun:sqlite";
import type { DatabaseAdapter, SqliteConfig } from "./types.js";

export class SqliteAdapter implements DatabaseAdapter {
  readonly mode = "local" as const;
  private db: Database;

  constructor(config: SqliteConfig) {
    this.db = new Database(config.dbPath);
    this.runMigrations();
  }

  /**
   * Get the raw Bun SQLite database instance.
   *
   * This method provides direct access to the underlying SQLite database
   * for backward compatibility with existing repository implementations.
   *
   * Note: Once all repositories are migrated to use the adapter methods
   * (query, queryOne, execute, transaction), this method can be removed.
   */
  getRawDb(): Database {
    return this.db;
  }

  async query<T = unknown>(sql: string, params: unknown[] = []): Promise<T[]> {
    const stmt = this.db.prepare(sql);
    return stmt.all(...(params as SQLQueryBindings[])) as T[];
  }

  async queryOne<T = unknown>(
    sql: string,
    params: unknown[] = []
  ): Promise<T | null> {
    const stmt = this.db.prepare(sql);
    const result = stmt.get(...(params as SQLQueryBindings[])) as T | undefined;
    return result ?? null;
  }

  async execute(
    sql: string,
    params: unknown[] = []
  ): Promise<{ affectedRows: number; lastInsertId?: number | string }> {
    const stmt = this.db.prepare(sql);
    const result = stmt.run(...(params as SQLQueryBindings[]));
    return {
      affectedRows: result.changes,
      lastInsertId: result.lastInsertRowid as number,
    };
  }

  async transaction<T>(fn: () => Promise<T>): Promise<T> {
    // Bun SQLite transactions are synchronous, so we wrap them
    return this.db.transaction(() => {
      // Since fn is async, we need to handle this carefully
      // For now, we'll run it synchronously within the transaction
      const promise = fn();

      // If it's a promise, we need to await it
      // But SQLite transactions are sync, so this is a limitation
      // In practice, most transaction operations are sync anyway
      if (promise instanceof Promise) {
        // This is a workaround - in production, we'd need to be careful here
        throw new Error(
          "Async operations inside SQLite transactions are not supported. Use sync operations."
        );
      }

      return promise as T;
    })();
  }

  /**
   * Synchronous transaction for backward compatibility
   */
  transactionSync<T>(fn: () => T): T {
    return this.db.transaction(fn)();
  }

  async close(): Promise<void> {
    this.db.close();
  }

  async ping(): Promise<boolean> {
    try {
      this.db.prepare("SELECT 1").get();
      return true;
    } catch {
      return false;
    }
  }

  private runMigrations(): void {
    // Create tables if they don't exist
    this.db.run(`
      CREATE TABLE IF NOT EXISTS tasks (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        projectId TEXT,
        title TEXT NOT NULL,
        description TEXT,
        status TEXT NOT NULL,
        priority TEXT NOT NULL DEFAULT 'MEDIUM',
        labels TEXT,
        assigneeRole TEXT,
        parentId INTEGER,
        lockedBy TEXT,
        lockExpiresAt INTEGER,
        acceptanceChecklist TEXT,
        sprintId INTEGER,
        createdAt INTEGER NOT NULL,
        updatedAt INTEGER NOT NULL,
        FOREIGN KEY(parentId) REFERENCES tasks(id)
      );`);

    this.db.run(`
      CREATE TABLE IF NOT EXISTS comments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        taskId INTEGER NOT NULL,
        author TEXT NOT NULL,
        text TEXT NOT NULL,
        createdAt INTEGER NOT NULL,
        FOREIGN KEY(taskId) REFERENCES tasks(id)
      );`);

    this.db.run(`
      CREATE TABLE IF NOT EXISTS artifacts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        taskId INTEGER NOT NULL,
        type TEXT NOT NULL,
        title TEXT NOT NULL,
        contentText TEXT,
        filePath TEXT,
        createdBy TEXT NOT NULL,
        createdAt INTEGER NOT NULL,
        FOREIGN KEY(taskId) REFERENCES tasks(id)
      );`);

    this.db.run(`
      CREATE TABLE IF NOT EXISTS events (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        taskId INTEGER NOT NULL,
        type TEXT NOT NULL,
        payload TEXT,
        createdAt INTEGER NOT NULL,
        FOREIGN KEY(taskId) REFERENCES tasks(id)
      );`);

    this.db.run(`
      CREATE TABLE IF NOT EXISTS sprints (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        projectId TEXT,
        name TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'PLANNED',
        startDate INTEGER,
        endDate INTEGER,
        createdAt INTEGER NOT NULL
      );`);

    this.db.run(`
      CREATE TABLE IF NOT EXISTS documents (
        id TEXT PRIMARY KEY,
        projectId TEXT,
        path TEXT NOT NULL,
        title TEXT NOT NULL,
        content TEXT NOT NULL,
        createdBy TEXT NOT NULL,
        updatedBy TEXT NOT NULL,
        createdAt INTEGER NOT NULL,
        updatedAt INTEGER NOT NULL
      );`);

    // Run column migrations for existing databases
    this.migrateColumns();
  }

  private migrateColumns(): void {
    try {
      const tableInfo = this.db.prepare("PRAGMA table_info(tasks)").all() as {
        name: string;
      }[];
      const columns = tableInfo.map((col) => col.name);

      if (!columns.includes("priority")) {
        this.db.run(
          "ALTER TABLE tasks ADD COLUMN priority TEXT NOT NULL DEFAULT 'MEDIUM'"
        );
        console.log("Migration: Added priority column to tasks table");
      }

      if (!columns.includes("parentId")) {
        this.db.run("ALTER TABLE tasks ADD COLUMN parentId INTEGER");
        console.log("Migration: Added parentId column to tasks table");
      }

      if (!columns.includes("lockedBy")) {
        this.db.run("ALTER TABLE tasks ADD COLUMN lockedBy TEXT");
        console.log("Migration: Added lockedBy column to tasks table");
      }

      if (!columns.includes("lockExpiresAt")) {
        this.db.run("ALTER TABLE tasks ADD COLUMN lockExpiresAt INTEGER");
        console.log("Migration: Added lockExpiresAt column to tasks table");
      }

      if (!columns.includes("sprintId")) {
        this.db.run("ALTER TABLE tasks ADD COLUMN sprintId INTEGER");
        console.log("Migration: Added sprintId column to tasks table");
      }

      if (!columns.includes("projectId")) {
        this.db.run("ALTER TABLE tasks ADD COLUMN projectId TEXT");
        console.log("Migration: Added projectId column to tasks table");
      }

      // Sprint migrations
      const sprintInfo = this.db
        .prepare("PRAGMA table_info(sprints)")
        .all() as { name: string }[];
      const sprintColumns = sprintInfo.map((col) => col.name);

      if (!sprintColumns.includes("projectId")) {
        this.db.run("ALTER TABLE sprints ADD COLUMN projectId TEXT");
        console.log("Migration: Added projectId column to sprints table");
      }
    } catch (err) {
      console.error("Migration error:", err);
    }
  }
}
