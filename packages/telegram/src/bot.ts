/**
 * Bot instance — sets up grammy bot, registers middleware, commands,
 * and callback query handlers.
 */

import { exec as execCb } from "node:child_process";
import { promisify } from "node:util";
import { createLogger } from "@locusai/sdk";
import { Bot } from "grammy";
import {
  CANCEL_ALL,
  CANCEL_CMD_PREFIX,
  handleCancel,
  handleCancelCallback,
} from "./commands/cancel.js";
import {
  handleBranch,
  handleCheckout,
  handleCommit,
  handleDiff,
  handleGitStatus,
  handlePR,
  handleStage,
  handleStash,
} from "./commands/git.js";
import { handleLocusCommand } from "./commands/locus.js";
import { handleService } from "./commands/service.js";
import type { TelegramConfig } from "./config.js";
import { formatError, formatInfo, formatSuccess } from "./ui/format.js";
import { CB } from "./ui/keyboards.js";
import { welcomeMessage } from "./ui/messages.js";

const exec = promisify(execCb);

const logger = createLogger("telegram");

// ─── Bot Factory ────────────────────────────────────────────────────────────

export function createBot(config: TelegramConfig): Bot {
  const bot = new Bot(config.botToken);

  // ── Auth Middleware ─────────────────────────────────────────────────────
  bot.use(async (ctx, next) => {
    const chatId = ctx.chat?.id;
    if (!chatId || !config.allowedChatIds.includes(chatId)) {
      logger.warn("Unauthorized access attempt", {
        chatId,
        from: ctx.from?.username,
      });
      return; // silently ignore
    }
    await next();
  });

  // ── Help / Start ────────────────────────────────────────────────────────
  bot.command("start", async (ctx) => {
    await ctx.reply(welcomeMessage(), { parse_mode: "HTML" });
  });

  bot.command("help", async (ctx) => {
    await ctx.reply(welcomeMessage(), { parse_mode: "HTML" });
  });

  // ── Locus CLI Commands ──────────────────────────────────────────────────
  const locusCommands = [
    "run",
    "status",
    "issues",
    "issue",
    "sprint",
    "plan",
    "review",
    "iterate",
    "discuss",
    "exec",
    "logs",
    "config",
    "artifacts",
  ];

  for (const cmd of locusCommands) {
    bot.command(cmd, async (ctx) => {
      const args = parseArgs(ctx.message?.text ?? "", cmd);
      await handleLocusCommand(ctx, cmd, args);
    });
  }

  // ── Git Commands ────────────────────────────────────────────────────────
  bot.command("gitstatus", async (ctx) => {
    await handleGitStatus(ctx);
  });

  bot.command("stage", async (ctx) => {
    const args = parseArgs(ctx.message?.text ?? "", "stage");
    await handleStage(ctx, args);
  });

  bot.command("commit", async (ctx) => {
    const args = parseArgs(ctx.message?.text ?? "", "commit");
    await handleCommit(ctx, args);
  });

  bot.command("stash", async (ctx) => {
    const args = parseArgs(ctx.message?.text ?? "", "stash");
    await handleStash(ctx, args);
  });

  bot.command("branch", async (ctx) => {
    const args = parseArgs(ctx.message?.text ?? "", "branch");
    await handleBranch(ctx, args);
  });

  bot.command("checkout", async (ctx) => {
    const args = parseArgs(ctx.message?.text ?? "", "checkout");
    await handleCheckout(ctx, args);
  });

  bot.command("diff", async (ctx) => {
    await handleDiff(ctx);
  });

  bot.command("pr", async (ctx) => {
    const args = parseArgs(ctx.message?.text ?? "", "pr");
    await handlePR(ctx, args);
  });

  // ── Cancel Command ─────────────────────────────────────────────────────
  bot.command("cancel", async (ctx) => {
    await handleCancel(ctx);
  });

  // ── Service Commands ────────────────────────────────────────────────────
  bot.command("service", async (ctx) => {
    const args = parseArgs(ctx.message?.text ?? "", "service");
    await handleService(ctx, args);
  });

  // ── Callback Query Handlers ─────────────────────────────────────────────
  registerCallbackHandlers(bot);

  // ── Fallback ────────────────────────────────────────────────────────────
  bot.on("message:text", async (ctx) => {
    // Treat non-command text as a locus exec prompt
    const text = ctx.message.text;
    if (text.startsWith("/")) return; // unknown command — ignore

    await handleLocusCommand(ctx, "exec", [text]);
  });

  return bot;
}

// ─── Callback Query Handlers ────────────────────────────────────────────────

