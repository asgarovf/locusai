import type { Context } from "telegraf";
import type { TelegramConfig } from "../config.js";
import type { CliExecutor } from "../executor.js";
import {
  escapeHtml,
  formatError,
  formatInfo,
  formatSuccess,
  splitMessage,
  stripAnsi,
} from "../formatter.js";

// Track the active run process so /stop can kill it
let activeRunKill: (() => void) | null = null;

export async function runCommand(
  ctx: Context,
  executor: CliExecutor,
  config: TelegramConfig
): Promise<void> {
  const text =
    (ctx.message && "text" in ctx.message ? ctx.message.text : "") || "";
  const input = text.replace(/^\/run\s*/, "").trim();

  // Parse --agents <N> or -a <N> from the command text
  let parsedAgentCount: number | undefined;
  const agentsMatch = input.match(/(?:--agents|-a)\s+(\d+)/);
  if (agentsMatch) {
    parsedAgentCount = Number.parseInt(agentsMatch[1], 10);
    if (parsedAgentCount < 1 || parsedAgentCount > 5) {
      await ctx.reply(
        formatError("Agent count must be between 1 and 5."),
        { parse_mode: "HTML" }
      );
      return;
    }
  }

  const agentCount = parsedAgentCount ?? config.agentCount ?? 1;
  console.log(`[run] Starting agents (count: ${agentCount})`);

  if (!config.apiKey) {
    await ctx.reply(
      formatError(
        "API key is not configured. Run: locus config setup --api-key <key>"
      ),
      { parse_mode: "HTML" }
    );
    return;
  }

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
  if (agentCount > 1) {
    baseArgs.push("--agents", String(agentCount));
  }

  const args = executor.buildArgs(baseArgs, { needsApiKey: true });

  // Use streaming execution for long-running run command
  let outputBuffer = "";
  let lastSentLength = 0;
  const SEND_INTERVAL_MS = 10_000;

  const sendInterval = setInterval(async () => {
    if (outputBuffer.length > lastSentLength) {
      const newOutput = stripAnsi(outputBuffer.slice(lastSentLength));
      lastSentLength = outputBuffer.length;

      const messages = splitMessage(
        `<pre>${escapeHtml(newOutput)}</pre>`,
        4000
      );
      for (const msg of messages) {
        try {
          await ctx.reply(msg, { parse_mode: "HTML" });
        } catch {
          // Telegram rate limit or message too long, skip
        }
      }
    }
  }, SEND_INTERVAL_MS);

  const { kill, done } = executor.executeStreaming(args, (chunk) => {
    outputBuffer += chunk;
  });

  activeRunKill = kill;

  const result = await done;
  activeRunKill = null;
  clearInterval(sendInterval);

  // Send any remaining output
  if (outputBuffer.length > lastSentLength) {
    const remaining = stripAnsi(outputBuffer.slice(lastSentLength));
    const messages = splitMessage(`<pre>${escapeHtml(remaining)}</pre>`, 4000);
    for (const msg of messages) {
      try {
        await ctx.reply(msg, { parse_mode: "HTML" });
      } catch {
        // Skip on error
      }
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
