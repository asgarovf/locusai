import { Database } from "bun:sqlite";
import { join } from "node:path";

export function initDb(workspaceDir: string) {
  const db = new Database(join(workspaceDir, "db.sqlite"));

  // Run migrations for existing databases
  try {
    // Check if priority column exists
    const tableInfo = db.prepare("PRAGMA table_info(tasks)").all() as {
      name: string;
    }[];
    const columns = tableInfo.map((col) => col.name);

    if (!columns.includes("priority")) {
      db.exec(
        `ALTER TABLE tasks ADD COLUMN priority TEXT NOT NULL DEFAULT 'MEDIUM'`
      );
      console.log("Migration: Added priority column to tasks table");
    }

    if (!columns.includes("parentId")) {
      db.exec(`ALTER TABLE tasks ADD COLUMN parentId INTEGER`);
      console.log("Migration: Added parentId column to tasks table");
    }
  } catch (err) {
    console.error("Migration error:", err);
  }

  return db;
}
