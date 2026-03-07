/**
 * Main entry point for locus-cron.
 *
 * Dispatches to either:
 *   - PM2 service management (start/stop/restart/status/logs)
 *   - Direct worker execution (worker)
 *
 * Usage:
 *   locus pkg cron start      → start cron worker via PM2
 *   locus pkg cron stop       → stop cron worker
 *   locus pkg cron restart    → restart cron worker
 *   locus pkg cron status     → show PM2 process status
 *   locus pkg cron logs       → tail PM2 logs
 *   locus pkg cron worker     → run worker directly (foreground)
 */

import {
  pm2Delete,
  pm2Logs,
  pm2Restart,
  pm2Start,
  pm2Status,
  pm2Stop,
} from "@locusai/locus-pm2";
import { createLogger } from "@locusai/sdk";
import { getCronPm2Config } from "./config.js";

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

  Commands:
    start       Start the cron worker via PM2 (background)
    stop        Stop the cron worker
    restart     Restart the cron worker
    delete      Remove the cron worker from PM2
    status      Show worker process status
    logs [n]    Show last n lines of logs (default: 50)
    worker      Run the worker directly (foreground)
    help        Show this help message

  Schedule format:
    30s         Every 30 seconds
    5m          Every 5 minutes
    1h          Every 1 hour
    1d          Every 1 day

  Configuration (in .locus/config.json):
    {
      "packages": {
        "cron": {
          "enabled": true,
          "crons": [
            {
              "name": "disk-check",
              "schedule": "1h",
              "command": "df -h / | tail -1"
            }
          ]
        }
      }
    }

  Output:
    Cron output is written to .locus/cron/output.log

  Examples:
    locus pkg cron start      # Start in background
    locus pkg cron worker     # Run in foreground (development)
    locus pkg cron logs 100   # View last 100 lines of logs
  `);
}

export { formatInterval, parseSchedule } from "./parse-schedule.js";
// Re-export types for programmatic use
export { CronScheduler } from "./scheduler.js";
export type {
  ActiveCron,
  CronConfig,
  CronJobConfig,
  CronSchedulerStatus,
} from "./types.js";
