import type { Context } from "telegraf";
import type { TelegramConfig } from "../config.js";
import type { CliExecutor } from "../executor.js";
import {
  escapeHtml,
  formatError,
  formatInfo,
  formatSuccess,
  stripAnsi,
} from "../formatter.js";

// Track the active run process so /stop can kill it
let activeRunKill: (() => void) | null = null;

/**
 * Status line patterns from CLI/worker output that are worth sending to Telegram.
 * Everything else (model streaming, tool traces, thinking blocks, etc.) is filtered out.
 */
const STATUS_PATTERNS = [
  /Agent spawned:/,
  /Claimed:/,
  /Completed:/,
  /Failed:/,
  /Blocked:/,
  /Stale agent killed:/,
  /Starting \d+ agents? in/,
  /No more tasks to process/,
  /No tasks available/,
  /Active sprint found:/,
  /No active sprint found/,
  /Received SIG/,
  /worktree isolation enabled/,
  /branches will be pushed/,
  /PR created:/,
];

/**
 * Check if a line from CLI output is a meaningful status update.
 */
function isStatusLine(line: string): boolean {
  const clean = stripAnsi(line).trim();
  if (!clean) return false;
  return STATUS_PATTERNS.some((pattern) => pattern.test(clean));
}

export async function runCommand(
  ctx: Context,
  executor: CliExecutor,
  config: TelegramConfig
): Promise<void> {
  const agentCount = config.agentCount ?? 1;
  console.log(`[run] Starting agents (count: ${agentCount})`);

  if (activeRunKill) {
    await ctx.reply(
      formatInfo("Agents are already running. Use /stop to stop them first."),
      { parse_mode: "HTML" }
    );
    return;
  }

  const agentLabel = agentCount > 1 ? `${agentCount} agents` : "1 agent";

  await ctx.reply(formatInfo(`Starting ${agentLabel}...`), {
    parse_mode: "HTML",
  });

  const baseArgs = ["run"];

  const args = executor.buildArgs(baseArgs, { needsApiKey: true });

  // Buffer for incomplete lines from stdout/stderr chunks
  let lineBuffer = "";
  // Accumulate only status lines to send to Telegram
  const pendingStatusLines: string[] = [];
  const SEND_INTERVAL_MS = 10_000;

  const sendInterval = setInterval(async () => {
    if (pendingStatusLines.length > 0) {
      const batch = pendingStatusLines.splice(0);
      const text = batch.map((l) => escapeHtml(l)).join("\n");
      try {
        await ctx.reply(`<pre>${text}</pre>`, { parse_mode: "HTML" });
      } catch {
        // Telegram rate limit or message too long, skip
      }
    }
  }, SEND_INTERVAL_MS);

  const { kill, done } = executor.executeStreaming(args, (chunk) => {
    lineBuffer += chunk;
    const lines = lineBuffer.split("\n");
    // Last element is an incomplete line (or empty if chunk ended with \n)
    lineBuffer = lines.pop() || "";

    for (const line of lines) {
      const clean = stripAnsi(line).trim();
      if (clean && isStatusLine(line)) {
        pendingStatusLines.push(clean);
      }
    }
  });

  activeRunKill = kill;

  // Fire-and-forget: don't await `done` so the handler returns immediately.
  // This unblocks Telegraf's update queue, allowing /status and other commands
  // to be processed while the run is still in progress.
  done.then(
    async (result) => {
      activeRunKill = null;
      clearInterval(sendInterval);

      // Process any remaining buffered line
      if (lineBuffer.trim() && isStatusLine(lineBuffer)) {
        pendingStatusLines.push(stripAnsi(lineBuffer).trim());
      }

      // Send any remaining status lines
      if (pendingStatusLines.length > 0) {
        const batch = pendingStatusLines.splice(0);
        const text = batch.map((l) => escapeHtml(l)).join("\n");
        try {
          await ctx.reply(`<pre>${text}</pre>`, { parse_mode: "HTML" });
        } catch {
          // Skip on error
        }
      }

      if (result.exitCode === 0) {
        await ctx.reply(formatSuccess("Agents finished successfully."), {
          parse_mode: "HTML",
        });
      } else if (result.killed) {
        await ctx.reply(formatInfo("Agents were stopped."), {
          parse_mode: "HTML",
        });
      } else {
        await ctx.reply(
          formatError(`Agents exited with code ${result.exitCode}.`),
          { parse_mode: "HTML" }
        );
      }
    },
    async (err) => {
      activeRunKill = null;
      clearInterval(sendInterval);
      try {
        await ctx.reply(
          formatError(
            `Run failed: ${err instanceof Error ? err.message : String(err)}`
          ),
          { parse_mode: "HTML" }
        );
      } catch {
        // Skip on error
      }
    }
  );
}

export async function stopCommand(
  ctx: Context,
  executor: CliExecutor
): Promise<void> {
  console.log("[stop] Stopping all processes");
  const stopped = executor.stopAll();

  if (activeRunKill) {
    activeRunKill();
    activeRunKill = null;
  }

  if (stopped > 0) {
    await ctx.reply(formatSuccess(`Stopped ${stopped} running process(es).`), {
      parse_mode: "HTML",
    });
  } else {
    await ctx.reply(formatInfo("No running processes to stop."), {
      parse_mode: "HTML",
    });
  }
}
