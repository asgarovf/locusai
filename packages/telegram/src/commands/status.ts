import type { Context } from "telegraf";
import type { CliExecutor } from "../executor.js";
import { escapeHtml } from "../formatter.js";

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
      msg += `  • \`${escapeHtml(proc.command)}\` (${elapsed}s)\n`;
    }
  }

  await ctx.reply(msg, { parse_mode: "HTML" });
}
