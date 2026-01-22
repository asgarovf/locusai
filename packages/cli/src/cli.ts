#!/usr/bin/env bun

/**
 * Locus CLI - Run AI agents that execute tasks from the cloud dashboard
 *
 * Architecture:
 * - Dashboard, MCP, and API run on cloud
 * - This CLI runs locally with an API key
 * - Agents poll for tasks and execute them continuously
 */

import { parseArgs } from "node:util";

const VERSION = "0.2.0";
const DEFAULT_API_URL = "https://api.locus.dev/api";
const DEFAULT_POLL_INTERVAL = 5000;

interface RunConfig {
  apiKey: string;
  workspaceId: string;
  sprintId?: string;
  apiUrl: string;
  skills: string[];
  maxTasks?: number;
  pollInterval: number;
  once: boolean;
}

/**
 * Print styled banner
 */
function printBanner() {
  console.log(`
╔═══════════════════════════════════════════════════════════════╗
║                                                               ║
║   ██╗      ██████╗  ██████╗██╗   ██╗███████╗                  ║
║   ██║     ██╔═══██╗██╔════╝██║   ██║██╔════╝                  ║
║   ██║     ██║   ██║██║     ██║   ██║███████╗                  ║
║   ██║     ██║   ██║██║     ██║   ██║╚════██║                  ║
║   ███████╗╚██████╔╝╚██████╗╚██████╔╝███████║                  ║
║   ╚══════╝ ╚═════╝  ╚═════╝ ╚═════╝ ╚══════╝                  ║
║                                                               ║
║   Agentic Engineering Platform                   v${VERSION}  ║
║                                                               ║
╚═══════════════════════════════════════════════════════════════╝
`);
}

/**
 * Print help text
 */
function printHelp() {
  console.log(`
Locus CLI - Run AI agents that execute tasks from the cloud dashboard

USAGE:
  locus run [OPTIONS]        Start the agent and begin executing tasks
  locus status               Check connection to API (coming soon)
  locus version              Show version information
  locus help                 Show this help message

RUN OPTIONS:
  --api-key <key>            API key for authentication (required)
                             Can also use LOCUS_API_KEY env var

  --workspace <id>           Workspace ID to operate in (required)
                             Can also use LOCUS_WORKSPACE_ID env var

  --sprint <id>              Sprint ID to pull tasks from (optional)
                             Uses active sprint if not specified
                             Can also use LOCUS_SPRINT_ID env var

  --api-url <url>            API URL (default: ${DEFAULT_API_URL})
                             Can also use LOCUS_API_URL env var

  --skills <skills>          Comma-separated agent skills
                             (default: FRONTEND,BACKEND,QA)

  --max-tasks <n>            Stop after completing N tasks
                             (default: unlimited)

  --poll-interval <ms>       Task polling interval in milliseconds
                             (default: ${DEFAULT_POLL_INTERVAL})

  --once                     Execute one task and exit

EXAMPLES:
  # Start agent with API key
  locus run --api-key lk_xxxxx --workspace ws-123

  # Use specific sprint
  locus run --api-key lk_xxxxx --workspace ws-123 --sprint sprint-456

  # Run single task then exit
  locus run --api-key lk_xxxxx --workspace ws-123 --once

  # Use environment variables
  export LOCUS_API_KEY=lk_xxxxx
  export LOCUS_WORKSPACE_ID=ws-123
  locus run

ENVIRONMENT VARIABLES:
  LOCUS_API_KEY              API key for authentication
  LOCUS_WORKSPACE_ID         Workspace ID
  LOCUS_SPRINT_ID            Sprint ID (optional)
  LOCUS_API_URL              API URL (optional)

For more information, visit: https://docs.locus.dev/cli
`);
}

/**
 * Log with timestamp
 */
function log(
  message: string,
  level: "info" | "success" | "warn" | "error" = "info"
) {
  const timestamp = new Date().toISOString().split("T")[1]?.slice(0, 8) ?? "";
  const prefix = {
    info: "ℹ",
    success: "✓",
    warn: "⚠",
    error: "✗",
  }[level];

  console.log(`[${timestamp}] ${prefix} ${message}`);
}

