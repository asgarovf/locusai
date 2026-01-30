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
  PromptBuilder,
} from "@locusai/sdk/node";
import { ConfigManager } from "./config-manager";
import { TreeSummarizer } from "./tree-summarizer";
import { WorkspaceResolver } from "./workspace-resolver";

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
 _      ____   ____ _   _  ____ 
| |    / __ \\ / ___| | | |/ ___|
| |   | |  | | |   | | | |\\___ \\ 
| |___| |__| | |___| |_| |___) |
|_____|\\____/ \\____|\\___/|____/  ${c.dim(`v${VERSION}`)}
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
    console.error(`\n  ${c.error("✖ Error")} ${c.red(`Locus is not initialized in this directory.`)}\n
  The '${c.bold(command)}' command requires a Locus project to be initialized.

  To initialize Locus in this directory, run:
    ${c.primary("locus init")}

  This will create a ${c.dim(".locus")} directory with the necessary configuration.
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
  const configManager = new ConfigManager(projectPath);
  configManager.updateVersion(VERSION);

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

  // Resolve workspace ID
  try {
    const resolver = new WorkspaceResolver(configManager, {
      apiKey,
      apiBase,
      workspaceId: values.workspace as string | undefined,
    });
    workspaceId = await resolver.resolve();
  } catch (error) {
    console.error(
      c.error(error instanceof Error ? error.message : String(error))
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
  });

  orchestrator.on("task:assigned", (data) =>
    console.log(`  ${c.info("●")} ${c.bold("Claimed:")} ${data.title}`)
  );
  orchestrator.on("task:completed", (data) =>
    console.log(
      `  ${c.success("✔")} ${c.success("Completed:")} ${c.dim(data.taskId)}`
    )
  );
  orchestrator.on("task:failed", (data) =>
    console.log(
      `  ${c.error("✖")} ${c.error("Failed:")} ${c.bold(data.taskId)}: ${data.error}`
    )
  );

  // Handle graceful shutdown
  const handleSignal = async (signal: string) => {
    console.log(`\n${c.info(`Received ${signal}. Stopping agents...`)}`);
    await orchestrator.stop();
    process.exit(0);
  };

  process.on("SIGINT", () => handleSignal("SIGINT"));
  process.on("SIGTERM", () => handleSignal("SIGTERM"));

  console.log(
    `\n  ${c.primary("🚀")} ${c.bold("Starting Locus agent in")} ${c.primary(projectPath)}...`
  );
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
    `\n  ${c.step(" INDEX ")} ${c.primary("Analyzing codebase in")} ${c.bold(projectPath)}...`
  );
  try {
    const index = await indexer.index(
      (msg) => console.log(`  ${c.dim(msg)}`),
      (tree) => summarizer.summarize(tree)
    );

    if (index) {
      indexer.saveIndex(index);
    }
  } catch (error) {
    console.error(
      `\n  ${c.error("✖")} ${c.error("Indexing failed:")} ${c.red(error instanceof Error ? error.message : String(error))}`
    );
    console.error(
      c.dim("  The agent might have limited context until indexing succeeds.\n")
    );
  }

  console.log(`\n  ${c.success("✔")} ${c.success("Indexing complete!")}\n`);
}

async function execCommand(args: string[]) {
  const { values, positionals } = parseArgs({
    args,
    options: {
      model: { type: "string" },
      provider: { type: "string" },
      dir: { type: "string" },
    },
    strict: false,
  });

  const promptInput = positionals.join(" ");
  if (!promptInput) {
    console.error(
      c.error('Error: Prompt is required. Usage: locus exec "your prompt"')
    );
    process.exit(1);
  }

  const projectPath = (values.dir as string) || process.cwd();
  requireInitialization(projectPath, "exec");

  const provider = resolveProvider(values.provider as string);
  const model = (values.model as string | undefined) || DEFAULT_MODEL[provider];

  const aiRunner = createAiRunner(provider, {
    projectPath,
    model,
  });

  const builder = new PromptBuilder(projectPath);
  const fullPrompt = await builder.buildGenericPrompt(promptInput);

  console.log(
    `\n  ${c.primary("🚀")} ${c.bold("Executing prompt with repository context...")}\n`
  );

  try {
    const result = await aiRunner.run(fullPrompt);
    console.log(result);
    console.log(`\n  ${c.success("✔")} ${c.success("Execution finished!")}\n`);
  } catch (error) {
    console.error(
      `\n  ${c.error("✖")} ${c.error("Execution failed:")} ${c.red(error instanceof Error ? error.message : String(error))}\n`
    );
    process.exit(1);
  }
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

  ${c.bold("Created:")}
    ${c.primary("📁")} ${c.bold(".locus/")}             ${c.dim("Configuration directory")}
    ${c.primary("📄")} ${c.bold(".locus/config.json")} ${c.dim("Project settings")}
    ${c.primary("📝")} ${c.bold("CLAUDE.md")}          ${c.dim("AI instructions & context")}
    ${c.primary("📁")} ${c.bold(".agent/skills/")}     ${c.dim("Domain-specific agent skills")}

  ${c.bold("Next steps:")}
    1. Run '${c.primary("locus index")}' to index your codebase
    2. Run '${c.primary("locus run")}' to start an agent (requires --api-key)

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
    case "exec":
      await execCommand(args);
      break;
    default:
      console.log(`
  ${c.header(" USAGE ")}
    ${c.primary("locus")} ${c.dim("<command> [options]")}

  ${c.header(" COMMANDS ")}
    ${c.success("init")}      Initialize Locus in the current directory
    ${c.success("index")}     Index the codebase for AI context
    ${c.success("run")}       Start an agent to work on tasks
    ${c.success("exec")}      Run a prompt with repository context

  ${c.header(" OPTIONS ")}
    ${c.secondary("--help")}           Show this help message
    ${c.secondary("--provider")} <name>  AI provider: ${c.dim("claude")} or ${c.dim("codex")} (default: ${c.dim("claude")})

  ${c.header(" EXAMPLES ")}
    ${c.dim("$")} ${c.primary("locus init")}
    ${c.dim("$")} ${c.primary("locus index")}
    ${c.dim("$")} ${c.primary("locus run --api-key YOUR_KEY")}

  For more information, visit: ${c.underline("https://locusai.dev/docs")}
`);
  }
}

main().catch((err) => {
  console.error(`\n  ${c.error("✖ Fatal Error")} ${c.red(err.message)}`);
  process.exit(1);
});
