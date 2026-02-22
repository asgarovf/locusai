import { SuggestionStatus, TaskStatus } from "@locusai/shared";
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
  formatSuccess,
  splitMessage,
  truncateOutput,
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

  // ── Proposal: Start ────────────────────────────────────────────────
  bot.action(/^proposal_start_(.+)$/, async (ctx) => {
    await ctx.answerCbQuery("Starting proposal…");
    const suggestionId = ctx.match[1];

    if (!config.apiKey) {
      await ctx.reply(formatError("API key is required to act on proposals."), {
        parse_mode: "HTML",
      });
      return;
    }

    try {
      const { client, workspaceId } = await getClientAndWorkspace(config);
      const suggestion = await client.suggestions.updateStatus(
        workspaceId,
        suggestionId,
        { status: SuggestionStatus.ACTED_ON }
      );

      try {
        await ctx.editMessageText(
          `▶️ Proposal "<b>${escapeHtml(suggestion.title)}</b>" accepted. Starting planning…`,
          { parse_mode: "HTML" }
        );
      } catch {
        await ctx.reply(
          `▶️ Proposal "<b>${escapeHtml(suggestion.title)}</b>" accepted. Starting planning…`,
          { parse_mode: "HTML" }
        );
      }

      // Trigger the plan → sprint pipeline with the proposal description
      const planPrompt = `${suggestion.title}\n\n${suggestion.description}`;
      const args = executor.buildArgs(["plan", planPrompt], {
        needsApiKey: true,
      });
      const result = await executor.execute(args);
      const output = (result.stdout + result.stderr).trim();

      if (output) {
        const parts = splitMessage(
          formatCommandOutput("locus plan", output, result.exitCode)
        );
        for (const part of parts) {
          await ctx.reply(part, { parse_mode: "HTML" });
        }
      }
    } catch (err) {
      console.error("[callback:proposal_start] Failed:", err);
      await ctx.reply(
        formatError(
          `Failed to start proposal: ${err instanceof Error ? err.message : String(err)}`
        ),
        { parse_mode: "HTML" }
      );
    }
  });

  // ── Proposal: Skip ────────────────────────────────────────────────
  bot.action(/^proposal_skip_(.+)$/, async (ctx) => {
    await ctx.answerCbQuery("Skipping…");
    const suggestionId = ctx.match[1];

    if (!config.apiKey) {
      await ctx.reply(formatError("API key is required to act on proposals."), {
        parse_mode: "HTML",
      });
      return;
    }

    try {
      const { client, workspaceId } = await getClientAndWorkspace(config);
      const suggestion = await client.suggestions.updateStatus(
        workspaceId,
        suggestionId,
        { status: SuggestionStatus.SKIPPED }
      );

      try {
        await ctx.editMessageText(
          `⏭ Proposal "<b>${escapeHtml(suggestion.title)}</b>" skipped. Won't suggest this again.`,
          { parse_mode: "HTML" }
        );
      } catch {
        await ctx.reply(
          `⏭ Proposal "<b>${escapeHtml(suggestion.title)}</b>" skipped. Won't suggest this again.`,
          { parse_mode: "HTML" }
        );
      }
    } catch (err) {
      console.error("[callback:proposal_skip] Failed:", err);
      await ctx.reply(
        formatError(
          `Failed to skip proposal: ${err instanceof Error ? err.message : String(err)}`
        ),
        { parse_mode: "HTML" }
      );
    }
  });

  // ── Proposal: Details ─────────────────────────────────────────────
  bot.action(/^proposal_details_(.+)$/, async (ctx) => {
    await ctx.answerCbQuery();
    const suggestionId = ctx.match[1];

    if (!config.apiKey) {
      await ctx.reply(
        formatError("API key is required to view proposal details."),
        { parse_mode: "HTML" }
      );
      return;
    }

    try {
      const { client, workspaceId } = await getClientAndWorkspace(config);
      const suggestion = await client.suggestions.get(
        workspaceId,
        suggestionId
      );

      const complexityMap: Record<string, string> = {
        low: "2/5",
        medium: "3/5",
        high: "4/5",
      };
      const complexity =
        complexityMap[String(suggestion.metadata?.complexity).toLowerCase()] ??
        "—";
      const relatedTo =
        (suggestion.metadata?.relatedBacklogItem as string) || "New initiative";

      let msg = `📋 <b>Proposal Details</b>\n\n`;
      msg += `<b>Title:</b> ${escapeHtml(suggestion.title)}\n`;
      msg += `<b>Type:</b> ${escapeHtml(suggestion.type)}\n`;
      msg += `<b>Status:</b> ${escapeHtml(suggestion.status)}\n`;
      msg += `<b>Complexity:</b> ${escapeHtml(complexity)}\n`;
      msg += `<b>Related to:</b> ${escapeHtml(relatedTo)}\n`;
      msg += `<b>Created:</b> ${escapeHtml(suggestion.createdAt)}\n`;
      msg += `<b>Expires:</b> ${escapeHtml(suggestion.expiresAt)}\n`;

      if (suggestion.jobRunId) {
        msg += `<b>Job Run:</b> <code>${escapeHtml(suggestion.jobRunId)}</code>\n`;
      }

      msg += `\n<b>Description:</b>\n${escapeHtml(truncateOutput(suggestion.description, 2000))}`;

      if (suggestion.metadata && Object.keys(suggestion.metadata).length > 0) {
        const {
          complexity: _c,
          relatedBacklogItem: _r,
          ...rest
        } = suggestion.metadata;
        if (Object.keys(rest).length > 0) {
          msg += `\n\n<b>Metadata:</b>\n<pre>${escapeHtml(JSON.stringify(rest, null, 2).slice(0, 500))}</pre>`;
        }
      }

      const parts = splitMessage(msg);
      for (const part of parts) {
        await ctx.reply(part, {
          parse_mode: "HTML",
          link_preview_options: { is_disabled: true },
        });
      }
    } catch (err) {
      console.error("[callback:proposal_details] Failed:", err);
      await ctx.reply(
        formatError(
          `Failed to fetch proposal: ${err instanceof Error ? err.message : String(err)}`
        ),
        { parse_mode: "HTML" }
      );
    }
  });

  // ── Suggestion: Fix ──────────────────────────────────────────────────
  bot.action(/^suggestion_fix_(.+)$/, async (ctx) => {
    await ctx.answerCbQuery("Applying fix…");
    const suggestionId = ctx.match[1];

    if (!config.apiKey) {
      await ctx.reply(
        formatError("API key is required to act on suggestions."),
        { parse_mode: "HTML" }
      );
      return;
    }

    try {
      const { client, workspaceId } = await getClientAndWorkspace(config);
      const suggestion = await client.suggestions.updateStatus(
        workspaceId,
        suggestionId,
        { status: SuggestionStatus.ACTED_ON }
      );

      try {
        await ctx.editMessageText(
          formatSuccess(
            `Suggestion "<b>${escapeHtml(suggestion.title)}</b>" marked as fixed.`
          ),
          { parse_mode: "HTML" }
        );
      } catch {
        await ctx.reply(
          formatSuccess(
            `Suggestion "<b>${escapeHtml(suggestion.title)}</b>" marked as fixed.`
          ),
          { parse_mode: "HTML" }
        );
      }
    } catch (err) {
      console.error("[callback:suggestion_fix] Failed:", err);
      await ctx.reply(
        formatError(
          `Failed to update suggestion: ${err instanceof Error ? err.message : String(err)}`
        ),
        { parse_mode: "HTML" }
      );
    }
  });

  // ── Suggestion: Skip ─────────────────────────────────────────────────
  bot.action(/^suggestion_skip_(.+)$/, async (ctx) => {
    await ctx.answerCbQuery("Skipping…");
    const suggestionId = ctx.match[1];

    if (!config.apiKey) {
      await ctx.reply(
        formatError("API key is required to act on suggestions."),
        { parse_mode: "HTML" }
      );
      return;
    }

    try {
      const { client, workspaceId } = await getClientAndWorkspace(config);
      const suggestion = await client.suggestions.updateStatus(
        workspaceId,
        suggestionId,
        { status: SuggestionStatus.SKIPPED }
      );

      try {
        await ctx.editMessageText(
          `⏭ Suggestion "<b>${escapeHtml(suggestion.title)}</b>" skipped.`,
          { parse_mode: "HTML" }
        );
      } catch {
        await ctx.reply(
          `⏭ Suggestion "<b>${escapeHtml(suggestion.title)}</b>" skipped.`,
          { parse_mode: "HTML" }
        );
      }
    } catch (err) {
      console.error("[callback:suggestion_skip] Failed:", err);
      await ctx.reply(
        formatError(
          `Failed to update suggestion: ${err instanceof Error ? err.message : String(err)}`
        ),
        { parse_mode: "HTML" }
      );
    }
  });

  // ── Suggestion: Details ──────────────────────────────────────────────
  bot.action(/^suggestion_details_(.+)$/, async (ctx) => {
    await ctx.answerCbQuery();
    const suggestionId = ctx.match[1];

    if (!config.apiKey) {
      await ctx.reply(
        formatError("API key is required to view suggestion details."),
        { parse_mode: "HTML" }
      );
      return;
    }

    try {
      const { client, workspaceId } = await getClientAndWorkspace(config);
      const suggestion = await client.suggestions.get(
        workspaceId,
        suggestionId
      );

      let msg = `📋 <b>Suggestion Details</b>\n\n`;
      msg += `<b>Title:</b> ${escapeHtml(suggestion.title)}\n`;
      msg += `<b>Type:</b> ${escapeHtml(suggestion.type)}\n`;
      msg += `<b>Status:</b> ${escapeHtml(suggestion.status)}\n`;
      msg += `<b>Created:</b> ${escapeHtml(suggestion.createdAt)}\n`;
      msg += `<b>Expires:</b> ${escapeHtml(suggestion.expiresAt)}\n`;

      if (suggestion.jobRunId) {
        msg += `<b>Job Run:</b> <code>${escapeHtml(suggestion.jobRunId)}</code>\n`;
      }

      msg += `\n<b>Description:</b>\n${escapeHtml(truncateOutput(suggestion.description, 2000))}`;

      if (suggestion.metadata && Object.keys(suggestion.metadata).length > 0) {
        msg += `\n\n<b>Metadata:</b>\n<pre>${escapeHtml(JSON.stringify(suggestion.metadata, null, 2).slice(0, 500))}</pre>`;
      }

      const parts = splitMessage(msg);
      for (const part of parts) {
        await ctx.reply(part, {
          parse_mode: "HTML",
          link_preview_options: { is_disabled: true },
        });
      }
    } catch (err) {
      console.error("[callback:suggestion_details] Failed:", err);
      await ctx.reply(
        formatError(
          `Failed to fetch suggestion: ${err instanceof Error ? err.message : String(err)}`
        ),
        { parse_mode: "HTML" }
      );
    }
  });
}
