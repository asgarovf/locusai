import { Database } from "bun:sqlite";
import { join } from "node:path";

export function initDb(workspaceDir: string) {
  const db = new Database(join(workspaceDir, "db.sqlite"));

  // Create tables if they don't exist
  db.run(`
    CREATE TABLE IF NOT EXISTS tasks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
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
      createdAt INTEGER NOT NULL,
      updatedAt INTEGER NOT NULL,
      FOREIGN KEY(parentId) REFERENCES tasks(id)
    );`);

  db.run(`
    CREATE TABLE IF NOT EXISTS comments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      taskId INTEGER NOT NULL,
      author TEXT NOT NULL,
      text TEXT NOT NULL,
      createdAt INTEGER NOT NULL,
      FOREIGN KEY(taskId) REFERENCES tasks(id)
    );`);

  db.run(`
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

  db.run(`
    CREATE TABLE IF NOT EXISTS events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      taskId INTEGER NOT NULL,
      type TEXT NOT NULL,
      payload TEXT,
      createdAt INTEGER NOT NULL,
      FOREIGN KEY(taskId) REFERENCES tasks(id)
    );`);

  // Run migrations for existing tasks table columns
  try {
    const tableInfo = db.prepare("PRAGMA table_info(tasks)").all() as {
      name: string;
    }[];
    const columns = tableInfo.map((col) => col.name);

    if (!columns.includes("priority")) {
      db.run(
        "ALTER TABLE tasks ADD COLUMN priority TEXT NOT NULL DEFAULT 'MEDIUM'"
      );
      console.log("Migration: Added priority column to tasks table");
    }

    if (!columns.includes("parentId")) {
      db.run("ALTER TABLE tasks ADD COLUMN parentId INTEGER");
      console.log("Migration: Added parentId column to tasks table");
    }

    if (!columns.includes("lockedBy")) {
      db.run("ALTER TABLE tasks ADD COLUMN lockedBy TEXT");
      console.log("Migration: Added lockedBy column to tasks table");
    }

    if (!columns.includes("lockExpiresAt")) {
      db.run("ALTER TABLE tasks ADD COLUMN lockExpiresAt INTEGER");
      console.log("Migration: Added lockExpiresAt column to tasks table");
    }
  } catch (err) {
    console.error("Migration error:", err);
  }

  return db;
}
