import { Database } from "bun:sqlite";
import { existsSync } from "node:fs";
import { writeFile } from "node:fs/promises";
import { join } from "node:path";
import type { ProjectConfig } from "../types.js";
import { ensureDir, writeJson } from "../utils.js";

export async function initializeLocus(config: ProjectConfig) {
  console.log("Initializing Locus workspace...");
  const { projectPath, locusDir, projectName } = config;

  await ensureDir(locusDir);

  // workspace.config.json
  const workspaceConfig = {
    repoPath: projectPath,
    docsPath: join(locusDir, "docs"),
    ciPresetsPath: join(locusDir, "ci-presets.json"),
    projectName,
  };
  await writeJson(join(locusDir, "workspace.config.json"), workspaceConfig);

  // ci-presets.json
  const ciPresets = {
    quick: ["bun run lint", "bun run typecheck"],
    full: ["bun run lint", "bun run typecheck", "bun run build"],
  };
  await writeJson(join(locusDir, "ci-presets.json"), ciPresets);

  // Database
  const dbPath = join(locusDir, "db.sqlite");
  const db = new Database(dbPath);
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

  if (!existsSync(join(projectPath, "README.md"))) {
    await writeFile(
      join(projectPath, "README.md"),
      `# ${projectName}\n\nManaged by Locus.\n`
    );
  }
}

export async function logMcpConfig(config: ProjectConfig) {
  const { projectPath, projectName } = config;

  const mcpConfig = {
    mcpServers: {
      locus: {
        command: "npx",
        args: ["@locusai/cli", "mcp", "--project", projectPath],
      },
    },
  };

  console.log("\nProject created successfully!");
  console.log("\nNext steps:");
  console.log(`  cd ${projectName}`);
  console.log("  bun install");
  console.log("  npx @locusai/cli dev");
  console.log(
    "\nMCP Configuration (add to your IDE or Claude Desktop config):"
  );
  console.log(JSON.stringify(mcpConfig, null, 2));
  console.log("\n");
}
