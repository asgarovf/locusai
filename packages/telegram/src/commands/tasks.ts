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

async function resolveWorkspaceId(
  client: LocusClient,
  config: TelegramConfig
): Promise<string> {
  if (config.workspaceId) {
    return config.workspaceId;
  }

  console.log("[workspace] Resolving workspace from API key...");
  const info = await client.auth.getApiKeyInfo();
  if (info.workspaceId) {
    console.log(`[workspace] Resolved workspace: ${info.workspaceId}`);
    return info.workspaceId;
  }

  throw new Error(
    "Could not resolve workspace from API key. Please set workspaceId in settings."
  );
}

export async function tasksCommand(
  ctx: Context,
  config: TelegramConfig
): Promise<void> {
  console.log("[tasks] Listing active tasks");

  if (!config.apiKey) {
    await ctx.reply(
      formatError(
        "API key is required for /tasks. Run: locus config setup --api-key <KEY>"
      ),
      { parse_mode: "HTML" }
    );
    return;
  }

  try {
    const client = createClient(config);
    const workspaceId = await resolveWorkspaceId(client, config);
    const tasks = await client.tasks.list(workspaceId, {
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
      msg += `   Status: \`${task.status}\`${pr}\n`;
      msg += `   ID: \`${task.id}\`\n\n`;
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

  if (!config.apiKey) {
    await ctx.reply(
      formatError(
        "API key is required for /rejecttask. Run: locus config setup --api-key <KEY>"
      ),
      { parse_mode: "HTML" }
    );
    return;
  }

  try {
    const client = createClient(config);
    const workspaceId = await resolveWorkspaceId(client, config);

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
