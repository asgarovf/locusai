import { WorktreeManager } from "@locusai/sdk/node";
import type { Context } from "telegraf";
import type { TelegramConfig } from "../config.js";
import { escapeHtml, formatError, formatInfo, formatSuccess } from "../formatter.js";

function createWorktreeManager(config: TelegramConfig): WorktreeManager {
  return new WorktreeManager(config.projectPath);
}

export async function worktreesCommand(
  ctx: Context,
  config: TelegramConfig
): Promise<void> {
  console.log("[worktrees] Listing agent worktrees");

  try {
    const manager = createWorktreeManager(config);
    const worktrees = manager.listAgentWorktrees();

    if (worktrees.length === 0) {
      await ctx.reply(formatInfo("No agent worktrees found."), {
        parse_mode: "HTML",
      });
      return;
    }

    let msg = `<b>Agent Worktrees (${worktrees.length})</b>\n\n`;
    for (let i = 0; i < worktrees.length; i++) {
      const wt = worktrees[i];
      const status = wt.isPrunable ? " ⚠️ stale" : "";
      msg += `<b>${i + 1}.</b> <code>${escapeHtml(wt.branch)}</code>${status}\n`;
      msg += `   HEAD: <code>${wt.head.slice(0, 8)}</code>\n`;
      msg += `   Path: <code>${escapeHtml(wt.path)}</code>\n\n`;
    }

    msg += "Use /worktree &lt;number&gt; to view details\n";
    msg += "Use /rmworktree &lt;number|all&gt; to remove";

    await ctx.reply(msg, { parse_mode: "HTML" });
  } catch (err) {
    console.error("[worktrees] Failed:", err);
    await ctx.reply(
      formatError(
        `Failed to list worktrees: ${err instanceof Error ? err.message : String(err)}`
      ),
      { parse_mode: "HTML" }
    );
  }
}

export async function worktreeCommand(
  ctx: Context,
  config: TelegramConfig
): Promise<void> {
  const text =
    (ctx.message && "text" in ctx.message ? ctx.message.text : "") || "";
  const arg = text.replace(/^\/worktree\s*/, "").trim();

  console.log(`[worktree] Select: ${arg || "(empty)"}`);

  if (!arg) {
    await ctx.reply(
      formatError("Usage: /worktree &lt;number&gt;\nRun /worktrees to see the list."),
      { parse_mode: "HTML" }
    );
    return;
  }

  const index = Number.parseInt(arg, 10);
  if (Number.isNaN(index) || index < 1) {
    await ctx.reply(formatError("Please provide a valid worktree number."), {
      parse_mode: "HTML",
    });
    return;
  }

  try {
    const manager = createWorktreeManager(config);
    const worktrees = manager.listAgentWorktrees();

    if (index > worktrees.length) {
      await ctx.reply(
        formatError(
          `Worktree #${index} does not exist. There are ${worktrees.length} worktree(s).`
        ),
        { parse_mode: "HTML" }
      );
      return;
    }

    const wt = worktrees[index - 1];
    const hasChanges = !wt.isPrunable && manager.hasChanges(wt.path);

    let msg = `<b>Worktree #${index}</b>\n\n`;
    msg += `<b>Branch:</b> <code>${escapeHtml(wt.branch)}</code>\n`;
    msg += `<b>HEAD:</b> <code>${wt.head}</code>\n`;
    msg += `<b>Path:</b> <code>${escapeHtml(wt.path)}</code>\n`;
    msg += `<b>Status:</b> ${wt.isPrunable ? "⚠️ stale (directory missing)" : hasChanges ? "📝 has uncommitted changes" : "✅ clean"}\n`;

    await ctx.reply(msg, { parse_mode: "HTML" });
  } catch (err) {
    console.error("[worktree] Failed:", err);
    await ctx.reply(
      formatError(
        `Failed to get worktree details: ${err instanceof Error ? err.message : String(err)}`
      ),
      { parse_mode: "HTML" }
    );
  }
}

export async function rmworktreeCommand(
  ctx: Context,
  config: TelegramConfig
): Promise<void> {
  const text =
    (ctx.message && "text" in ctx.message ? ctx.message.text : "") || "";
  const arg = text.replace(/^\/rmworktree\s*/, "").trim();

  console.log(`[rmworktree] Remove: ${arg || "(empty)"}`);

  if (!arg) {
    await ctx.reply(
      formatError(
        "Usage: /rmworktree &lt;number|all&gt;\nRun /worktrees to see the list."
      ),
      { parse_mode: "HTML" }
    );
    return;
  }

  try {
    const manager = createWorktreeManager(config);

    if (arg === "all") {
      const count = manager.removeAll();
      await ctx.reply(
        formatSuccess(`Removed ${count} worktree(s).`),
        { parse_mode: "HTML" }
      );
      return;
    }

    const index = Number.parseInt(arg, 10);
    if (Number.isNaN(index) || index < 1) {
      await ctx.reply(
        formatError("Please provide a valid worktree number or 'all'."),
        { parse_mode: "HTML" }
      );
      return;
    }

    const worktrees = manager.listAgentWorktrees();

    if (index > worktrees.length) {
      await ctx.reply(
        formatError(
          `Worktree #${index} does not exist. There are ${worktrees.length} worktree(s).`
        ),
        { parse_mode: "HTML" }
      );
      return;
    }

    const wt = worktrees[index - 1];
    manager.remove(wt.path, true);

    await ctx.reply(
      formatSuccess(
        `Removed worktree #${index} (${wt.branch}) and its branch.`
      ),
      { parse_mode: "HTML" }
    );
  } catch (err) {
    console.error("[rmworktree] Failed:", err);
    await ctx.reply(
      formatError(
        `Failed to remove worktree: ${err instanceof Error ? err.message : String(err)}`
      ),
      { parse_mode: "HTML" }
    );
  }
}
