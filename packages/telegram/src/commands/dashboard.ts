import { SprintStatus, TaskStatus } from "@locusai/shared";
import type { Context } from "telegraf";
import { getClientAndWorkspace, requireApiKey } from "../api-client.js";
import type { TelegramConfig } from "../config.js";
import { escapeHtml, formatError, splitMessage } from "../formatter.js";

function formatRelativeTime(date: Date | number | string): string {
  const now = Date.now();
  const then =
    typeof date === "string"
      ? new Date(date).getTime()
      : date instanceof Date
        ? date.getTime()
        : date;
  const diffMs = now - then;
  const diffSec = Math.floor(diffMs / 1000);

  if (diffSec < 60) return `${diffSec}s ago`;
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDays = Math.floor(diffHr / 24);
  return `${diffDays}d ago`;
}

const EVENT_LABELS: Record<string, string> = {
  TASK_CREATED: "Task created",
  TASK_UPDATED: "Task updated",
  TASK_DELETED: "Task deleted",
  STATUS_CHANGED: "Status changed",
  COMMENT_ADDED: "Comment added",
  CI_RAN: "CI ran",
  SPRINT_CREATED: "Sprint created",
  SPRINT_STATUS_CHANGED: "Sprint status changed",
  SPRINT_DELETED: "Sprint deleted",
  PR_CREATED: "PR created",
  PR_REVIEWED: "PR reviewed",
  PR_MERGED: "PR merged",
  TASK_DISPATCHED: "Task dispatched",
  AGENT_HEARTBEAT: "Agent heartbeat",
  CHECKLIST_INITIALIZED: "Checklist initialized",
  WORKSPACE_CREATED: "Workspace created",
  MEMBER_ADDED: "Member added",
  MEMBER_INVITED: "Member invited",
};

export async function dashboardCommand(
  ctx: Context,
  config: TelegramConfig
): Promise<void> {
  console.log("[dashboard] Generating workspace overview");

  if (!(await requireApiKey(ctx, config, "dashboard"))) return;

  try {
    const { client, workspaceId } = await getClientAndWorkspace(config);

    const [stats, tasks, sprints, agents, activity] = await Promise.all([
      client.workspaces.getStats(workspaceId),
      client.tasks.list(workspaceId),
      client.sprints.list(workspaceId),
      client.workspaces.getAgents(workspaceId),
      client.workspaces.getActivity(workspaceId, 5),
    ]);

    // --- Header ---
    let msg = `<b>📊 Dashboard</b>`;
    if (stats.workspaceName) {
      msg += ` — ${escapeHtml(stats.workspaceName)}`;
    }
    msg += "\n";

    // --- Sprint section ---
    const activeSprint = sprints.find(
      (s) => s.status === SprintStatus.ACTIVE
    );
    msg += "\n<b>Sprint</b>\n";
    if (activeSprint) {
      const sprintTasks = tasks.filter(
        (t) => t.sprintId === activeSprint.id
      );
      const doneTasks = sprintTasks.filter(
        (t) => t.status === TaskStatus.DONE
      );
      msg += `🟢 ${escapeHtml(activeSprint.name)}`;
      msg += ` — ${doneTasks.length}/${sprintTasks.length} tasks done\n`;
    } else {
      msg += "No active sprint\n";
    }

    // --- Task summary ---
    const statusIcon: Record<string, string> = {
      [TaskStatus.BACKLOG]: "📋",
      [TaskStatus.IN_PROGRESS]: "🔄",
      [TaskStatus.IN_REVIEW]: "👀",
      [TaskStatus.BLOCKED]: "🚫",
      [TaskStatus.DONE]: "✅",
    };

    const statusOrder = [
      TaskStatus.BACKLOG,
      TaskStatus.IN_PROGRESS,
      TaskStatus.IN_REVIEW,
      TaskStatus.BLOCKED,
      TaskStatus.DONE,
    ];

    msg += "\n<b>Tasks</b>\n";
    for (const status of statusOrder) {
      const count = tasks.filter((t) => t.status === status).length;
      msg += `${statusIcon[status]} ${status}: ${count}\n`;
    }

    // --- Agents section ---
    msg += "\n<b>Agents</b>\n";
    if (agents.length === 0) {
      msg += "No active agents\n";
    } else {
      for (const agent of agents) {
        const statusLabel = agent.status === "WORKING" ? "🔄 WORKING" : "💤 IDLE";
        const taskInfo = agent.currentTaskId
          ? ` — task \`${agent.currentTaskId.slice(0, 8)}\``
          : "";
        msg += `${statusLabel}${taskInfo}\n`;
      }
    }

    // --- Recent activity ---
    msg += "\n<b>Recent Activity</b>\n";
    if (activity.length === 0) {
      msg += "No recent activity\n";
    } else {
      for (const event of activity) {
        const label = EVENT_LABELS[event.type] || event.type;
        const time = formatRelativeTime(event.createdAt);
        msg += `• ${escapeHtml(label)} — ${time}\n`;
      }
    }

    const messages = splitMessage(msg.trim());
    for (const part of messages) {
      await ctx.reply(part, {
        parse_mode: "HTML",
        link_preview_options: { is_disabled: true },
      });
    }
  } catch (err) {
    console.error("[dashboard] Failed:", err);
    await ctx.reply(
      formatError(
        `Failed to load dashboard: ${err instanceof Error ? err.message : String(err)}`
      ),
      { parse_mode: "HTML" }
    );
  }
}
