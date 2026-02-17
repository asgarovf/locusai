import { TaskStatus } from "@locusai/shared";
import type { Context } from "telegraf";
import { Markup } from "telegraf";
import { getClientAndWorkspace, requireApiKey } from "../api-client.js";
import type { TelegramConfig } from "../config.js";
import {
  escapeHtml,
  formatError,
  formatInfo,
  splitMessage,
} from "../formatter.js";

const VALID_STATUSES = Object.values(TaskStatus);

const priorityIcon: Record<string, string> = {
  CRITICAL: "🔴",
  HIGH: "🟠",
  MEDIUM: "🟡",
  LOW: "🟢",
};

const statusIcon: Record<string, string> = {
  BACKLOG: "📋",
  IN_PROGRESS: "🔄",
  IN_REVIEW: "👀",
  BLOCKED: "🚫",
  DONE: "✅",
};

export async function tasksCommand(
  ctx: Context,
  config: TelegramConfig
): Promise<void> {
  const text =
    (ctx.message && "text" in ctx.message ? ctx.message.text : "") || "";
  const filterArg = text
    .replace(/^\/tasks\s*/, "")
    .trim()
    .toUpperCase();

  console.log(`[tasks] Listing tasks (filter: ${filterArg || "default"})`);

  if (filterArg && !VALID_STATUSES.includes(filterArg as TaskStatus)) {
    await ctx.reply(
      formatError(`Invalid status. Available: ${VALID_STATUSES.join(", ")}`),
      { parse_mode: "HTML" }
    );
    return;
  }

  if (!(await requireApiKey(ctx, config, "tasks"))) return;

  try {
    const { client, workspaceId } = await getClientAndWorkspace(config);

    const statusFilter = filterArg
      ? [filterArg as TaskStatus]
      : [TaskStatus.IN_PROGRESS, TaskStatus.IN_REVIEW, TaskStatus.BLOCKED];

    const tasks = await client.tasks.list(workspaceId, {
      status: statusFilter,
    });

    const header = filterArg
      ? `Tasks — ${filterArg} (${tasks.length})`
      : `Active Tasks (${tasks.length})`;

    if (tasks.length === 0) {
      await ctx.reply(formatInfo(`No ${filterArg || "active"} tasks found.`), {
        parse_mode: "HTML",
      });
      return;
    }

    let msg = `<b>${escapeHtml(header)}</b>\n\n`;
    for (const task of tasks) {
      const sIcon = statusIcon[task.status] || "•";
      const pIcon = priorityIcon[task.priority] || "•";
      const pr = task.prUrl
        ? ` — <a href="${escapeHtml(task.prUrl)}">PR</a>`
        : "";
      msg += `${sIcon} ${pIcon} <b>${escapeHtml(task.title)}</b>\n`;
      msg += `   Status: \`${task.status}\`${pr}\n`;
      msg += `   ID: \`${task.id}\`\n\n`;
    }

    const inReviewTasks = tasks.filter(
      (t) => t.status === TaskStatus.IN_REVIEW
    );

    if (inReviewTasks.length > 0) {
      const buttons = inReviewTasks
        .slice(0, 5)
        .map((t) => [
          Markup.button.callback("✅ Approve", `approve:task:${t.id}`),
          Markup.button.callback("👁 View", `view:task:${t.id}`),
        ]);
      await ctx.reply(msg.trim(), {
        parse_mode: "HTML",
        link_preview_options: { is_disabled: true },
        ...Markup.inlineKeyboard(buttons),
      });
    } else {
      await ctx.reply(msg.trim(), {
        parse_mode: "HTML",
        link_preview_options: { is_disabled: true },
      });
    }
  } catch (err) {
    console.error("[tasks] Failed:", err);
    await ctx.reply(
      formatError(
        `Failed to fetch tasks: ${err instanceof Error ? err.message : String(err)}`
      ),
      { parse_mode: "HTML" }
    );
  }
}