function registerCallbackHandlers(bot: Bot): void {
  // Plan callbacks
  bot.callbackQuery(/^plan:approve:(.+)$/, async (ctx) => {
    const planId = ctx.match[1];
    await ctx.answerCallbackQuery({ text: "Approving plan..." });
    await ctx.editMessageReplyMarkup({ reply_markup: undefined });
    await handleLocusCommand(ctx, "plan", ["approve", planId]);
  });

  bot.callbackQuery(CB.REJECT_PLAN, async (ctx) => {
    await ctx.answerCallbackQuery({ text: "Plan rejected." });
    await ctx.editMessageReplyMarkup({ reply_markup: undefined });
    await ctx.reply(formatInfo("Plan rejected. No changes will be made."), {
      parse_mode: "HTML",
    });
  });

  // Sprint active callback
  bot.callbackQuery(/^sprint:active:(.+)$/, async (ctx) => {
    const sprintName = ctx.match[1];
    await ctx.answerCallbackQuery({ text: "Activating sprint..." });
    await ctx.editMessageReplyMarkup({ reply_markup: undefined });
    await handleLocusCommand(ctx, "sprint", ["active", sprintName]);
  });

  // Run callback
  bot.callbackQuery(CB.RUN_START, async (ctx) => {
    await ctx.answerCallbackQuery({ text: "Starting run..." });
    await ctx.editMessageReplyMarkup({ reply_markup: undefined });
    await handleLocusCommand(ctx, "run", []);
  });

  // Run callbacks
  bot.callbackQuery(CB.VIEW_LOGS, async (ctx) => {
    await ctx.answerCallbackQuery();
    await handleLocusCommand(ctx, "logs", ["--lines", "30"]);
  });

  bot.callbackQuery(/^run:again:(\d+)$/, async (ctx) => {
    const issue = ctx.match[1];
    await ctx.answerCallbackQuery({ text: `Re-running issue #${issue}` });
    await ctx.editMessageReplyMarkup({ reply_markup: undefined });
    await handleLocusCommand(ctx, "run", [issue]);
  });

  // Review callbacks
  bot.callbackQuery(/^review:approve:(\d+)$/, async (ctx) => {
    const pr = ctx.match[1];
    await ctx.answerCallbackQuery({ text: "Approving PR..." });
    await ctx.editMessageReplyMarkup({ reply_markup: undefined });

    try {
      await exec(`gh pr review ${pr} --approve`, { cwd: process.cwd() });
      await ctx.reply(formatSuccess(`Approved PR #${pr}`), {
        parse_mode: "HTML",
      });
    } catch (error: unknown) {
      await ctx.reply(
        formatError(`Failed to approve PR #${pr}`, String(error)),
        {
          parse_mode: "HTML",
        }
      );
    }
  });

  bot.callbackQuery(/^review:changes:(\d+)$/, async (ctx) => {
    const pr = ctx.match[1];
    await ctx.answerCallbackQuery();
    await ctx.editMessageReplyMarkup({ reply_markup: undefined });
    await ctx.reply(
      formatInfo(
        `Requesting changes on PR #${pr}. Reply with your feedback and I'll pass it along via /iterate ${pr}`
      ),
      { parse_mode: "HTML" }
    );
  });

  bot.callbackQuery(/^review:diff:(\d+)$/, async (ctx) => {
    const pr = ctx.match[1];
    await ctx.answerCallbackQuery();
    await handleLocusCommand(ctx, "review", [pr]);
  });

  // Status callbacks
  bot.callbackQuery(CB.RUN_SPRINT, async (ctx) => {
    await ctx.answerCallbackQuery({ text: "Starting sprint run..." });
    await ctx.editMessageReplyMarkup({ reply_markup: undefined });
    await handleLocusCommand(ctx, "run", []);
  });

  bot.callbackQuery(CB.VIEW_ISSUES, async (ctx) => {
    await ctx.answerCallbackQuery();
    await handleLocusCommand(ctx, "issues", []);
  });

  // Stash callbacks
  bot.callbackQuery(CB.STASH_POP, async (ctx) => {
    await ctx.answerCallbackQuery();
    await handleStash(ctx, ["pop"]);
  });

  bot.callbackQuery(CB.STASH_LIST, async (ctx) => {
    await ctx.answerCallbackQuery();
    await handleStash(ctx, ["list"]);
  });

  bot.callbackQuery(CB.STASH_DROP, async (ctx) => {
    await ctx.answerCallbackQuery();
    await handleStash(ctx, ["drop"]);
  });

  // Cancel command callbacks
  bot.callbackQuery(CANCEL_ALL, async (ctx) => {
    await handleCancelCallback(ctx);
  });

  bot.callbackQuery(new RegExp(`^${CANCEL_CMD_PREFIX}`), async (ctx) => {
    await handleCancelCallback(ctx);
  });

  // Confirmation callbacks
  bot.callbackQuery(CB.CONFIRM_ACTION, async (ctx) => {
    await ctx.answerCallbackQuery({ text: "Confirmed!" });
    await ctx.editMessageReplyMarkup({ reply_markup: undefined });
  });

  bot.callbackQuery(CB.CANCEL_ACTION, async (ctx) => {
    await ctx.answerCallbackQuery({ text: "Cancelled." });
    await ctx.editMessageReplyMarkup({ reply_markup: undefined });
    await ctx.reply(formatInfo("Action cancelled."), { parse_mode: "HTML" });
  });
}

// ─── Helpers ────────────────────────────────────────────────────────────────

/** Parse arguments from a Telegram command message. */
function parseArgs(text: string, command: string): string[] {
  // Remove the /command part (handles @botname suffix too)
  const prefixRegex = new RegExp(`^/${command}(@\\S+)?\\s*`);
  const rest = text.replace(prefixRegex, "").trim();
  if (!rest) return [];
  return rest.split(/\s+/);
}
