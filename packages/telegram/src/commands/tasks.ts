import { LocusClient } from "@locusai/sdk";
import { TaskStatus } from "@locusai/shared";
import type { Context } from "telegraf";
import type { TelegramConfig } from "../config.js";
import { escapeHtml, formatError, formatInfo } from "../formatter.js";

function createClient(config: TelegramConfig): LocusClient {
  return new LocusClient({
    baseUrl: config.apiBase || "https://api.locusai.dev/api",
    token: config.apiKey,
  });
}

export async function tasksCommand(
  ctx: Context,
  config: TelegramConfig
): Promise<void> {
  console.log("[tasks] Listing active tasks");

  if (!config.apiKey || !config.workspaceId) {
    await ctx.reply(
      formatError("API key and workspace ID are required for /tasks."),
      { parse_mode: "HTML" }
    );
    return;
  }

  try {
    const client = createClient(config);
    const tasks = await client.tasks.list(config.workspaceId, {
      status: [
        TaskStatus.IN_PROGRESS,
        TaskStatus.IN_REVIEW,
        TaskStatus.BLOCKED,
      ],
    });

    if (tasks.length === 0) {
      await ctx.reply(formatInfo("No active tasks found."), {
        parse_mode: "HTML",
      });
      return;
    }

    const statusIcon: Record<string, string> = {
      IN_PROGRESS: "🔄",
      IN_REVIEW: "👀",
      BLOCKED: "🚫",
    };

    let msg = "<b>Active Tasks</b>\n\n";
    for (const task of tasks) {
      const icon = statusIcon[task.status] || "•";
      const pr = task.prUrl
        ? ` — <a href="${escapeHtml(task.prUrl)}">PR</a>`
        : "";
      msg += `${icon} <b>${escapeHtml(task.title)}</b>\n`;
      msg += `   Status: <code>${task.status}</code>${pr}\n`;
      msg += `   ID: <code>${task.id}</code>\n\n`;
    }

    await ctx.reply(msg.trim(), {
      parse_mode: "HTML",
      link_preview_options: { is_disabled: true },
    });
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

  if (!config.apiKey || !config.workspaceId) {
    await ctx.reply(
      formatError("API key and workspace ID are required for /rejecttask."),
      { parse_mode: "HTML" }
    );
    return;
  }

  try {
    const client = createClient(config);

    // Verify task exists and is in IN_REVIEW status
    const task = await client.tasks.getById(taskId, config.workspaceId);
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
    await client.tasks.update(taskId, config.workspaceId, {
      status: TaskStatus.BACKLOG,
    });

    // Add rejection comment with feedback
    await client.tasks.addComment(taskId, config.workspaceId, {
      author: "Telegram",
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
