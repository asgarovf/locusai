import type { Context } from "telegraf";
import { getClientAndWorkspace, requireApiKey } from "../api-client.js";
import type { TelegramConfig } from "../config.js";
import {
  escapeHtml,
  formatError,
  formatInfo,
  formatRelativeTime,
  splitMessage,
} from "../formatter.js";

const EVENT_ICON: Record<string, string> = {
  TASK_CREATED: "📋",
  TASK_UPDATED: "📝",
  TASK_DELETED: "🗑",
  STATUS_CHANGED: "🔄",
  COMMENT_ADDED: "💬",
  CI_RAN: "⚙️",
  SPRINT_CREATED: "🏃",
  SPRINT_STATUS_CHANGED: "🏁",
  SPRINT_DELETED: "🗑",
  CHECKLIST_INITIALIZED: "☑️",
  AGENT_HEARTBEAT: "💓",
  TASK_DISPATCHED: "🤖",
  PR_CREATED: "🔗",
  PR_REVIEWED: "👀",
  PR_MERGED: "✅",
  WORKSPACE_CREATED: "🏢",
  MEMBER_ADDED: "👤",
  MEMBER_INVITED: "✉️",
};

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
  CHECKLIST_INITIALIZED: "Checklist initialized",
  AGENT_HEARTBEAT: "Agent heartbeat",
  TASK_DISPATCHED: "Task dispatched",
  PR_CREATED: "PR created",
  PR_REVIEWED: "PR reviewed",
  PR_MERGED: "PR merged",
  WORKSPACE_CREATED: "Workspace created",
  MEMBER_ADDED: "Member added",
  MEMBER_INVITED: "Member invited",
};

function formatEventDescription(event: {
  type: string;
  payload: Record<string, unknown>;
}): string {
  const p = event.payload;

  if (typeof p.title === "string") {
    if (event.type === "STATUS_CHANGED" && p.oldStatus && p.newStatus) {
      return `${p.title} (${p.oldStatus} → ${p.newStatus})`;
    }
    return p.title;
  }

  if (event.type === "CI_RAN" && typeof p.summary === "string") {
    return p.summary;
  }

  return EVENT_LABELS[event.type] || event.type;
}

export async function activityCommand(
  ctx: Context,
  config: TelegramConfig
): Promise<void> {
  console.log("[activity] Fetching workspace activity");

  if (!(await requireApiKey(ctx, config, "activity"))) return;

  const text = (ctx.message && "text" in ctx.message ? ctx.message.text : "") || "";
  const countArg = text.replace(/^\/activity\s*/, "").trim();
  const parsed = Number.parseInt(countArg, 10);
  const count =
    !Number.isNaN(parsed) && parsed >= 1 && parsed <= 20 ? parsed : 10;

  try {
    const { client, workspaceId } = await getClientAndWorkspace(config);
    const activity = await client.workspaces.getActivity(workspaceId, count);

    if (activity.length === 0) {
      await ctx.reply(formatInfo("No recent activity."), {
        parse_mode: "HTML",
      });
      return;
    }

    let msg = `<b>📜 Recent Activity</b> (last ${activity.length})\n`;

    for (const event of activity) {
      const icon = EVENT_ICON[event.type] || "•";
      const time = formatRelativeTime(event.createdAt);
      const description = formatEventDescription(event);
      msg += `\n${icon} <b>${escapeHtml(EVENT_LABELS[event.type] || event.type)}</b>`;
      msg += `\n   ${escapeHtml(description)}`;
      msg += `\n   <i>${time}</i>\n`;
    }

    const messages = splitMessage(msg.trim());
    for (const part of messages) {
      await ctx.reply(part, {
        parse_mode: "HTML",
        link_preview_options: { is_disabled: true },
      });
    }
  } catch (err) {
    console.error("[activity] Failed:", err);
    await ctx.reply(
      formatError(
        `Failed to load activity: ${err instanceof Error ? err.message : String(err)}`
      ),
      { parse_mode: "HTML" }
    );
  }
}
