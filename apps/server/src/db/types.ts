/**
 * Database Adapter Types
 *
 * These types define the interface for database operations,
 * allowing us to swap between SQLite (local) and PostgreSQL (cloud).
 */

export type DatabaseMode = "local" | "cloud";

export interface QueryResult<T = unknown> {
  rows: T[];
  rowCount: number;
  lastInsertId?: number | string;
}

export type TransactionFn<T> = () => T;

/**
 * Core database adapter interface.
 * Both SQLite and PostgreSQL adapters must implement this.
 */
export interface DatabaseAdapter {
  readonly mode: DatabaseMode;

  /**
   * Execute a query that returns rows (SELECT)
   */
  query<T = unknown>(sql: string, params?: unknown[]): Promise<T[]>;

  /**
   * Execute a query that returns a single row
   */
  queryOne<T = unknown>(sql: string, params?: unknown[]): Promise<T | null>;

  /**
   * Execute a mutation (INSERT, UPDATE, DELETE)
   * Returns the number of affected rows and last insert ID if applicable
   */
  execute(
    sql: string,
    params?: unknown[]
  ): Promise<{ affectedRows: number; lastInsertId?: number | string }>;

  /**
   * Run multiple operations in a transaction
   */
  transaction<T>(fn: () => Promise<T>): Promise<T>;

  /**
   * Close the database connection
   */
  close(): Promise<void>;

  /**
   * Check if the connection is alive
   */
  ping(): Promise<boolean>;
}

/**
 * Configuration for local SQLite mode
 */
export interface SqliteConfig {
  mode: "local";
  dbPath: string;
}

/**
 * Configuration for cloud PostgreSQL mode
 */
export interface PostgresConfig {
  mode: "cloud";
  connectionString: string;
  projectId: string;
}

export type DatabaseConfig = SqliteConfig | PostgresConfig;