export async function backlogCommand(
  ctx: Context,
  config: TelegramConfig
): Promise<void> {
  console.log("[backlog] Listing backlog tasks");

  if (!(await requireApiKey(ctx, config, "backlog"))) return;

  try {
    const { client, workspaceId } = await getClientAndWorkspace(config);
    const tasks = await client.tasks.list(workspaceId, {
      status: [TaskStatus.BACKLOG],
    });

    if (tasks.length === 0) {
      await ctx.reply(formatInfo("No backlog tasks found."), {
        parse_mode: "HTML",
      });
      return;
    }

    const truncate = tasks.length > 15;
    const displayed = truncate ? tasks.slice(0, 15) : tasks;

    let msg = `<b>Backlog Tasks (${tasks.length})</b>\n\n`;
    for (const task of displayed) {
      const pIcon = priorityIcon[task.priority] || "•";
      const sprint = task.sprintId
        ? ` · Sprint: ${escapeHtml(task.sprintId)}`
        : "";
      msg += `📋 ${pIcon} <b>${escapeHtml(task.title)}</b>\n`;
      msg += `   ID: \`${task.id}\`${sprint}\n\n`;
    }

    if (truncate) {
      msg += `<i>… and ${tasks.length - 15} more. Use /tasks BACKLOG for full list</i>`;
    }

    await ctx.reply(msg.trim(), {
      parse_mode: "HTML",
      link_preview_options: { is_disabled: true },
    });
  } catch (err) {
    console.error("[backlog] Failed:", err);
    await ctx.reply(
      formatError(
        `Failed to fetch backlog: ${err instanceof Error ? err.message : String(err)}`
      ),
      { parse_mode: "HTML" }
    );
  }
}

export async function rejectTaskCommand(
  ctx: Context,
  config: TelegramConfig
): Promise<void> {
  const text =
    (ctx.message && "text" in ctx.message ? ctx.message.text : "") || "";
  const parts = text.replace(/^\/rejecttask\s*/, "").trim();

  console.log(`[rejecttask] Received: ${parts || "(empty)"}`);

  const spaceIndex = parts.indexOf(" ");
  if (spaceIndex === -1 || !parts) {
    await ctx.reply(
      formatError("Usage: /rejecttask &lt;task-id&gt; &lt;feedback&gt;"),
      { parse_mode: "HTML" }
    );
    return;
  }

  const taskId = parts.slice(0, spaceIndex);
  const feedback = parts.slice(spaceIndex + 1).trim();

  if (!feedback) {
    await ctx.reply(
      formatError("Feedback is required when rejecting a task."),
      { parse_mode: "HTML" }
    );
    return;
  }

  if (!(await requireApiKey(ctx, config, "rejecttask"))) return;

  try {
    const { client, workspaceId } = await getClientAndWorkspace(config);

    // Verify task exists and is in IN_REVIEW status
    const task = await client.tasks.getById(taskId, workspaceId);
    if (task.status !== TaskStatus.IN_REVIEW) {
      await ctx.reply(
        formatError(
          `Task "${task.title}" is in ${task.status} status. Only IN_REVIEW tasks can be rejected.`
        ),
        { parse_mode: "HTML" }
      );
      return;
    }

    // Move task back to BACKLOG so agents can re-execute
    await client.tasks.update(taskId, workspaceId, {
      status: TaskStatus.BACKLOG,
    });

    // Add rejection comment with feedback
    await client.tasks.addComment(taskId, workspaceId, {
      author: "system",
      text: `❌ **Rejected**: ${feedback}`,
    });

    console.log(`[rejecttask] Task ${taskId} rejected → BACKLOG`);

    await ctx.reply(
      `✅ Task "<b>${escapeHtml(task.title)}</b>" rejected and moved to BACKLOG.\n\nFeedback: <i>${escapeHtml(feedback)}</i>`,
      { parse_mode: "HTML" }
    );
  } catch (err) {
    console.error("[rejecttask] Failed:", err);
    await ctx.reply(
      formatError(
        `Failed to reject task: ${err instanceof Error ? err.message : String(err)}`
      ),
      { parse_mode: "HTML" }
    );
  }
}

