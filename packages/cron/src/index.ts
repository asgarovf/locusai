/**
 * Main entry point for locus-cron.
 *
 * Dispatches to either:
 *   - PM2 service management (start/stop/restart/status/logs)
 *   - Direct worker execution (worker)
 *
 * Usage:
 *   locus pkg cron start                              → start cron worker via PM2
 *   locus pkg cron stop                               → stop cron worker
 *   locus pkg cron add "check linter errors every hour" → AI-powered cron creation
 *   locus pkg cron list                               → list configured crons
 */

import {
  pm2Delete,
  pm2Logs,
  pm2Restart,
  pm2Start,
  pm2Status,
  pm2Stop,
} from "@locusai/locus-pm2";
import { createLogger, invokeLocus } from "@locusai/sdk";
import {
  addCronJob,
  getCronPm2Config,
  loadCronConfig,
  removeCronJob,
  setCronEnabled,
} from "./config.js";
import { parseSchedule } from "./parse-schedule.js";

const logger = createLogger("cron");

export async function main(args: string[]): Promise<void> {
  const command = args[0] ?? "help";

  switch (command) {
    case "start":
      return handleStart();
    case "stop":
      return handleStop();
    case "restart":
      return handleRestart();
    case "delete":
      return handleDelete();
    case "status":
      return handleStatus();
    case "logs":
      return handleLogs(args.slice(1));
    case "worker":
      return handleWorker();
    case "add":
      return await handleAdd(args.slice(1));
    case "remove":
    case "rm":
      return handleRemove(args.slice(1));
    case "list":
    case "ls":
      return handleList();
    case "enable":
      return handleEnable();
    case "disable":
      return handleDisable();
    case "help":
    case "--help":
    case "-h":
      return printHelp();
    default:
      console.error(`Unknown command: ${command}`);
      printHelp();
      process.exit(1);
  }
}

// ─── PM2 Service Commands ───────────────────────────────────────────────────

function handleStart(): void {
  const result = pm2Start(getCronPm2Config());
  logger.info(result);
}

function handleStop(): void {
  const result = pm2Stop(getCronPm2Config());
  logger.info(result);
}

function handleRestart(): void {
  const result = pm2Restart(getCronPm2Config());
  logger.info(result);
}

function handleDelete(): void {
  const result = pm2Delete(getCronPm2Config());
  logger.info(result);
}

function handleStatus(): void {
  const status = pm2Status(getCronPm2Config());
  if (!status) {
    logger.warn("Cron worker is not running");
    return;
  }

  const uptimeStr = status.uptime
    ? `${Math.floor((Date.now() - status.uptime) / 1000)}s`
    : "N/A";
  const memStr = status.memory
    ? `${(status.memory / (1024 * 1024)).toFixed(1)}MB`
    : "N/A";

  console.log(`
  Name:     ${status.name}
  Status:   ${status.status}
  PID:      ${status.pid ?? "N/A"}
  Uptime:   ${uptimeStr}
  Memory:   ${memStr}
  Restarts: ${status.restarts}
  `);
}

function handleLogs(args: string[]): void {
  const lines = args[0] ? Number(args[0]) : 50;
  const logs = pm2Logs(getCronPm2Config(), lines);
  console.log(logs);
}

// ─── Cron Management Commands ───────────────────────────────────────────────

