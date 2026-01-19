/**
 * Drizzle Database Connection
 *
 * Provides a unified database connection for both SQLite (local) and PostgreSQL (cloud).
 */

import { Database } from "bun:sqlite";
import {
  type BunSQLiteDatabase,
  drizzle as drizzleSqlite,
} from "drizzle-orm/bun-sqlite";
import { drizzle as drizzlePostgres } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema.js";

/**
 * Drizzle database instance type (polymorphic for SQLite/Postgres)
 * Note: We type it as SQLite because our schema types are cast to SQLite for consistency.
 */
export type DrizzleDB = BunSQLiteDatabase<typeof schema>;

/**
 * Create a SQLite database connection with Drizzle
 */
export function createSqliteDb(dbPath: string) {
  const sqlite = new Database(dbPath);

  // Enable WAL mode for better performance
  sqlite.run("PRAGMA journal_mode = WAL");

  return drizzleSqlite(sqlite, { schema });
}

/**
 * Create a PostgreSQL database connection with Drizzle
 */
export function createPostgresDb(connectionString: string) {
  const queryClient = postgres(connectionString);
  return drizzlePostgres(queryClient, { schema }) as unknown as DrizzleDB;
}

/**
 * Get the raw SQLite database instance
 * Useful for running migrations or raw queries when needed
 */
// biome-ignore lint/suspicious/noExplicitAny: Need access to internal db session
export function getRawSqlite(db: any): Database {
  return db.session.client;
}

export { schema };
