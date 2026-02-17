import type { Context } from "telegraf";
import type { CliExecutor } from "../executor.js";
import { formatCommandOutput, formatError, formatInfo } from "../formatter.js";
import { PLAN_TIMEOUT } from "../timeouts.js";

export async function reviewCommand(
  ctx: Context,
  executor: CliExecutor
): Promise<void> {
  const text =
    (ctx.message && "text" in ctx.message ? ctx.message.text : "") || "";
  const input = text.replace(/^\/review\s*/, "").trim();

  console.log(`[review] Received: ${input || "(empty)"}`);

  const prNumber = input || undefined;

  if (input && !/^\d+$/.test(input)) {
    await ctx.reply(formatError("Usage: /review [pr-number]"), {
      parse_mode: "HTML",
    });
    return;
  }

  const args = prNumber
    ? executor.buildArgs(["review", prNumber], { needsApiKey: true })
    : executor.buildArgs(["review"], { needsApiKey: true });

  await ctx.reply(
    formatInfo(
      prNumber ? `Reviewing PR #${prNumber}...` : "Reviewing staged changes..."
    ),
    { parse_mode: "HTML" }
  );

  // Fire off the process without blocking the Telegraf handler
  executor.execute(args, { timeout: PLAN_TIMEOUT }).then(
    async (result) => {
      const output = (result.stdout + result.stderr).trim();
      try {
        await ctx.reply(
          formatCommandOutput("locus review", output, result.exitCode),
          { parse_mode: "HTML" }
        );
      } catch (err) {
        console.error("Failed to send review result:", err);
      }
    },
    async (err) => {
      try {
        await ctx.reply(
          formatError(
            `Review failed: ${err instanceof Error ? err.message : String(err)}`
          ),
          { parse_mode: "HTML" }
        );
      } catch {
        console.error("Failed to send review error:", err);
      }
    }
  );
}
