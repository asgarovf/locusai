/**
 * Locus CLI command passthrough — maps every Telegram command to
 * the corresponding `locus` CLI invocation via `@locusai/sdk`.
 *
 * Long-running commands stream output by editing the Telegram message
 * in place at regular intervals.
 *
 * Uses the gateway's command registry and tracker (with string session IDs).
 */

import {
  getCommandDefinition,
  STREAMING_COMMANDS,
} from "@locusai/locus-gateway";
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
  runKeyboard,
  sprintActiveKeyboard,
  statusKeyboard,
} from "../ui/keyboards.js";
import { reviewStartedMessage, runStartedMessage } from "../ui/messages.js";

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
  const definition = getCommandDefinition(command);
  if (!definition) {
    await ctx.reply(`Unknown command: /${command}`);
    return;
  }

  // Block commands that would enter interactive/REPL mode without arguments
  if (definition.requiresArgs && args.length === 0) {
    await ctx.reply(definition.requiresArgs);
    return;
  }

  // Concurrency guard — prevent conflicting exclusive commands
  const chatId = ctx.chat?.id;
  if (!chatId) return;
  const sessionId = String(chatId);

  const conflict = commandTracker.checkExclusiveConflict(sessionId, command);
  if (conflict) {
    await ctx.reply(formatConflictMessage(command, conflict.runningCommand), {
      parse_mode: "HTML",
    });
    return;
  }

  const fullArgs = [...definition.cliArgs, ...args];
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
    await handleBufferedCommand(ctx, displayCmd, fullArgs, command, args);
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
  const sessionId = String(chatId);
  const child = invokeLocusStream(fullArgs);
  const trackingId = commandTracker.track(sessionId, command, args, child);

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
      commandTracker.untrack(sessionId, trackingId);
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
      const keyboard = getPostCommandKeyboard(
        command,
        args,
        exitCode ?? 0,
        output
      );
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
  command: string,
  args: string[]
): Promise<void> {
  const chatId = ctx.chat?.id;
  if (!chatId) return;
  const sessionId = String(chatId);
  const child = invokeLocusStream(fullArgs);
  const trackingId = commandTracker.track(sessionId, command, args, child);
  let output = "";

  child.stdout?.on("data", (chunk: Buffer) => {
    output += chunk.toString();
  });

  child.stderr?.on("data", (chunk: Buffer) => {
    output += chunk.toString();
  });

  await new Promise<void>((resolve) => {
    child.on("close", async (exitCode) => {
      commandTracker.untrack(sessionId, trackingId);
      const result = formatCommandResult(displayCmd, output, exitCode ?? 0);

      const keyboard = getPostCommandKeyboard(
        command,
        args,
        exitCode ?? 0,
        output
      );
      await ctx.reply(result, {
        parse_mode: "HTML",
        reply_markup: keyboard ?? undefined,
      });

      resolve();
    });
  });
}

// ─── Post-Command Keyboards ────────────────────────────────────────────────

/** Strip ANSI escape codes from a string. */
function stripAnsi(text: string): string {
  // biome-ignore lint/suspicious/noControlCharactersInRegex: ANSI escape codes require control characters
  return text.replace(/\x1B\[[0-9;]*m/g, "");
}

/** Extract plan ID from CLI output (matches "Plan saved: <id>"). */
function extractPlanId(output: string): string | null {
  const clean = stripAnsi(output);
  const match = clean.match(/Plan saved:\s*(\S+)/);
  return match?.[1] ?? null;
}

/** Extract sprint name from CLI output (matches "Sprint: <name>"). */
function extractSprintName(output: string): string | null {
  const clean = stripAnsi(output);
  const match = clean.match(/Sprint:\s*(.+?)$/m);
  return match?.[1]?.trim() ?? null;
}

function getPostCommandKeyboard(
  command: string,
  args: string[],
  exitCode: number,
  output = ""
) {
  if (exitCode !== 0) return null;

  switch (command) {
    case "plan": {
      // After plan approve → show sprint active or run keyboard
      if (args[0] === "approve") {
        const sprint = extractSprintName(output);
        if (sprint) return sprintActiveKeyboard(sprint);
        return runKeyboard();
      }
      // After plan creation → show approve/reject with plan ID
      if (args[0] !== "list" && args[0] !== "show") {
        const planId = extractPlanId(output);
        if (planId) return planKeyboard(planId);
      }
      return null;
    }
    case "sprint": {
      // After sprint active → show run keyboard
      if (args[0] === "active" && args.length > 1) {
        return runKeyboard();
      }
      return null;
    }
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