export async function taskDetailCommand(
  ctx: Context,
  config: TelegramConfig
): Promise<void> {
  const text =
    (ctx.message && "text" in ctx.message ? ctx.message.text : "") || "";
  const taskId = text.replace(/^\/task\s*/, "").trim();

  if (!taskId) {
    await ctx.reply(formatError("Usage: /task &lt;task-id&gt;"), {
      parse_mode: "HTML",
    });
    return;
  }

  if (!(await requireApiKey(ctx, config, "task"))) return;

  try {
    const { client, workspaceId } = await getClientAndWorkspace(config);
    const task = await client.tasks.getById(taskId, workspaceId);

    const statusIcon: Record<string, string> = {
      BACKLOG: "📋",
      IN_PROGRESS: "🔄",
      IN_REVIEW: "👀",
      BLOCKED: "🚫",
      DONE: "✅",
    };

    const priorityIcon: Record<string, string> = {
      CRITICAL: "🔴",
      HIGH: "🟠",
      MEDIUM: "🟡",
      LOW: "🟢",
    };

    const icon = statusIcon[task.status] || "•";
    let msg = `${icon} <b>${escapeHtml(task.title)}</b>\n\n`;
    msg += `<b>Status:</b> ${task.status}\n`;
    msg += `<b>Priority:</b> ${priorityIcon[task.priority] || "•"} ${task.priority}\n`;

    if (task.sprintId) {
      msg += `<b>Sprint:</b> ${escapeHtml(task.sprintId)}\n`;
    }
    if (task.assignedTo) {
      msg += `<b>Assigned:</b> ${escapeHtml(task.assignedTo)}\n`;
    }
    if (task.prUrl) {
      msg += `<b>PR:</b> <a href="${escapeHtml(task.prUrl)}">${escapeHtml(task.prUrl)}</a>\n`;
    }

    if (task.description) {
      const desc =
        task.description.length > 1000
          ? `${task.description.slice(0, 1000)}…`
          : task.description;
      msg += `\n<b>Description:</b>\n${escapeHtml(desc)}\n`;
    }

    if (task.acceptanceChecklist.length > 0) {
      msg += "\n<b>Acceptance Criteria:</b>\n";
      for (const item of task.acceptanceChecklist) {
        const check = item.done ? "☑" : "☐";
        msg += `${check} ${escapeHtml(item.text)}\n`;
      }
    }

    if (task.comments && task.comments.length > 0) {
      msg += "\n<b>Comments:</b>\n";
      const recent = task.comments.slice(-3);
      for (const comment of recent) {
        msg += `• <b>${escapeHtml(comment.author)}</b>: ${escapeHtml(comment.text)}\n`;
      }
    }

    msg += `\n<code>${task.id}</code>`;

    const parts = splitMessage(msg);
    for (const part of parts) {
      await ctx.reply(part, {
        parse_mode: "HTML",
        link_preview_options: { is_disabled: true },
      });
    }
  } catch (err) {
    console.error("[task] Failed:", err);
    await ctx.reply(
      formatError(
        `Failed to fetch task: ${err instanceof Error ? err.message : String(err)}`
      ),
      { parse_mode: "HTML" }
    );
  }
}

export async function approveTaskCommand(
  ctx: Context,
  config: TelegramConfig
): Promise<void> {
  const text =
    (ctx.message && "text" in ctx.message ? ctx.message.text : "") || "";
  const taskId = text.replace(/^\/approvetask\s*/, "").trim();

  if (!taskId) {
    await ctx.reply(formatError("Usage: /approvetask &lt;task-id&gt;"), {
      parse_mode: "HTML",
    });
    return;
  }

  if (!(await requireApiKey(ctx, config, "approvetask"))) return;

  try {
    const { client, workspaceId } = await getClientAndWorkspace(config);
    const task = await client.tasks.getById(taskId, workspaceId);

    if (task.status !== TaskStatus.IN_REVIEW) {
      await ctx.reply(
        formatError(
          `Task "${task.title}" is in ${task.status} status. Only IN_REVIEW tasks can be approved.`
        ),
        { parse_mode: "HTML" }
      );
      return;
    }

    await client.tasks.update(taskId, workspaceId, {
      status: TaskStatus.DONE,
    });

    console.log(`[approvetask] Task ${taskId} approved → DONE`);

    await ctx.reply(
      `✅ Task "<b>${escapeHtml(task.title)}</b>" approved and moved to DONE.`,
      { parse_mode: "HTML" }
    );
  } catch (err) {
    console.error("[approvetask] Failed:", err);
    await ctx.reply(
      formatError(
        `Failed to approve task: ${err instanceof Error ? err.message : String(err)}`
      ),
      { parse_mode: "HTML" }
    );
  }
}
