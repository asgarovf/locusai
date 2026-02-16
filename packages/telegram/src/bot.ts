import { Telegraf } from "telegraf";
import {
  activityCommand,
  agentsCommand,
  approveCommand,
  approveTaskCommand,
  backlogCommand,
  cancelCommand,
  completeSprintCommand,
  configCommand,
  dashboardCommand,
  devCommand,
  execCommand,
  gitCommand,
  helpCommand,
  planCommand,
  plansCommand,
  rejectCommand,
  rejectTaskCommand,
  runCommand,
  sprintsCommand,
  startCommand,
  statusCommand,
  stopCommand,
  taskDetailCommand,
  tasksCommand,
} from "./commands/index.js";
import type { TelegramConfig } from "./config.js";
import { CliExecutor } from "./executor.js";
import { formatError } from "./formatter.js";
import { HANDLER_TIMEOUT } from "./timeouts.js";

export function createBot(config: TelegramConfig): Telegraf {
  const bot = new Telegraf(config.botToken, {
    // Default is 90s which is too short for long-running CLI commands.
    // Our executor has its own per-command timeouts defined in timeouts.ts.
    handlerTimeout: HANDLER_TIMEOUT,
  });
  const executor = new CliExecutor(config);

  // Auth middleware — only allow configured chat ID
  bot.use(async (ctx, next) => {
    const chatId = ctx.chat?.id;
    if (chatId !== config.chatId) {
      console.log(`Unauthorized access attempt from chat ID: ${chatId}`);
      return;
    }
    return next();
  });

  // Error handler
  bot.catch(async (err, ctx) => {
    console.error("Bot error:", err);
    try {
      await ctx.reply(
        formatError(
          err instanceof Error ? err.message : "An unexpected error occurred."
        ),
        { parse_mode: "HTML" }
      );
    } catch {
      // If we can't even send an error message, just log it
    }
  });

  // Register commands
  bot.command("start", (ctx) => startCommand(ctx));
  bot.command("help", (ctx) => helpCommand(ctx));
  bot.command("dashboard", (ctx) => dashboardCommand(ctx, config));

  // Planning commands
  bot.command("plan", (ctx) => planCommand(ctx, executor));
  bot.command("plans", (ctx) => plansCommand(ctx, executor));
  bot.command("approve", (ctx) => approveCommand(ctx, executor));
  bot.command("reject", (ctx) => rejectCommand(ctx, executor));
  bot.command("cancel", (ctx) => cancelCommand(ctx, executor));

  // Agent monitoring
  bot.command("agents", (ctx) => agentsCommand(ctx, config));

  // Execution commands
  bot.command("run", (ctx) => runCommand(ctx, executor));
  bot.command("stop", (ctx) => stopCommand(ctx, executor));
  bot.command("exec", (ctx) => execCommand(ctx, executor));

  // Task management commands
  bot.command("tasks", (ctx) => tasksCommand(ctx, config));
  bot.command("task", (ctx) => taskDetailCommand(ctx, config));
  bot.command("approvetask", (ctx) => approveTaskCommand(ctx, config));
  bot.command("rejecttask", (ctx) => rejectTaskCommand(ctx, config));
  bot.command("backlog", (ctx) => backlogCommand(ctx, config));

  // Sprint management commands
  bot.command("sprints", (ctx) => sprintsCommand(ctx, config));
  bot.command("completesprint", (ctx) => completeSprintCommand(ctx, config));

  // Git & Dev commands
  bot.command("git", (ctx) => gitCommand(ctx, config));
  bot.command("dev", (ctx) => devCommand(ctx, config));

  // Config command
  bot.command("config", (ctx) => configCommand(ctx, config));

  // Activity feed
  bot.command("activity", (ctx) => activityCommand(ctx, config));

  // Status commands
  bot.command("status", (ctx) => statusCommand(ctx, executor));

  return bot;
}
