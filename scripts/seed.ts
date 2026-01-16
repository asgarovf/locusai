import { Database } from "bun:sqlite";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { parseArgs } from "node:util";
import { TaskStatus } from "@locus/shared";

const { values } = parseArgs({
  args: Bun.argv,
  options: {
    project: { type: "string" },
  },
  strict: true,
  allowPositionals: true,
});

if (!values.project) {
  console.error("Usage: bun run scripts/seed.ts -- --project <workspaceDir>");
  process.exit(1);
}

const workspaceDir = values.project;
const dbPath = join(workspaceDir, "db.sqlite");
const db = new Database(dbPath);

const config = JSON.parse(
  readFileSync(join(workspaceDir, "workspace.config.json"), "utf-8")
);

// Create a sample doc
mkdirSync(config.docsPath, { recursive: true });
writeFileSync(
  join(config.docsPath, "architecture.md"),
  "# Locus Architecture\n\nLocal-first, monorepo, MCP-integrated tool."
);

// Insert sample tasks
const now = Date.now();
const insertTask = db.prepare(`
  INSERT INTO tasks (title, description, status, labels, acceptanceChecklist, createdAt, updatedAt)
  VALUES (?, ?, ?, ?, ?, ?, ?)
`);

insertTask.run(
  "Setup project structure",
  "Initialize monorepo and workspaces",
  TaskStatus.DONE,
  JSON.stringify(["setup"]),
  "[]",
  now,
  now
);
insertTask.run(
  "Implement CI Runner",
  "Add support for safe command execution",
  TaskStatus.IN_PROGRESS,
  JSON.stringify(["backend"]),
  "[]",
  now,
  now
);
insertTask.run(
  "Design Kanban UI",
  "Create responsive board columns",
  TaskStatus.BACKLOG,
  JSON.stringify(["frontend"]),
  "[]",
  now,
  now
);

console.log("Seed data created successfully!");
db.close();
