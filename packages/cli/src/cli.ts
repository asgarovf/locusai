#!/usr/bin/env node

import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";
import {
  AgentOrchestrator,
  type AiProvider,
  CodebaseIndexer,
  c,
  createAiRunner,
  DEFAULT_MODEL,
  LOCUS_CONFIG,
  PROVIDER,
} from "@locusai/sdk/node";
import { ConfigManager } from "./config-manager";
import { TreeSummarizer } from "./tree-summarizer";

// Get version from package.json
function getVersion(): string {
  try {
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = dirname(__filename);
    const packagePath = join(__dirname, "..", "package.json");
    if (existsSync(packagePath)) {
      const pkg = JSON.parse(readFileSync(packagePath, "utf-8"));
      return pkg.version || "0.0.0";
    }
  } catch {
    // Silent fallback
  }
  return "0.0.0";
}

const VERSION = getVersion();

function printBanner() {
  console.log(
    c.primary(`
  ##       ######   ######  ##    ##  ###### 
  ##      ##    ## ##       ##    ## ##       
  ##      ##    ## ##       ##    ## ######   
  ##      ##    ## ##       ##    ##      ## 
  #######  ######   ######   ######  ######   v${VERSION}
`)
  );
}

function isProjectInitialized(projectPath: string): boolean {
  const locusDir = join(projectPath, LOCUS_CONFIG.dir);
  const configPath = join(locusDir, LOCUS_CONFIG.configFile);
  return existsSync(locusDir) && existsSync(configPath);
}

function requireInitialization(projectPath: string, command: string): void {
  if (!isProjectInitialized(projectPath)) {
    console.error(`\n${c.error("❌ Error: Locus is not initialized in this directory.")}\n
The '${c.bold(command)}' command requires a Locus project to be initialized.

To initialize Locus in this directory, run:
  ${c.primary("locus init")}

This will create a .locus directory with the necessary configuration.
`);
    process.exit(1);
  }
}

function resolveProvider(input?: string): AiProvider {
  if (!input) return PROVIDER.CLAUDE;
  if (input === PROVIDER.CLAUDE || input === PROVIDER.CODEX) return input;

  console.error(
    c.error(`Error: invalid provider '${input}'. Use 'claude' or 'codex'.`)
  );
  process.exit(1);
}

async function runCommand(args: string[]) {
  const { values } = parseArgs({
    args,
    options: {
      "api-key": { type: "string" },
      workspace: { type: "string" },
      sprint: { type: "string" },
      model: { type: "string" },
      provider: { type: "string" },
      "skip-planning": { type: "boolean" },
      "api-url": { type: "string" },
      dir: { type: "string" },
    },
    strict: false,
  });

  const projectPath = (values.dir as string) || process.cwd();
  requireInitialization(projectPath, "run");
  new ConfigManager(projectPath).updateVersion(VERSION);

  const apiKey = values["api-key"] as string;
  let workspaceId = values.workspace as string | undefined;

  const provider = resolveProvider(values.provider as string);
  const model = (values.model as string | undefined) || DEFAULT_MODEL[provider];
  const apiBase =
    (values["api-url"] as string) || "https://api.locusai.dev/api";

  if (!apiKey) {
    console.error(c.error("Error: --api-key is required"));
    console.error(
      c.dim("You can create an API key in Workspace Settings > API Keys")
    );
    process.exit(1);
  }

  // If workspace ID is not provided, try to derive it from the API key
  if (!workspaceId) {
    try {
      console.log(c.dim("ℹ  Resolving workspace from API key..."));

      const resp = await fetch(`${apiBase}/auth/api-key`, {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
      });

      if (!resp.ok) {
        if (resp.status === 401) {
          throw new Error("Invalid API key");
        }
        throw new Error(`Failed to resolve workspace: ${resp.statusText}`);
      }

      const data = await resp.json();
      // data format: { data: { workspaceId: ... } } or just { ... } depending on interceptors.
      // SDK interceptor handles { data: ... }. Direct fetch returns raw JSON.
      // NestJS usually returns object directly unless wrapped.
      // Our SDK interceptor unwraps `data` property if present.
      // Let's assume standard NestJS response.

      const info = data.data || data; // Handle potential wrapping

      if (info.workspaceId) {
        workspaceId = info.workspaceId;
        console.log(c.success(`✓  Resolved workspace: ${workspaceId}`));
      } else {
        throw new Error(
          "API key is not associated with a workspace. Please specify --workspace."
        );
      }
    } catch (error) {
      console.error(
        c.error(
          `Error resolving workspace: ${error instanceof Error ? error.message : String(error)}`
        )
      );
      process.exit(1);
    }
  }

  if (!workspaceId) {
    console.error(
      c.error(
        "Error: --workspace is required or must be derivable from API key"
      )
    );
    process.exit(1);
  }

  const orchestrator = new AgentOrchestrator({
    workspaceId: workspaceId as string,
    sprintId: (values.sprint as string) || "",
    model,
    provider,
    apiBase,
    maxIterations: 100,
    projectPath,
    apiKey: apiKey as string,
    skipPlanning: Boolean(values["skip-planning"]),
  });

  orchestrator.on("task:assigned", (data) =>
    console.log(`ℹ [CLAIMED] ${data.title}`)
  );
  orchestrator.on("task:completed", (data) =>
    console.log(`✓ [COMPLETED] ${data.taskId}`)
  );
  orchestrator.on("task:failed", (data) =>
    console.log(`✗ [FAILED] ${data.taskId}: ${data.error}`)
  );

  // Handle graceful shutdown
  const handleSignal = async (signal: string) => {
    console.log(`\n${c.info(`Received ${signal}. Stopping agents...`)}`);
    await orchestrator.stop();
    process.exit(0);
  };

  process.on("SIGINT", () => handleSignal("SIGINT"));
  process.on("SIGTERM", () => handleSignal("SIGTERM"));

  console.log(`${c.primary("🚀 Starting agent in")} ${c.bold(projectPath)}...`);
  await orchestrator.start();
}