/**
 * Parse and validate run configuration
 */
function parseRunConfig(args: string[]): RunConfig {
  const { values } = parseArgs({
    args,
    options: {
      "api-key": { type: "string" },
      workspace: { type: "string" },
      sprint: { type: "string" },
      "api-url": { type: "string" },
      skills: { type: "string" },
      "max-tasks": { type: "string" },
      "poll-interval": { type: "string" },
      once: { type: "boolean" },
    },
    strict: false,
  });

  const apiKey = (values["api-key"] || process.env.LOCUS_API_KEY) as
    | string
    | undefined;
  const workspaceId = (values.workspace || process.env.LOCUS_WORKSPACE_ID) as
    | string
    | undefined;
  const sprintId = (values.sprint || process.env.LOCUS_SPRINT_ID) as
    | string
    | undefined;
  const apiUrl = (values["api-url"] ||
    process.env.LOCUS_API_URL ||
    DEFAULT_API_URL) as string;
  const skills = ((values.skills as string) || "FRONTEND,BACKEND,QA")
    .split(",")
    .map((s) => s.trim());
  const maxTasks = values["max-tasks"]
    ? parseInt(values["max-tasks"] as string, 10)
    : undefined;
  const pollInterval = values["poll-interval"]
    ? parseInt(values["poll-interval"] as string, 10)
    : DEFAULT_POLL_INTERVAL;
  const once = !!values.once;

  // Validate required fields
  if (!apiKey) {
    console.error("\n✗ Error: API key is required");
    console.error(
      "  Provide via --api-key flag or LOCUS_API_KEY environment variable\n"
    );
    process.exit(1);
  }

  if (!workspaceId) {
    console.error("\n✗ Error: Workspace ID is required");
    console.error(
      "  Provide via --workspace flag or LOCUS_WORKSPACE_ID environment variable\n"
    );
    process.exit(1);
  }

  return {
    apiKey,
    workspaceId,
    sprintId,
    apiUrl,
    skills,
    maxTasks,
    pollInterval,
    once,
  };
}

/**
 * Run command - Start the agent orchestrator
 */
