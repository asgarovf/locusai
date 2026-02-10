import type { Context } from "telegraf";
import type { CliExecutor } from "../executor.js";
import { escapeHtml, formatCommandOutput } from "../formatter.js";

export async function statusCommand(
  ctx: Context,
  executor: CliExecutor
): Promise<void> {
  console.log("[status] Checking status");
  const running = executor.getRunning();

  let msg = "<b>Locus Bot Status</b>\n\n";

  if (running.length === 0) {
    msg += "No running processes.\n";
  } else {
    msg += `<b>Running processes (${running.length}):</b>\n`;
    for (const proc of running) {
      const elapsed = Math.round(
        (Date.now() - proc.startedAt.getTime()) / 1000
      );
      msg += `  • <code>${escapeHtml(proc.command)}</code> (${elapsed}s)\n`;
    }
  }

  await ctx.reply(msg, { parse_mode: "HTML" });
}

export async function agentsCommand(
  ctx: Context,
  executor: CliExecutor
): Promise<void> {
  console.log("[agents] Listing agents");
  const args = executor.buildArgs(["agents", "list"]);
  const result = await executor.execute(args);
  const output = (result.stdout + result.stderr).trim();

  await ctx.reply(
    formatCommandOutput("locus agents list", output, result.exitCode),
    { parse_mode: "HTML" }
  );
}
