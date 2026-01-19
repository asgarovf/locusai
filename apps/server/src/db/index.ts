/**
 * Database Module
 *
 * This module provides database connections and utilities
 * using Drizzle ORM for type-safe database operations.
 */

// Drizzle ORM exports
export {
  createSqliteDb,
  type DrizzleDB,
  getRawSqlite,
  schema,
} from "./drizzle.js";
export { runMigrations } from "./migrations.js";
export { POSTGRES_SCHEMA, PostgresAdapter } from "./postgres.adapter.js";
// Schema exports for direct access
export * from "./schema.js";
export { SqliteAdapter } from "./sqlite.adapter.js";
// Legacy adapter exports (for backward compatibility during migration)
export * from "./types.js";

import { PostgresAdapter } from "./postgres.adapter.js";
import { SqliteAdapter } from "./sqlite.adapter.js";
import type { DatabaseAdapter, DatabaseConfig } from "./types.js";

/**
 * Create a database adapter based on the configuration.
 * @deprecated Use createSqliteDb() for Drizzle ORM instead
 */
export function createDatabaseAdapter(config: DatabaseConfig): DatabaseAdapter {
  if (config.mode === "local") {
    return new SqliteAdapter(config);
  }
  return new PostgresAdapter(config);
}

/**
 * Type guard to check if adapter is SQLite
 */
export function isSqliteAdapter(
  adapter: DatabaseAdapter
): adapter is SqliteAdapter {
  return adapter.mode === "local";
}

/**
 * Type guard to check if adapter is PostgreSQL
 */
export function isPostgresAdapter(
  adapter: DatabaseAdapter
): adapter is PostgresAdapter {
  return adapter.mode === "cloud";
}
