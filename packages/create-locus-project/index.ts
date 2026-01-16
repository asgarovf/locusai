#!/usr/bin/env bun
import { Database } from "bun:sqlite";
import { mkdir, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { isAbsolute, join, resolve } from "node:path";
import { parseArgs } from "node:util";

const { values } = parseArgs({
  args: Bun.argv,
  options: {
    name: { type: "string" },
    path: { type: "string" },
  },
  strict: true,
  allowPositionals: true,
});

if (!values.name) {
  console.error(
    "Usage: bun create locus-project --name <project-name> [--path <directory>]"
  );
  console.error("\nExample: bun create locus-project --name my-app");
  process.exit(1);
}

const projectName = values.name;

// Resolve path properly, handling ~ and relative paths
let basePath = process.cwd();
if (values.path) {
  const userPath = values.path.startsWith("~")
    ? join(homedir(), values.path.slice(1))
    : values.path;
  basePath = isAbsolute(userPath) ? userPath : resolve(process.cwd(), userPath);
}
const projectPath = join(basePath, projectName);
const locusDir = join(projectPath, ".locus");

async function createProject() {
  console.log(`🚀 Creating Locus project: ${projectName}`);
  console.log(`📁 Location: ${projectPath}\n`);

  // Create project structure
  console.log("📦 Setting up monorepo structure...");
  await mkdir(join(projectPath, "apps", "web"), { recursive: true });
  await mkdir(join(projectPath, "apps", "server"), { recursive: true });
  await mkdir(join(projectPath, "packages", "shared"), { recursive: true });
  await mkdir(join(projectPath, "docs"), { recursive: true });

  // Create Locus workspace
  console.log("🎯 Initializing Locus workspace...");
  await mkdir(join(locusDir, "artifacts"), { recursive: true });
  await mkdir(join(locusDir, "logs"), { recursive: true });

  // Root package.json
  const rootPackageJson = {
    name: projectName,
    version: "0.1.0",
    private: true,
    workspaces: ["apps/*", "packages/*"],
    scripts: {
      dev: "bun run --filter web dev",
      "dev:server": "bun run --filter server dev",
      build: "bun run --filter web build",
      lint: "biome lint .",
      format: "biome format --write .",
      typecheck: "tsc -b",
    },
    devDependencies: {
      "@biomejs/biome": "^2.3.0",
      typescript: "^5.8.0",
      "@types/bun": "^1.3.0",
    },
  };
  await writeFile(
    join(projectPath, "package.json"),
    JSON.stringify(rootPackageJson, null, 2)
  );

  // Web app package.json
  const webPackageJson = {
    name: "web",
    version: "0.1.0",
    private: true,
    scripts: {
      dev: "vite",
      build: "vite build",
      preview: "vite preview",
    },
    dependencies: {
      react: "^18.3.0",
      "react-dom": "^18.3.0",
    },
    devDependencies: {
      "@vitejs/plugin-react": "^4.3.0",
      vite: "^6.0.0",
      "@types/react": "^18.3.0",
      "@types/react-dom": "^18.3.0",
    },
  };
  await writeFile(
    join(projectPath, "apps/web/package.json"),
    JSON.stringify(webPackageJson, null, 2)
  );

  // Server package.json
  const serverPackageJson = {
    name: "server",
    version: "0.1.0",
    private: true,
    scripts: {
      dev: "bun run --watch src/index.ts",
    },
    dependencies: {
      express: "^4.19.0",
    },
    devDependencies: {
      "@types/express": "^4.17.0",
    },
  };
  await writeFile(
    join(projectPath, "apps/server/package.json"),
    JSON.stringify(serverPackageJson, null, 2)
  );

  // Shared package.json
  const sharedPackageJson = {
    name: "shared",
    version: "0.1.0",
    private: true,
    main: "./src/index.ts",
    types: "./src/index.ts",
  };
  await writeFile(
    join(projectPath, "packages/shared/package.json"),
    JSON.stringify(sharedPackageJson, null, 2)
  );

  // TypeScript config
  const tsConfig = {
    compilerOptions: {
      target: "ES2022",
      module: "ESNext",
      lib: ["ES2022"],
      moduleResolution: "bundler",
      jsx: "react-jsx",
      strict: true,
      esModuleInterop: true,
      skipLibCheck: true,
      forceConsistentCasingInFileNames: true,
      resolveJsonModule: true,
      isolatedModules: true,
      noEmit: true,
    },
  };
  await writeFile(
    join(projectPath, "tsconfig.json"),
    JSON.stringify(tsConfig, null, 2)
  );

  // Biome config
  const biomeConfig = {
    $schema: "https://biomejs.dev/schemas/1.9.4/schema.json",
    vcs: {
      enabled: true,
      clientKind: "git",
      useIgnoreFile: true,
    },
    files: {
      ignoreUnknown: false,
      ignore: ["node_modules", "dist", ".locus"],
    },
    formatter: {
      enabled: true,
      indentStyle: "space",
      indentWidth: 2,
    },
    linter: {
      enabled: true,
      rules: {
        recommended: true,
      },
    },
  };
  await writeFile(
    join(projectPath, "biome.json"),
    JSON.stringify(biomeConfig, null, 2)
  );

  // .gitignore
  const gitignore = `node_modules
dist
.locus/db.sqlite
.locus/logs
.locus/artifacts
.DS_Store
*.log
.env
`;
  await writeFile(join(projectPath, ".gitignore"), gitignore);

  // README
  const readme = `# ${projectName}

A modern monorepo project managed by [Locus](https://github.com/yourusername/locus).

## 🚀 Getting Started

\`\`\`bash
# Install dependencies
bun install

# Start development server
bun run dev
\`\`\`

## 📁 Structure

- \`apps/web\` - React frontend with Vite
- \`apps/server\` - Express backend with Bun
- \`packages/shared\` - Shared types and utilities
- \`docs\` - Project documentation
- \`.locus\` - Locus workspace (tasks, artifacts, CI runs)

## 🎯 Locus Integration

This project is managed by Locus. To interact with it:

\`\`\`bash
# Point Locus to this project
locus start --project ${projectPath}/.locus
\`\`\`

Then use the Locus UI or MCP server to manage tasks, documentation, and CI.
`;
  await writeFile(join(projectPath, "README.md"), readme);

  // Locus workspace config
  console.log("⚙️  Configuring Locus workspace...");
  const workspaceConfig = {
    repoPath: projectPath,
    docsPath: join(projectPath, "docs"),
    ciPresetsPath: join(locusDir, "ci-presets.json"),
    projectName,
  };
  await writeFile(
    join(locusDir, "workspace.config.json"),
    JSON.stringify(workspaceConfig, null, 2)
  );

  // CI presets
  const ciPresets = {
    quick: ["bun run lint", "bun run typecheck"],
    full: ["bun run lint", "bun run typecheck", "bun test"],
  };
  await writeFile(
    join(locusDir, "ci-presets.json"),
    JSON.stringify(ciPresets, null, 2)
  );

  // Initialize database
  console.log("🗄️  Setting up database...");
  const dbPath = join(locusDir, "db.sqlite");
  const db = new Database(dbPath);

  db.exec(`
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
      payload TEXT,
      createdAt INTEGER NOT NULL,
      FOREIGN KEY(taskId) REFERENCES tasks(id)
    );
  `);

  // Seed with starter task
  const now = Date.now();
  db.prepare(`
    INSERT INTO tasks (title, description, status, priority, labels, acceptanceChecklist, createdAt, updatedAt)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    "Welcome to Locus! 🎯",
    "This is your first task. Locus helps you manage development tasks, documentation, and CI/CD workflows.\n\nTry:\n- Moving this task to 'In Progress'\n- Adding a comment\n- Creating a documentation page\n- Setting up your CI presets",
    "BACKLOG",
    "LOW",
    JSON.stringify(["getting-started"]),
    JSON.stringify([
      { text: "Explore the Locus UI", completed: false },
      { text: "Read the documentation", completed: false },
      { text: "Create your first task", completed: false },
    ]),
    now,
    now
  );

  db.close();

  // Starter documentation
  await writeFile(
    join(projectPath, "docs/getting-started.md"),
    `# Getting Started

Welcome to ${projectName}!

## Development

\`\`\`bash
bun run dev
\`\`\`

## Building

\`\`\`bash
bun run build
\`\`\`

## Managing with Locus

This project uses Locus for task management, documentation, and CI/CD coordination.

Access the Locus dashboard or use the MCP server to:
- Create and manage tasks
- Write and organize documentation
- Run CI presets
- Track implementation progress
`
  );

  console.log("\n✅ Project created successfully!");
  console.log("\n📋 Next steps:");
  console.log(`   cd ${projectName}`);
  console.log("   bun install");
  console.log("   bun run dev");
  console.log("\n🎯 To manage with Locus:");
  console.log(`   locus start --project ${projectPath}/.locus`);
  console.log("\n");
}

createProject().catch((error) => {
  console.error("❌ Error creating project:", error);
  process.exit(1);
});
