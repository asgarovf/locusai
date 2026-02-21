import { Telegraf } from "telegraf";
import { registerCallbacks } from "./callbacks.js";
import {
  activityCommand,
  agentsCommand,
  approveCommand,
  approveTaskCommand,
  artifactsCommand,
  backlogCommand,
  cancelCommand,
  completeSprintCommand,
  configCommand,
  continueDiscussionHandler,
  dashboardCommand,
  devCommand,
  discussCommand,
  discussionsCommand,
  endDiscussCommand,
  execCommand,
  gitCommand,
  hasActiveDiscussion,
  helpCommand,
  jobHistoryCommand,
  jobsCommand,
  modelCommand,
  planCommand,
  plansCommand,
  rejectCommand,
  rejectTaskCommand,
  reviewCommand,
  runCommand,
  runJobCommand,
  sprintsCommand,
  startCommand,
  statusCommand,
  stopCommand,
  taskDetailCommand,
  tasksCommand,
  upgradeCommand,
  workspaceCommand,
} from "./commands/index.js";
import type { TelegramConfig } from "./config.js";
import { CliExecutor } from "./executor.js";
import { formatError } from "./formatter.js";
import { JobNotifier } from "./notifications.js";
import { HANDLER_TIMEOUT } from "./timeouts.js";

export interface CreateBotResult {
  bot: Telegraf;
  notifier: JobNotifier;
}

export function createBot(config: TelegramConfig): CreateBotResult {
  const bot = new Telegraf(config.botToken, {
    // Default is 90s which is too short for long-running CLI commands.
    // Our executor has its own per-command timeouts defined in timeouts.ts.
    handlerTimeout: HANDLER_TIMEOUT,
  });
  const executor = new CliExecutor(config);
  const notifier = new JobNotifier(bot, config.chatId);

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
  bot.command("review", (ctx) => reviewCommand(ctx, executor));

  // Discussion commands
  bot.command("discuss", (ctx) => discussCommand(ctx, config));
  bot.command("discussions", (ctx) => discussionsCommand(ctx, config));
  bot.command("enddiscuss", (ctx) => endDiscussCommand(ctx, config));

  // Config command
  bot.command("config", (ctx) => configCommand(ctx, config));

  // Model shortcut command
  bot.command("model", (ctx) => modelCommand(ctx, config));

  // Artifacts command
  bot.command("artifacts", (ctx) => artifactsCommand(ctx, config));

  // Job commands
  bot.command("jobs", (ctx) => jobsCommand(ctx, config));
  bot.command("runjob", (ctx) => runJobCommand(ctx, executor));
  bot.command("jobhistory", (ctx) => jobHistoryCommand(ctx, config));

  // Activity feed
  bot.command("activity", (ctx) => activityCommand(ctx, config));

  // Workspace info
  bot.command("workspace", (ctx) => workspaceCommand(ctx, config));

  // Status commands
  bot.command("status", (ctx) => statusCommand(ctx, executor));

  // Upgrade command
  bot.command("upgrade", (ctx) => upgradeCommand(ctx));

  // Route plain text messages to active discussions
  bot.on("text", (ctx) => {
    const text = ctx.message.text;
    const chatId = ctx.chat.id;

    // Skip commands
    if (text.startsWith("/")) return;

    // Only handle if there's an active discussion
    if (!hasActiveDiscussion(chatId)) return;

    continueDiscussionHandler(ctx, config, text);
  });

  // Register inline keyboard callback handlers
  registerCallbacks(bot, config, executor);

  // Register commands with Telegram for autocomplete menu
  bot.telegram
    .setMyCommands([
      {
        command: "dashboard",
        description: "Workspace overview & agent status",
      },
      { command: "agents", description: "List active AI agents" },
      {
        command: "tasks",
        description: "List tasks (optional: filter by status)",
      },
      { command: "task", description: "View task details" },
      { command: "backlog", description: "List backlog tasks" },
      { command: "approvetask", description: "Approve an IN_REVIEW task" },
      { command: "rejecttask", description: "Reject an IN_REVIEW task" },
      { command: "sprints", description: "List all sprints" },
      { command: "plan", description: "Start a planning meeting" },
      { command: "plans", description: "List pending plans" },
      { command: "approve", description: "Approve a plan" },
      { command: "reject", description: "Reject a plan with feedback" },
      { command: "run", description: "Start agent on sprint tasks" },
      { command: "stop", description: "Stop all running processes" },
      { command: "exec", description: "One-shot AI execution" },
      {
        command: "artifacts",
        description: "List & manage knowledge artifacts",
      },
      { command: "review", description: "AI review of PR or changes" },
      { command: "activity", description: "Recent workspace activity" },
      { command: "workspace", description: "Workspace info & stats" },
      { command: "git", description: "Run whitelisted git commands" },
      { command: "dev", description: "Run lint, typecheck, build, test" },
      { command: "discuss", description: "Start a product discussion" },
      { command: "discussions", description: "List all discussions" },
      {
        command: "enddiscuss",
        description: "End active discussion & summarize",
      },
      { command: "jobs", description: "List configured scan jobs" },
      { command: "runjob", description: "Manually trigger a job" },
      { command: "jobhistory", description: "Recent job run history" },
      { command: "config", description: "Show/update settings" },
      { command: "model", description: "View or switch AI model" },
      { command: "status", description: "Show running processes" },
      { command: "upgrade", description: "Upgrade Locus CLI & restart bot" },
      { command: "help", description: "Show all commands" },
    ])
    .catch((err) => console.error("Failed to set bot commands:", err));

  return { bot, notifier };
}
