import { TaskStatus } from "@locusai/shared";
import type { Telegraf } from "telegraf";
import { getClientAndWorkspace } from "./api-client.js";
import { convertArtifactToPlan, showArtifact } from "./commands/artifacts.js";
import {
  archiveDiscussion,
  endDiscussionById,
  viewDiscussion,
} from "./commands/discuss.js";
import type { TelegramConfig } from "./config.js";
import type { CliExecutor } from "./executor.js";
import {
  escapeHtml,
  formatCommandOutput,
  formatError,
  splitMessage,
} from "./formatter.js";

/**
 * Register inline keyboard callback query handlers.
 *
 * Callback data format: `action:entityType:entityId`
 *   - approve:task:<uuid>
 *   - view:task:<uuid>
 *   - approve:plan:<planId>
 *   - cancel:plan:<planId>
 *   - view:artifact:<name>
 *   - plan:artifact:<name>
 */
export function registerCallbacks(
  bot: Telegraf,
  config: TelegramConfig,
  executor: CliExecutor
): void {
  // ── Task: View details ──────────────────────────────────────────────
  bot.action(/^view:task:(.+)$/, async (ctx) => {
    await ctx.answerCbQuery();
    const taskId = ctx.match[1];

    if (!config.apiKey) {
      await ctx.reply(formatError("API key is required to view tasks."), {
        parse_mode: "HTML",
      });
      return;
    }

    try {
      const { client, workspaceId } = await getClientAndWorkspace(config);
      const task = await client.tasks.getById(taskId, workspaceId);

      const statusIcons: Record<string, string> = {
        BACKLOG: "📋",
        IN_PROGRESS: "🔄",
        IN_REVIEW: "👀",
        BLOCKED: "🚫",
        DONE: "✅",
      };

      const priorityIcons: Record<string, string> = {
        CRITICAL: "🔴",
        HIGH: "🟠",
        MEDIUM: "🟡",
        LOW: "🟢",
      };

      const icon = statusIcons[task.status] || "•";
      let msg = `${icon} <b>${escapeHtml(task.title)}</b>\n\n`;
      msg += `<b>Status:</b> ${task.status}\n`;
      msg += `<b>Priority:</b> ${priorityIcons[task.priority] || "•"} ${task.priority}\n`;

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
      console.error("[callback:view:task] Failed:", err);
      await ctx.reply(
        formatError(
          `Failed to fetch task: ${err instanceof Error ? err.message : String(err)}`
        ),
        { parse_mode: "HTML" }
      );
    }
  });

  // ── Task: Approve (IN_REVIEW → DONE) ───────────────────────────────
  bot.action(/^approve:task:(.+)$/, async (ctx) => {
    await ctx.answerCbQuery("Approving task…");
    const taskId = ctx.match[1];

    if (!config.apiKey) {
      await ctx.reply(formatError("API key is required to approve tasks."), {
        parse_mode: "HTML",
      });
      return;
    }

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

      console.log(`[callback:approve:task] Task ${taskId} approved → DONE`);

      // Edit the original message to reflect the approval
      try {
        await ctx.editMessageText(
          `✅ Task "<b>${escapeHtml(task.title)}</b>" approved and moved to DONE.`,
          { parse_mode: "HTML" }
        );
      } catch {
        // If we can't edit (e.g., message too old), send a new reply
        await ctx.reply(
          `✅ Task "<b>${escapeHtml(task.title)}</b>" approved and moved to DONE.`,
          { parse_mode: "HTML" }
        );
      }
    } catch (err) {
      console.error("[callback:approve:task] Failed:", err);
      await ctx.reply(
        formatError(
          `Failed to approve task: ${err instanceof Error ? err.message : String(err)}`
        ),
        { parse_mode: "HTML" }
      );
    }
  });

  // ── Plan: Approve ──────────────────────────────────────────────────
  bot.action(/^approve:plan:(.+)$/, async (ctx) => {
    await ctx.answerCbQuery("Approving plan…");
    const planId = ctx.match[1];

    try {
      const args = executor.buildArgs(["plan", "--approve", planId], {
        needsApiKey: true,
      });
      const result = await executor.execute(args);
      const output = (result.stdout + result.stderr).trim();

      try {
        await ctx.editMessageText(
          formatCommandOutput("locus plan --approve", output, result.exitCode),
          { parse_mode: "HTML" }
        );
      } catch {
        await ctx.reply(
          formatCommandOutput("locus plan --approve", output, result.exitCode),
          { parse_mode: "HTML" }
        );
      }
    } catch (err) {
      console.error("[callback:approve:plan] Failed:", err);
      await ctx.reply(
        formatError(
          `Failed to approve plan: ${err instanceof Error ? err.message : String(err)}`
        ),
        { parse_mode: "HTML" }
      );
    }
  });

  // ── Plan: Cancel ───────────────────────────────────────────────────
  bot.action(/^cancel:plan:(.+)$/, async (ctx) => {
    await ctx.answerCbQuery("Cancelling plan…");
    const planId = ctx.match[1];

    try {
      const args = executor.buildArgs(["plan", "--cancel", planId]);
      const result = await executor.execute(args);
      const output = (result.stdout + result.stderr).trim();

      try {
        await ctx.editMessageText(
          formatCommandOutput("locus plan --cancel", output, result.exitCode),
          { parse_mode: "HTML" }
        );
      } catch {
        await ctx.reply(
          formatCommandOutput("locus plan --cancel", output, result.exitCode),
          { parse_mode: "HTML" }
        );
      }
    } catch (err) {
      console.error("[callback:cancel:plan] Failed:", err);
      await ctx.reply(
        formatError(
          `Failed to cancel plan: ${err instanceof Error ? err.message : String(err)}`
        ),
        { parse_mode: "HTML" }
      );
    }
  });

  // ── Discussion: End ─────────────────────────────────────────────────
  bot.action(/^end:discuss:(.+)$/, async (ctx) => {
    await ctx.answerCbQuery("Ending discussion…");
    const discussionId = ctx.match[1];
    await endDiscussionById(ctx, config, discussionId);
  });

  // ── Discussion: View ────────────────────────────────────────────────
  bot.action(/^view:discuss:(.+)$/, async (ctx) => {
    await ctx.answerCbQuery();
    const discussionId = ctx.match[1];
    await viewDiscussion(ctx, config, discussionId);
  });

  // ── Discussion: Archive ─────────────────────────────────────────────
  bot.action(/^archive:discuss:(.+)$/, async (ctx) => {
    await ctx.answerCbQuery("Archiving discussion…");
    const discussionId = ctx.match[1];
    await archiveDiscussion(ctx, config, discussionId);
  });

  // ── Artifact: View ───────────────────────────────────────────────────
  bot.action(/^view:artifact:(.+)$/, async (ctx) => {
    await ctx.answerCbQuery();
    const artifactName = ctx.match[1];
    await showArtifact(ctx, config, artifactName);
  });

  // ── Artifact: Convert to Plan ────────────────────────────────────────
  bot.action(/^plan:artifact:(.+)$/, async (ctx) => {
    await ctx.answerCbQuery("Converting to plan…");
    const artifactName = ctx.match[1];
    await convertArtifactToPlan(ctx, config, executor, artifactName);
  });
}
