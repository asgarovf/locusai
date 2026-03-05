/**
 * Locus CLI command passthrough — maps every Telegram command to
 * the corresponding `locus` CLI invocation via `@locusai/sdk`.
 *
 * Long-running commands stream output by editing the Telegram message
 * in place at regular intervals.
 */

import { invokeLocusStream } from "@locusai/sdk";
import type { Context } from "grammy";
import { commandTracker } from "../tracker.js";
import {
  formatCommandResult,
  formatConflictMessage,
  formatStreamingMessage,
} from "../ui/format.js";
import {
  planKeyboard,
  reviewKeyboard,
  runCompleteKeyboard,
  statusKeyboard,
} from "../ui/keyboards.js";
import { reviewStartedMessage, runStartedMessage } from "../ui/messages.js";

// ─── Command Map ────────────────────────────────────────────────────────────

/** Maps Telegram command names to locus CLI arguments. */
const COMMAND_MAP: Record<string, string[]> = {
  run: ["run"],
  status: ["status"],
  issues: ["issue", "list"],
  issue: ["issue", "show"],
  sprint: ["sprint"],
  plan: ["plan"],
  review: ["review"],
  iterate: ["iterate"],
  discuss: ["discuss"],
  exec: ["exec"],
  logs: ["logs"],
  config: ["config"],
  artifacts: ["artifacts"],
};

/** Commands that produce long-running streaming output. */
const STREAMING_COMMANDS = new Set([
  "run",
  "plan",
  "review",
  "iterate",
  "discuss",
  "exec",
]);

/** Commands that require at least one argument (they enter interactive mode without args). */
const REQUIRES_ARGS: Record<string, string> = {
  exec: "Please provide a prompt.\n\nExample: /exec Add error handling to the API",
  discuss:
    "Please provide a discussion topic.\n\nExample: /discuss Should we use Redis or in-memory caching?",
};

/** Minimum interval between message edits (ms) to avoid Telegram rate limits. */
const EDIT_INTERVAL = 2000;

// ─── Handlers ───────────────────────────────────────────────────────────────

/**
 * Execute a locus CLI command, streaming output to the Telegram chat.
 */
export async function handleLocusCommand(
  ctx: Context,
  command: string,
  args: string[]
): Promise<void> {
  const cliArgs = COMMAND_MAP[command];
  if (!cliArgs) {
    await ctx.reply(`Unknown command: /${command}`);
    return;
  }

  // Block commands that would enter interactive/REPL mode without arguments
  const requiresArgsMsg = REQUIRES_ARGS[command];
  if (requiresArgsMsg && args.length === 0) {
    await ctx.reply(requiresArgsMsg);
    return;
  }

  // Concurrency guard — prevent conflicting exclusive commands
  const chatId = ctx.chat?.id;
  if (!chatId) return;

  const conflict = commandTracker.checkExclusiveConflict(chatId, command);
  if (conflict) {
    await ctx.reply(formatConflictMessage(command, conflict.runningCommand), {
      parse_mode: "HTML",
    });
    return;
  }

  const fullArgs = [...cliArgs, ...args];
  const displayCmd = `locus ${fullArgs.join(" ")}`;
  const isStreaming = STREAMING_COMMANDS.has(command);

  // Send pre-messages for specific commands
  if (command === "run" && args.length > 0) {
    await ctx.reply(runStartedMessage(args.join(" ")), { parse_mode: "HTML" });
  } else if (command === "review" && args.length > 0) {
    await ctx.reply(reviewStartedMessage(Number(args[0])), {
      parse_mode: "HTML",
    });
  }

  if (isStreaming) {
    await handleStreamingCommand(ctx, displayCmd, fullArgs, command, args);
  } else {
    await handleBufferedCommand(ctx, displayCmd, fullArgs, command);
  }
}

/**
 * Handle a streaming command — edit the message in place as output arrives.
 */