async function indexCommand(args: string[]) {
  const { values } = parseArgs({
    args,
    options: {
      dir: { type: "string" },
      model: { type: "string" },
      provider: { type: "string" },
    },
    strict: false,
  });
  const projectPath = (values.dir as string) || process.cwd();
  requireInitialization(projectPath, "index");
  new ConfigManager(projectPath).updateVersion(VERSION);

  const provider = resolveProvider(values.provider as string);
  const model = (values.model as string | undefined) || DEFAULT_MODEL[provider];

  const aiRunner = createAiRunner(provider, {
    projectPath,
    model,
  });
  const summarizer = new TreeSummarizer(aiRunner);
  const indexer = new CodebaseIndexer(projectPath);

  console.log(
    `${c.primary("🔍 Indexing codebase in")} ${c.bold(projectPath)}...`
  );
  const index = await indexer.index(
    (msg) => console.log(`  ${c.dim(msg)}`),
    (tree) => summarizer.summarize(tree)
  );

  if (index) {
    indexer.saveIndex(index);
  }

  console.log(c.success("✅ Indexing complete!"));
}

async function initCommand() {
  const projectPath = process.cwd();

  if (isProjectInitialized(projectPath)) {
    console.log(`
${c.info("ℹ️  Locus is already initialized in this directory.")}

Configuration found at: ${c.bold(join(projectPath, LOCUS_CONFIG.dir))}

If you want to reinitialize, please remove the .locus directory first.
`);
    return;
  }

  await new ConfigManager(projectPath).init(VERSION);
  console.log(`
${c.success("✨ Locus initialized successfully!")}

Created:
  📁 ${c.dim(".locus/")}                  - Locus configuration directory
  📄 ${c.dim(".locus/config.json")}      - Project configuration
  📝 ${c.dim("CLAUDE.md")}               - AI context file
  📁 ${c.dim(".agent/skills/")}          - Agent skills (Frontend, Backend, DevOps, etc.)

Next steps:
  1. Run '${c.primary("locus index")}' to index your codebase
  2. Run '${c.primary("locus run")}' to start an agent (requires --api-key and --workspace)

For more information, visit: ${c.underline("https://locusai.dev/docs")}
`);
}

async function main() {
  printBanner();
  const command = process.argv[2];
  const args = process.argv.slice(3);

  switch (command) {
    case "run":
      await runCommand(args);
      break;
    case "index":
      await indexCommand(args);
      break;
    case "init":
      await initCommand();
      break;
    default:
      console.log(`
Usage: locus <command>

Commands:
  init     Initialize Locus in the current directory
  index    Index the codebase for AI context
  run      Start an agent to work on tasks

Options:
  --help   Show this help message
  --provider <name>  AI provider: claude or codex (default: claude)
  --skip-planning    Skip the planning phase (CLI planning)

Examples:
  locus init
  locus index
  locus run --api-key YOUR_KEY --workspace WORKSPACE_ID

For more information, visit: https://locusai.dev/docs
`);
  }
}

main().catch((err) => {
  console.error(`Fatal error: ${err.message}`);
  process.exit(1);
});
