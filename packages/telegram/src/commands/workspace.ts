import type { Context } from "telegraf";
import { getClientAndWorkspace, requireApiKey } from "../api-client.js";
import type { TelegramConfig } from "../config.js";
import { escapeHtml, formatError } from "../formatter.js";

export async function workspaceCommand(
  ctx: Context,
  config: TelegramConfig
): Promise<void> {
  console.log("[workspace] Fetching workspace info");

  if (!(await requireApiKey(ctx, config, "workspace"))) return;

  try {
    const { client, workspaceId } = await getClientAndWorkspace(config);

    const [workspace, stats] = await Promise.all([
      client.workspaces.getById(workspaceId),
      client.workspaces.getStats(workspaceId).catch(() => null),
    ]);

    let msg = `<b>🏢 Workspace Info</b>\n`;
    msg += `\n<b>Name:</b> ${escapeHtml(workspace.name)}`;
    msg += `\n<b>ID:</b> <code>${escapeHtml(workspace.id)}</code>`;
    msg += `\n<b>Org ID:</b> <code>${escapeHtml(workspace.orgId)}</code>`;

    if (stats) {
      msg += `\n\n<b>📊 Stats</b>`;
      msg += `\n<b>Members:</b> ${stats.memberCount}`;

      const counts = stats.taskCounts;
      const total = Object.values(counts).reduce((sum, n) => sum + n, 0);
      msg += `\n<b>Total Tasks:</b> ${total}`;

      for (const [status, count] of Object.entries(counts)) {
        if (count > 0) {
          msg += `\n  • ${escapeHtml(status)}: ${count}`;
        }
      }
    }

    await ctx.reply(msg, { parse_mode: "HTML" });
  } catch (err) {
    console.error("[workspace] Failed:", err);
    await ctx.reply(
      formatError(
        `Failed to load workspace: ${err instanceof Error ? err.message : String(err)}`
      ),
      { parse_mode: "HTML" }
    );
  }
}