async function handleAdd(args: string[]): Promise<void> {
  if (args.length === 0) {
    console.error(
      'Usage: locus pkg cron add "<description>"\n\nExample: locus pkg cron add "check linter errors every hour"'
    );
    process.exit(1);
  }

  // Extract --route flag before joining remaining args as description
  let routes: string[] | undefined;
  const descParts: string[] = [];
  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--route" && i + 1 < args.length) {
      routes = args[i + 1]
        .split(",")
        .map((r) => r.trim())
        .filter(Boolean);
      i++; // skip the value
    } else {
      descParts.push(args[i]);
    }
  }

  if (descParts.length === 0) {
    console.error(
      'Usage: locus pkg cron add "<description>"\n\nExample: locus pkg cron add "check linter errors every hour"'
    );
    process.exit(1);
  }

  const description = descParts.join(" ");

  logger.info(`Interpreting: "${description}" ...`);

  const prompt = buildCronParsePrompt(description);
  const result = await invokeLocus(["exec", prompt]);

  if (result.exitCode !== 0) {
    console.error("Failed to interpret cron description.");
    if (result.stderr) console.error(result.stderr);
    process.exit(1);
  }

  const parsed = extractJson(result.stdout);
  if (!parsed) {
    console.error(
      "Could not parse AI response into a cron job. Please try rephrasing your description."
    );
    process.exit(1);
  }

  const { name, schedule, command } = parsed;

  // Validate parsed fields
  if (!name || !schedule || !command) {
    console.error(
      "AI response missing required fields (name, schedule, command)."
    );
    process.exit(1);
  }

  if (!/^[a-zA-Z0-9][a-zA-Z0-9-]*$/.test(name)) {
    console.error(
      `Invalid generated name: "${name}". Must be alphanumeric with hyphens.`
    );
    process.exit(1);
  }

  if (!parseSchedule(schedule)) {
    console.error(
      `Invalid generated schedule: "${schedule}". Must use formats like 30s, 5m, 1h, 1d.`
    );
    process.exit(1);
  }

  const job: {
    name: string;
    schedule: string;
    command: string;
    routes?: string[];
  } = {
    name,
    schedule,
    command,
  };
  if (routes && routes.length > 0) {
    job.routes = routes;
  }

  const err = addCronJob(job);
  if (err) {
    console.error(err);
    process.exit(1);
  }

  const routeInfo =
    routes && routes.length > 0 ? ` → routes: ${routes.join(", ")}` : "";
  logger.info(
    `Added cron job "${name}" (every ${schedule}): ${command}${routeInfo}`
  );
  logger.info("Restart the cron worker to apply: locus pkg cron restart");
}

function buildCronParsePrompt(description: string): string {
  return [
    "You are a cron job configuration parser. Given a natural language description of a cron task,",
    "output ONLY a valid JSON object with these exact fields:",
    "",
    '  name: a kebab-case identifier (e.g. "check-linter-errors")',
    "  schedule: an interval string using these formats: 30s, 5m, 1h, 1d (minimum 10s)",
    "  command: the shell command to execute. For AI-powered tasks, use: locus exec '<prompt>'",
    "",
    "Rules:",
    "- Output ONLY the JSON object, no markdown, no explanation, no code fences.",
    "- The name should be descriptive and derived from the task description.",
    '- Map time references: "every hour" → "1h", "every 5 minutes" → "5m", "daily" → "1d", "every 30 seconds" → "30s".',
    '- If no time is specified, default to "1h".',
    "- If the task is a development/AI task (review, check, analyze, fix, etc.), the command should be: locus exec '<appropriate prompt>'",
    "- If the task is a simple shell operation (disk check, memory usage, etc.), use a plain shell command.",
    "",
    `Description: "${description}"`,
  ].join("\n");
}

function extractJson(
  output: string
): { name: string; schedule: string; command: string } | null {
  // Try to find JSON in the output — the AI may wrap it in markdown fences
  const jsonMatch = output.match(/\{[\s\S]*?\}/);
  if (!jsonMatch) return null;

  try {
    const parsed = JSON.parse(jsonMatch[0]) as Record<string, unknown>;
    if (
      typeof parsed.name === "string" &&
      typeof parsed.schedule === "string" &&
      typeof parsed.command === "string"
    ) {
      return {
        name: parsed.name,
        schedule: parsed.schedule,
        command: parsed.command,
      };
    }
    return null;
  } catch {
    return null;
  }
}

function handleRemove(args: string[]): void {
  if (args.length < 1) {
    console.error("Usage: locus pkg cron remove <name>");
    process.exit(1);
  }

  const name = args[0];
  const err = removeCronJob(name);
  if (err) {
    console.error(err);
    process.exit(1);
  }

  logger.info(`Removed cron job "${name}"`);
  logger.info("Restart the cron worker to apply: locus pkg cron restart");
}

