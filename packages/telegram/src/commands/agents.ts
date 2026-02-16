import type { Context } from "telegraf";
import { getClientAndWorkspace, requireApiKey } from "../api-client.js";
import type { TelegramConfig } from "../config.js";
import { escapeHtml, formatError, formatInfo } from "../formatter.js";

function formatRelativeTime(date: string): string {
  const diffMs = Date.now() - new Date(date).getTime();
  const diffSec = Math.floor(diffMs / 1000);

  if (diffSec < 60) return `${diffSec}s ago`;
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDays = Math.floor(diffHr / 24);
  return `${diffDays}d ago`;
}

const STATUS_ICON: Record<string, string> = {
  WORKING: "🔨",
  IDLE: "💤",
  COMPLETED: "✅",
  FAILED: "❌",
};

export async function agentsCommand(
  ctx: Context,
  config: TelegramConfig
): Promise<void> {
  console.log("[agents] Listing active agents");

  if (!(await requireApiKey(ctx, config, "agents"))) return;

  try {
    const { client, workspaceId } = await getClientAndWorkspace(config);
    const agents = await client.workspaces.getAgents(workspaceId);

    if (agents.length === 0) {
      await ctx.reply(formatInfo("No active agents."), {
        parse_mode: "HTML",
      });
      return;
    }

    let msg = `<b>🤖 Active Agents</b>\n`;

    for (const agent of agents) {
      const icon = STATUS_ICON[agent.status] || "❓";
      const shortId = agent.agentId.slice(0, 8);
      const task = agent.currentTaskId
        ? `<code>${agent.currentTaskId.slice(0, 8)}</code>`
        : "None";
      const lastSeen = formatRelativeTime(agent.lastHeartbeat);

      msg += `\n${icon} <b>Agent:</b> <code>${escapeHtml(shortId)}</code>`;
      msg += `\n   Status: ${escapeHtml(agent.status)}`;
      msg += `\n   Task: ${task}`;
      msg += `\n   Last seen: ${lastSeen}\n`;
    }

    msg += `\nTotal: ${agents.length} active agent(s)`;

    await ctx.reply(msg, { parse_mode: "HTML" });
  } catch (err) {
    console.error("[agents] Failed:", err);
    await ctx.reply(
      formatError(
        `Failed to list agents: ${err instanceof Error ? err.message : String(err)}`
      ),
      { parse_mode: "HTML" }
    );
  }
}
