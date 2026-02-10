import type { Context } from "telegraf";
import type { CliExecutor } from "../executor.js";
import { formatCommandOutput, formatError, formatInfo } from "../formatter.js";

export async function execCommand(
  ctx: Context,
  executor: CliExecutor
): Promise<void> {
  const text =
    (ctx.message && "text" in ctx.message ? ctx.message.text : "") || "";
  const prompt = text.replace(/^\/exec\s*/, "").trim();

  console.log(`[exec] Received: ${prompt || "(empty)"}`);

  if (!prompt) {
    await ctx.reply(
      formatInfo(
        'Usage: /exec &lt;prompt&gt;\nExample: /exec "add input validation to the login form"'
      ),
      { parse_mode: "HTML" }
    );
    return;
  }

  await ctx.reply(formatInfo("Executing prompt..."), { parse_mode: "HTML" });

  const args = executor.buildArgs(["exec", prompt, "--no-stream"]);

  // Fire off the process without blocking the Telegraf handler
  executor.execute(args).then(
    async (result) => {
      const output = (result.stdout + result.stderr).trim();
      try {
        if (!output && result.exitCode !== 0) {
          await ctx.reply(formatError("Execution failed with no output."), {
            parse_mode: "HTML",
          });
          return;
        }
        await ctx.reply(
          formatCommandOutput("locus exec", output, result.exitCode),
          { parse_mode: "HTML" }
        );
      } catch (err) {
        console.error("Failed to send exec result:", err);
      }
    },
    async (err) => {
      try {
        await ctx.reply(
          formatError(
            `Exec failed: ${err instanceof Error ? err.message : String(err)}`
          ),
          { parse_mode: "HTML" }
        );
      } catch {
        console.error("Failed to send exec error:", err);
      }
    }
  );
}