function handleList(): void {
  const config = loadCronConfig();

  console.log(
    `\n  Cron scheduler: ${config.enabled ? "enabled" : "disabled"}\n`
  );

  if (config.crons.length === 0) {
    console.log("  No cron jobs configured.\n");
    return;
  }

  const hasRoutes = config.crons.some((c) => c.routes && c.routes.length > 0);

  if (hasRoutes) {
    console.log(
      `  ${"Name".padEnd(30)} ${"Schedule".padEnd(10)} ${"Routes".padEnd(20)} Command`
    );
    console.log(
      `  ${"─".repeat(30)} ${"─".repeat(10)} ${"─".repeat(20)} ${"─".repeat(40)}`
    );
    for (const cron of config.crons) {
      const cmd =
        cron.command.length > 40
          ? `${cron.command.slice(0, 37)}...`
          : cron.command;
      const routeStr = cron.routes?.join(", ") ?? "local";
      console.log(
        `  ${cron.name.padEnd(30)} ${cron.schedule.padEnd(10)} ${routeStr.padEnd(20)} ${cmd}`
      );
    }
  } else {
    console.log(`  ${"Name".padEnd(30)} ${"Schedule".padEnd(10)} Command`);
    console.log(`  ${"─".repeat(30)} ${"─".repeat(10)} ${"─".repeat(40)}`);
    for (const cron of config.crons) {
      const cmd =
        cron.command.length > 60
          ? `${cron.command.slice(0, 57)}...`
          : cron.command;
      console.log(
        `  ${cron.name.padEnd(30)} ${cron.schedule.padEnd(10)} ${cmd}`
      );
    }
  }
  console.log();
}

function handleEnable(): void {
  setCronEnabled(true);
  logger.info("Cron scheduler enabled");
}

function handleDisable(): void {
  setCronEnabled(false);
  logger.info("Cron scheduler disabled");
}

// ─── Direct Worker Execution ────────────────────────────────────────────────

async function handleWorker(): Promise<void> {
  const { runWorker } = await import("./worker.js");
  await runWorker();
}

// ─── Help ───────────────────────────────────────────────────────────────────

function printHelp(): void {
  console.log(`
  locus-cron — Standalone cron job scheduler for Locus

  Usage:
    locus pkg cron <command>

  Service commands:
    start             Start the cron worker via PM2 (background)
    stop              Stop the cron worker
    restart           Restart the cron worker
    delete            Remove the cron worker from PM2
    status            Show worker process status
    logs [n]          Show last n lines of logs (default: 50)
    worker            Run the worker directly (foreground)

  Management commands:
    add "<description>"               Add a cron job from natural language
      --route <targets>               Route output to targets (comma-separated)
    remove <name>                     Remove a cron job (alias: rm)
    list                              List all configured cron jobs (alias: ls)
    enable                            Enable the cron scheduler
    disable                           Disable the cron scheduler

  Output routing:
    By default, cron output is written locally to .locus/cron/<job-name>/output.log.
    Use --route to send output to additional targets (e.g. telegram, webhook).

  Examples:
    locus pkg cron add "check linter errors every hour"
    locus pkg cron add "review codebase for security issues daily"
    locus pkg cron add "check disk usage every 5 minutes" --route telegram
    locus pkg cron add "run tests every 30 minutes" --route telegram,local
    locus pkg cron remove disk-check
    locus pkg cron list
    locus pkg cron enable
    locus pkg cron start
    locus pkg cron logs 100
  `);
}

export { resolveAdapters } from "./adapters/index.js";
export { formatInterval, parseSchedule } from "./parse-schedule.js";
// Re-export types for programmatic use
export { CronScheduler } from "./scheduler.js";
export type {
  ActiveCron,
  CronConfig,
  CronJobConfig,
  CronJobResult,
  CronSchedulerStatus,
  OutputAdapter,
} from "./types.js";
