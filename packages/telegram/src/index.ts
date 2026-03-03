/**
 * Main entry point for locus-telegram.
 *
 * Dispatches to either:
 *   - PM2 service management (start/stop/restart/status/logs)
 *   - Direct bot execution (bot)
 *
 * Usage:
 *   locus pkg telegram start      → start bot via PM2
 *   locus pkg telegram stop       → stop bot via PM2
 *   locus pkg telegram restart    → restart bot
 *   locus pkg telegram status     → show PM2 process status
 *   locus pkg telegram logs       → tail PM2 logs
 *   locus pkg telegram bot        → run bot directly (foreground)
 */

import { createLogger } from "@locusai/sdk";
import { loadTelegramConfig } from "./config.js";
import {
  pm2Delete,
  pm2Logs,
  pm2Restart,
  pm2Start,
  pm2Status,
  pm2Stop,
} from "./pm2.js";

const logger = createLogger("telegram");

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
    case "bot":
      return handleBot();
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
  const result = pm2Start();
  logger.info(result);
}

function handleStop(): void {
  const result = pm2Stop();
  logger.info(result);
}

function handleRestart(): void {
  const result = pm2Restart();
  logger.info(result);
}

function handleDelete(): void {
  const result = pm2Delete();
  logger.info(result);
}

function handleStatus(): void {
  const status = pm2Status();
  if (!status) {
    logger.warn("Bot is not running");
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
  const logs = pm2Logs(lines);
  console.log(logs);
}

// ─── Direct Bot Execution ───────────────────────────────────────────────────

async function handleBot(): Promise<void> {
  const config = loadTelegramConfig();
  const { createBot } = await import("./bot.js");
  const bot = createBot(config);

  logger.info("Starting Telegram bot...");
  logger.info(`Allowed chat IDs: ${config.allowedChatIds.join(", ")}`);

  // Sync the Telegram command menu so /command suggestions stay up-to-date
  await bot.api.setMyCommands([
    { command: "run", description: "Execute issues" },
    { command: "status", description: "Dashboard view" },
    { command: "issues", description: "List issues" },
    { command: "issue", description: "Show issue details" },
    { command: "sprint", description: "Sprint management" },
    { command: "plan", description: "AI planning" },
    { command: "review", description: "Code review" },
    { command: "iterate", description: "Re-execute with feedback" },
    { command: "discuss", description: "AI discussion" },
    { command: "exec", description: "REPL / one-shot prompt" },
    { command: "logs", description: "View logs" },
    { command: "config", description: "View config" },
    { command: "artifacts", description: "View artifacts" },
    { command: "gitstatus", description: "Git status" },
    { command: "stage", description: "Stage files" },
    { command: "commit", description: "Commit changes" },
    { command: "stash", description: "Stash operations" },
    { command: "branch", description: "List/create branches" },
    { command: "checkout", description: "Switch branch" },
    { command: "diff", description: "Show diff" },
    { command: "pr", description: "Create pull request" },
    { command: "service", description: "Manage bot process" },
    { command: "help", description: "Show help message" },
  ]);
  logger.info("Telegram command menu synced.");

  // Graceful shutdown
  const shutdown = () => {
    logger.info("Shutting down bot...");
    bot.stop();
    process.exit(0);
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);

  await bot.start({
    onStart: () => {
      logger.info("Bot is running. Send /help in Telegram to get started.");
    },
  });
}

// ─── Help ───────────────────────────────────────────────────────────────────

function printHelp(): void {
  console.log(`
  locus-telegram — Remote-control Locus via Telegram

  Usage:
    locus pkg telegram <command>

  Commands:
    start       Start the bot via PM2 (background)
    stop        Stop the bot
    restart     Restart the bot
    delete      Remove the bot from PM2
    status      Show bot process status
    logs [n]    Show last n lines of logs (default: 50)
    bot         Run the bot directly (foreground)
    help        Show this help message

  Configuration (via locus config):
    packages.telegram.botToken    Telegram Bot API token (from @BotFather)
    packages.telegram.chatIds     Comma-separated chat IDs or JSON array

  Setup:
    locus config set packages.telegram.botToken "123456:ABC-DEF..."
    locus config set packages.telegram.chatIds "12345678"

  Examples:
    locus pkg telegram start      # Start in background
    locus pkg telegram bot        # Run in foreground (development)
  `);
}