async function handleStreamingCommand(
  ctx: Context,
  displayCmd: string,
  fullArgs: string[],
  command: string,
  args: string[]
): Promise<void> {
  const chatId = ctx.chat?.id;
  if (!chatId) return;
  const child = invokeLocusStream(fullArgs);
  const trackingId = commandTracker.track(chatId, command, args, child);

  let output = "";
  let lastEditTime = 0;
  let editTimer: ReturnType<typeof setTimeout> | null = null;

  // Send initial "running" message
  const msg = await ctx.reply(formatStreamingMessage(displayCmd, "", false), {
    parse_mode: "HTML",
  });

  const editMessage = async () => {
    const now = Date.now();
    if (now - lastEditTime < EDIT_INTERVAL) return;
    lastEditTime = now;

    try {
      await ctx.api.editMessageText(
        msg.chat.id,
        msg.message_id,
        formatStreamingMessage(displayCmd, output, false),
        { parse_mode: "HTML" }
      );
    } catch {
      // Edit can fail if content hasn't changed — ignore
    }
  };

  child.stdout?.on("data", (chunk: Buffer) => {
    output += chunk.toString();

    // Debounce edits
    if (editTimer) clearTimeout(editTimer);
    editTimer = setTimeout(editMessage, EDIT_INTERVAL);
  });

  child.stderr?.on("data", (chunk: Buffer) => {
    output += chunk.toString();
  });

  await new Promise<void>((resolve) => {
    child.on("close", async (exitCode) => {
      commandTracker.untrack(chatId, trackingId);
      if (editTimer) clearTimeout(editTimer);

      // Final edit with complete output
      try {
        await ctx.api.editMessageText(
          msg.chat.id,
          msg.message_id,
          formatStreamingMessage(displayCmd, output, true),
          { parse_mode: "HTML" }
        );
      } catch {
        // ignore edit failures
      }

      // Send keyboard for post-command actions
      const keyboard = getPostCommandKeyboard(command, args, exitCode ?? 0);
      if (keyboard) {
        await ctx.reply(
          exitCode === 0
            ? "What would you like to do next?"
            : "Command failed.",
          { reply_markup: keyboard }
        );
      }

      resolve();
    });
  });
}

/**
 * Handle a buffered command — collect all output, then send once.
 */
async function handleBufferedCommand(
  ctx: Context,
  displayCmd: string,
  fullArgs: string[],
  command: string
): Promise<void> {
  const chatId = ctx.chat?.id;
  if (!chatId) return;
  const child = invokeLocusStream(fullArgs);
  const trackingId = commandTracker.track(chatId, command, [], child);
  let output = "";

  child.stdout?.on("data", (chunk: Buffer) => {
    output += chunk.toString();
  });

  child.stderr?.on("data", (chunk: Buffer) => {
    output += chunk.toString();
  });

  await new Promise<void>((resolve) => {
    child.on("close", async (exitCode) => {
      commandTracker.untrack(chatId, trackingId);
      const result = formatCommandResult(displayCmd, output, exitCode ?? 0);

      const keyboard = getPostCommandKeyboard(command, [], exitCode ?? 0);
      await ctx.reply(result, {
        parse_mode: "HTML",
        reply_markup: keyboard ?? undefined,
      });

      resolve();
    });
  });
}

// ─── Post-Command Keyboards ────────────────────────────────────────────────

function getPostCommandKeyboard(
  command: string,
  args: string[],
  exitCode: number
) {
  if (exitCode !== 0) return null;

  switch (command) {
    case "plan":
      return planKeyboard();
    case "review":
      if (args.length > 0) {
        return reviewKeyboard(Number(args[0]));
      }
      return null;
    case "run":
      if (args.length > 0) {
        return runCompleteKeyboard(Number(args[0]));
      }
      return runCompleteKeyboard();
    case "status":
      return statusKeyboard();
    default:
      return null;
  }
}
