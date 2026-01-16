import { Database } from "bun:sqlite";
import { mkdir, writeFile } from "node:fs/promises";
import { isAbsolute, join } from "node:path";
import { parseArgs } from "node:util";

const { values } = parseArgs({
  args: Bun.argv,
  options: {
    repo: { type: "string" },
    workspace: { type: "string" },
  },
  strict: true,
  allowPositionals: true,
});

if (!values.repo || !values.workspace) {
  console.error(
    "Usage: bun run workspace:init -- --repo <repoPath> --workspace <workspaceDir>"
  );
  process.exit(1);
}

const repoPath = isAbsolute(values.repo)
  ? values.repo
  : join(process.cwd(), values.repo);
const workspaceDir = isAbsolute(values.workspace)
  ? values.workspace
  : join(process.cwd(), values.workspace);

async function init() {
  console.log(`Initializing workspace at: ${workspaceDir}`);
  console.log(`Targeting product repo: ${repoPath}`);

  // Create directories
  await mkdir(workspaceDir, { recursive: true });
  await mkdir(join(workspaceDir, "artifacts"), { recursive: true });
  await mkdir(join(workspaceDir, "logs"), { recursive: true });

  const docsPath = join(repoPath, "docs");
  await mkdir(docsPath, { recursive: true });

  // workspace.config.json
  const config = {
    repoPath,
    docsPath,
    ciPresetsPath: join(workspaceDir, "ci-presets.json"),
  };
  await writeFile(
    join(workspaceDir, "workspace.config.json"),
    JSON.stringify(config, null, 2)
  );

  // ci-presets.json
  const presets = {
    quick: ["bun run lint", "bun run typecheck"],
    full: ["bun run lint", "bun run typecheck", "bun run test"],
  };
  await writeFile(
    join(workspaceDir, "ci-presets.json"),
    JSON.stringify(presets, null, 2)
  );

  // db.sqlite
  const dbPath = join(workspaceDir, "db.sqlite");
  const db = new Database(dbPath);

  db.exec(`
    CREATE TABLE IF NOT EXISTS tasks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      description TEXT,
      status TEXT NOT NULL,
      labels TEXT, -- JSON array
      assigneeRole TEXT,
      lockedBy TEXT,
      lockExpiresAt INTEGER,
      acceptanceChecklist TEXT, -- JSON array
      createdAt INTEGER NOT NULL,
      updatedAt INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS comments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      taskId INTEGER NOT NULL,
      author TEXT NOT NULL,
      text TEXT NOT NULL,
      createdAt INTEGER NOT NULL,
      FOREIGN KEY(taskId) REFERENCES tasks(id)
    );

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
    );

    CREATE TABLE IF NOT EXISTS events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      taskId INTEGER NOT NULL,
      type TEXT NOT NULL,
      payload TEXT, -- JSON object
      createdAt INTEGER NOT NULL,
      FOREIGN KEY(taskId) REFERENCES tasks(id)
    );
  `);

  console.log("Workspace initialized successfully!");
  db.close();
}

init().catch(console.error);