async function runCommand(args: string[]): Promise<void> {
  printBanner();

  const config = parseRunConfig(args);

  console.log(
    "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  );
  console.log("  Configuration");
  console.log(
    "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  );
  console.log(`  API URL:        ${config.apiUrl}`);
  console.log(`  Workspace:      ${config.workspaceId}`);
  console.log(`  Sprint:         ${config.sprintId || "(active sprint)"}`);
  console.log(`  Skills:         ${config.skills.join(", ")}`);
  console.log(`  Poll Interval:  ${config.pollInterval}ms`);
  console.log(
    `  Mode:           ${config.once ? "Single task" : "Continuous"}`
  );
  if (config.maxTasks) {
    console.log(`  Max Tasks:      ${config.maxTasks}`);
  }
  console.log(
    "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n"
  );

  // Import orchestrator from Node.js-specific entry point
  // (not from the main SDK which is used in browser)
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { AgentOrchestrator } = require("@locusai/sdk/src/index-node");

  const orchestrator = new AgentOrchestrator({
    workspaceId: config.workspaceId,
    sprintId: config.sprintId || "", // Will use active sprint if empty
    apiBase: config.apiUrl,
    maxIterations: config.maxTasks || 100,
    agentSkills: config.skills,
    mcpProjectPath: process.cwd(),
    apiKey: config.apiKey,
  });

  // Track stats
  let tasksCompleted = 0;
  let tasksFailed = 0;

  // Event handlers
  orchestrator.on("agent:spawned", (data: Record<string, unknown>) => {
    log(`Agent spawned: ${data.agentId}`, "info");
  });

  orchestrator.on("agent:completed", (data: Record<string, unknown>) => {
    log(
      `Agent session completed (tasks: ${data.tasksCompleted}, failed: ${data.tasksFailed})`,
      "success"
    );
  });

  orchestrator.on("task:assigned", (data: Record<string, unknown>) => {
    log(`Task claimed: ${data.title}`, "info");
  });

  orchestrator.on("task:completed", (data: Record<string, unknown>) => {
    tasksCompleted++;
    log(`Task completed: ${data.taskId}`, "success");
  });

  orchestrator.on("task:failed", (data: Record<string, unknown>) => {
    tasksFailed++;
    log(`Task failed: ${data.taskId} - ${data.error}`, "error");
  });

  orchestrator.on("error", (error: Error) => {
    log(`Error: ${error.message}`, "error");
  });

  // Graceful shutdown
  const shutdown = async () => {
    console.log("\n");
    log("Shutting down gracefully...", "warn");
    await orchestrator.stop();

    console.log(
      "\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    );
    console.log("  Session Summary");
    console.log(
      "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    );
    console.log(`  Tasks Completed:  ${tasksCompleted}`);
    console.log(`  Tasks Failed:     ${tasksFailed}`);
    console.log(
      "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n"
    );

    process.exit(0);
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);

  // Start the orchestrator
  log("Starting agent...", "info");

  try {
    await orchestrator.start();

    const stats = orchestrator.getStats();
    tasksCompleted = stats.totalTasksCompleted;
    tasksFailed = stats.totalTasksFailed;

    console.log(
      "\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    );
    console.log("  Session Complete");
    console.log(
      "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    );
    console.log(`  Tasks Completed:  ${tasksCompleted}`);
    console.log(`  Tasks Failed:     ${tasksFailed}`);
    console.log(
      "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    );
    console.log("\n  💡 Completed tasks are in VERIFICATION state.");
    console.log(
      "     Review them in the dashboard and mark as DONE when ready.\n"
    );
  } catch (error) {
    log(
      `Fatal error: ${error instanceof Error ? error.message : String(error)}`,
      "error"
    );
    process.exit(1);
  }
}

/**
 * Status command - Check API connection
 */
async function statusCommand(args: string[]): Promise<void> {
  const { values } = parseArgs({
    args,
    options: {
      "api-key": { type: "string" },
      "api-url": { type: "string" },
    },
    strict: false,
  });

  const apiKey = (values["api-key"] || process.env.LOCUS_API_KEY) as
    | string
    | undefined;
  const apiUrl = (values["api-url"] ||
    process.env.LOCUS_API_URL ||
    DEFAULT_API_URL) as string;

  if (!apiKey) {
    console.error("\n✗ Error: API key required to check status");
    console.error(
      "  Provide via --api-key flag or LOCUS_API_KEY environment variable\n"
    );
    process.exit(1);
  }

  console.log(`\nChecking connection to ${apiUrl}...`);

  try {
    const response = await fetch(`${apiUrl}/health`, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
    });

    if (response.ok) {
      console.log("✓ API connection successful\n");
    } else {
      console.log(`✗ API returned status ${response.status}\n`);
      process.exit(1);
    }
  } catch (error) {
    console.log(
      `✗ Failed to connect: ${error instanceof Error ? error.message : String(error)}\n`
    );
    process.exit(1);
  }
}

/**
 * Version command
 */
function versionCommand(): void {
  console.log(`locus v${VERSION}`);
}

/**
 * Main entry point
 */
async function main(): Promise<void> {
  const command = process.argv[2];
  const args = process.argv.slice(3);

  // Handle no command or help
  if (
    !command ||
    command === "help" ||
    command === "--help" ||
    command === "-h"
  ) {
    printHelp();
    process.exit(0);
  }

  // Handle version
  if (command === "version" || command === "--version" || command === "-v") {
    versionCommand();
    process.exit(0);
  }

  // Route commands
  switch (command) {
    case "run":
      await runCommand(args);
      break;

    case "status":
      await statusCommand(args);
      break;

    default:
      console.error(`\n✗ Unknown command: ${command}`);
      console.error("  Run 'locus help' for usage information\n");
      process.exit(1);
  }
}

main().catch((error) => {
  console.error(
    `\n✗ CLI error: ${error instanceof Error ? error.message : String(error)}\n`
  );
  process.exit(1);
});
