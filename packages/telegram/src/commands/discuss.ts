import {
  createAiRunner,
  DiscussionFacilitator,
  DiscussionManager,
} from "@locusai/sdk/node";
import type { AiProvider } from "@locusai/sdk/node";
import type { Context } from "telegraf";
import { Markup } from "telegraf";
import type { TelegramConfig } from "../config.js";
import {
  escapeHtml,
  formatError,
  formatInfo,
  splitMessage,
} from "../formatter.js";

// ── Active discussion tracking (chatId → discussionId) ────────────────
const activeDiscussions = new Map<number, string>();

// ── Facilitator cache (chatId → facilitator instance) ─────────────────
const facilitatorCache = new Map<number, DiscussionFacilitator>();

function getFacilitator(config: TelegramConfig): DiscussionFacilitator {
  const chatId = config.chatId;
  const cached = facilitatorCache.get(chatId);
  if (cached) return cached;

  const aiRunner = createAiRunner(
    (config.provider as AiProvider) ?? undefined,
    {
      projectPath: config.projectPath,
      model: config.model,
    }
  );

  const discussionManager = new DiscussionManager(config.projectPath);

  const facilitator = new DiscussionFacilitator({
    projectPath: config.projectPath,
    aiRunner,
    discussionManager,
  });

  facilitatorCache.set(chatId, facilitator);
  return facilitator;
}

function getDiscussionManager(config: TelegramConfig): DiscussionManager {
  return new DiscussionManager(config.projectPath);
}

/**
 * Check whether a chat has an active discussion.
 */
export function hasActiveDiscussion(chatId: number): boolean {
  return activeDiscussions.has(chatId);
}

// ── /discuss <topic> ──────────────────────────────────────────────────
export async function discussCommand(
  ctx: Context,
  config: TelegramConfig
): Promise<void> {
  const text =
    (ctx.message && "text" in ctx.message ? ctx.message.text : "") || "";
  const topic = text.replace(/^\/discuss\s*/, "").trim();
  const chatId = ctx.chat?.id;

  if (!chatId) return;

  console.log(`[discuss] Received: ${topic || "(empty)"}`);

  // If no topic and active discussion exists, inform the user
  if (!topic && activeDiscussions.has(chatId)) {
    await ctx.reply(
      formatInfo(
        "A discussion is already active. Send text messages to continue it, or use /enddiscuss to end it first."
      ),
      { parse_mode: "HTML" }
    );
    return;
  }

  // If no topic and no active discussion, show usage
  if (!topic) {
    await ctx.reply(
      formatInfo(
        "Usage: /discuss &lt;topic&gt;\nExample: /discuss Should we add OAuth2 support?"
      ),
      { parse_mode: "HTML" }
    );
    return;
  }

  // If active discussion exists and user wants to start a new one
  if (activeDiscussions.has(chatId)) {
    await ctx.reply(
      formatInfo(
        "A discussion is already active. Use /enddiscuss first to end it before starting a new one."
      ),
      { parse_mode: "HTML" }
    );
    return;
  }

  await ctx.reply(formatInfo("Starting discussion..."), {
    parse_mode: "HTML",
  });

  try {
    const facilitator = getFacilitator(config);
    const result = await facilitator.startDiscussion(topic);

    activeDiscussions.set(chatId, result.discussion.id);

    const response = `💬 <b>Discussion: ${escapeHtml(topic)}</b>\n\n${escapeHtml(result.message)}`;
    const parts = splitMessage(response);

    for (let i = 0; i < parts.length; i++) {
      const isLast = i === parts.length - 1;
      await ctx.reply(parts[i], {
        parse_mode: "HTML",
        ...(isLast
          ? {
              reply_markup: Markup.inlineKeyboard([
                Markup.button.callback(
                  "End Discussion",
                  `end:discuss:${result.discussion.id}`
                ),
              ]).reply_markup,
            }
          : {}),
      });
    }
  } catch (err) {
    console.error("[discuss] Failed to start:", err);
    await ctx.reply(
      formatError(
        `Failed to start discussion: ${err instanceof Error ? err.message : String(err)}`
      ),
      { parse_mode: "HTML" }
    );
  }
}

// ── Text message handler for active discussions ───────────────────────
export async function continueDiscussionHandler(
  ctx: Context,
  config: TelegramConfig,
  message: string
): Promise<void> {
  const chatId = ctx.chat?.id;
  if (!chatId) return;

  const discussionId = activeDiscussions.get(chatId);
  if (!discussionId) return;

  console.log(
    `[discuss] Continuing ${discussionId}: ${message.slice(0, 50)}...`
  );

  try {
    const facilitator = getFacilitator(config);
    const result = await facilitator.continueDiscussion(discussionId, message);

    // Send AI response
    const responseParts = splitMessage(escapeHtml(result.response));
    for (let i = 0; i < responseParts.length; i++) {
      const isLast = i === responseParts.length - 1;
      await ctx.reply(responseParts[i], {
        parse_mode: "HTML",
        ...(isLast
          ? {
              reply_markup: Markup.inlineKeyboard([
                Markup.button.callback(
                  "End Discussion",
                  `end:discuss:${discussionId}`
                ),
              ]).reply_markup,
            }
          : {}),
      });
    }

    // Show extracted insights if any
    if (result.insights.length > 0) {
      const insightIcons: Record<string, string> = {
        decision: "🔵",
        requirement: "🟢",
        idea: "💡",
        concern: "🟠",
        learning: "📚",
      };

      let insightMsg = "<b>Insights extracted:</b>\n\n";
      for (const insight of result.insights) {
        const icon = insightIcons[insight.type] || "•";
        insightMsg += `${icon} <b>[${escapeHtml(insight.type.toUpperCase())}]</b> ${escapeHtml(insight.title)}\n`;
        insightMsg += `${escapeHtml(insight.content)}\n\n`;
      }

      const insightParts = splitMessage(insightMsg.trim());
      for (const part of insightParts) {
        await ctx.reply(part, { parse_mode: "HTML" });
      }
    }
  } catch (err) {
    console.error("[discuss] Failed to continue:", err);
    await ctx.reply(
      formatError(
        `Failed to continue discussion: ${err instanceof Error ? err.message : String(err)}`
      ),
      { parse_mode: "HTML" }
    );
  }
}

// ── /discussions ──────────────────────────────────────────────────────
export async function discussionsCommand(
  ctx: Context,
  config: TelegramConfig
): Promise<void> {
  console.log("[discussions] Listing discussions");

  try {
    const manager = getDiscussionManager(config);
    const discussions = manager.list();

    if (discussions.length === 0) {
      await ctx.reply(
        formatInfo("No discussions found. Start one with /discuss &lt;topic&gt;"),
        { parse_mode: "HTML" }
      );
      return;
    }

    const statusIcons: Record<string, string> = {
      active: "🟢",
      completed: "✅",
      archived: "📦",
    };

    let msg = "<b>📋 Discussions</b>\n\n";
    for (const d of discussions) {
      const icon = statusIcons[d.status] || "•";
      msg += `${icon} <b>${escapeHtml(d.title)}</b>\n`;
      msg += `   Status: ${d.status} · Messages: ${d.messages.length} · Insights: ${d.insights.length}\n`;
      msg += `   <code>${d.id}</code>\n\n`;
    }

    const parts = splitMessage(msg.trim());
    for (let i = 0; i < parts.length; i++) {
      const isLast = i === parts.length - 1;

      // Add inline buttons for the last part
      const buttons = discussions.slice(0, 5).flatMap((d) => [
        Markup.button.callback(`View ${d.id.slice(-6)}`, `view:discuss:${d.id}`),
        ...(d.status !== "archived"
          ? [
              Markup.button.callback(
                `Archive ${d.id.slice(-6)}`,
                `archive:discuss:${d.id}`
              ),
            ]
          : []),
      ]);

      // Group buttons into rows of 2
      const rows: ReturnType<typeof Markup.button.callback>[][] = [];
      for (let j = 0; j < buttons.length; j += 2) {
        rows.push(buttons.slice(j, j + 2));
      }

      await ctx.reply(parts[i], {
        parse_mode: "HTML",
        ...(isLast && rows.length > 0
          ? { reply_markup: Markup.inlineKeyboard(rows).reply_markup }
          : {}),
      });
    }
  } catch (err) {
    console.error("[discussions] Failed:", err);
    await ctx.reply(
      formatError(
        `Failed to list discussions: ${err instanceof Error ? err.message : String(err)}`
      ),
      { parse_mode: "HTML" }
    );
  }
}

// ── /enddiscuss ──────────────────────────────────────────────────────
export async function endDiscussCommand(
  ctx: Context,
  config: TelegramConfig
): Promise<void> {
  const chatId = ctx.chat?.id;
  if (!chatId) return;

  const discussionId = activeDiscussions.get(chatId);
  if (!discussionId) {
    await ctx.reply(
      formatInfo(
        "No active discussion. Start one with /discuss &lt;topic&gt;"
      ),
      { parse_mode: "HTML" }
    );
    return;
  }

  console.log(`[enddiscuss] Summarizing ${discussionId}`);

  await ctx.reply(formatInfo("Generating summary..."), {
    parse_mode: "HTML",
  });

  try {
    const facilitator = getFacilitator(config);
    const summary = await facilitator.summarizeDiscussion(discussionId);

    activeDiscussions.delete(chatId);

    const response = `📝 <b>Discussion Summary</b>\n\n${escapeHtml(summary)}`;
    const parts = splitMessage(response);

    for (let i = 0; i < parts.length; i++) {
      const isLast = i === parts.length - 1;
      await ctx.reply(parts[i], {
        parse_mode: "HTML",
        ...(isLast
          ? {
              reply_markup: Markup.inlineKeyboard([
                Markup.button.callback(
                  "View Full Discussion",
                  `view:discuss:${discussionId}`
                ),
              ]).reply_markup,
            }
          : {}),
      });
    }
  } catch (err) {
    console.error("[enddiscuss] Failed:", err);
    await ctx.reply(
      formatError(
        `Failed to end discussion: ${err instanceof Error ? err.message : String(err)}`
      ),
      { parse_mode: "HTML" }
    );
  }
}

/**
 * End a discussion by ID (used from callbacks).
 * Returns true if the discussion was active and ended.
 */
export async function endDiscussionById(
  ctx: Context,
  config: TelegramConfig,
  discussionId: string
): Promise<void> {
  const chatId = ctx.chat?.id;
  if (!chatId) return;

  console.log(`[enddiscuss:callback] Summarizing ${discussionId}`);

  try {
    const facilitator = getFacilitator(config);
    const summary = await facilitator.summarizeDiscussion(discussionId);

    // Clear from active map if it matches
    if (activeDiscussions.get(chatId) === discussionId) {
      activeDiscussions.delete(chatId);
    }

    const response = `📝 <b>Discussion Summary</b>\n\n${escapeHtml(summary)}`;
    const parts = splitMessage(response);

    for (let i = 0; i < parts.length; i++) {
      const isLast = i === parts.length - 1;
      await ctx.reply(parts[i], {
        parse_mode: "HTML",
        ...(isLast
          ? {
              reply_markup: Markup.inlineKeyboard([
                Markup.button.callback(
                  "View Full Discussion",
                  `view:discuss:${discussionId}`
                ),
              ]).reply_markup,
            }
          : {}),
      });
    }
  } catch (err) {
    console.error("[enddiscuss:callback] Failed:", err);
    await ctx.reply(
      formatError(
        `Failed to end discussion: ${err instanceof Error ? err.message : String(err)}`
      ),
      { parse_mode: "HTML" }
    );
  }
}

/**
 * View a discussion's full markdown content.
 */
export async function viewDiscussion(
  ctx: Context,
  config: TelegramConfig,
  discussionId: string
): Promise<void> {
  try {
    const manager = getDiscussionManager(config);
    const markdown = manager.getMarkdown(discussionId);

    if (!markdown) {
      await ctx.reply(formatError(`Discussion not found: ${discussionId}`), {
        parse_mode: "HTML",
      });
      return;
    }

    const parts = splitMessage(escapeHtml(markdown));
    for (const part of parts) {
      await ctx.reply(`<pre>${part}</pre>`, { parse_mode: "HTML" });
    }
  } catch (err) {
    console.error("[view:discuss] Failed:", err);
    await ctx.reply(
      formatError(
        `Failed to view discussion: ${err instanceof Error ? err.message : String(err)}`
      ),
      { parse_mode: "HTML" }
    );
  }
}

/**
 * Archive a discussion by ID.
 */
export async function archiveDiscussion(
  ctx: Context,
  config: TelegramConfig,
  discussionId: string
): Promise<void> {
  try {
    const manager = getDiscussionManager(config);
    manager.archive(discussionId);

    try {
      await ctx.editMessageText(
        `📦 Discussion <code>${escapeHtml(discussionId)}</code> archived.`,
        { parse_mode: "HTML" }
      );
    } catch {
      await ctx.reply(
        `📦 Discussion <code>${escapeHtml(discussionId)}</code> archived.`,
        { parse_mode: "HTML" }
      );
    }
  } catch (err) {
    console.error("[archive:discuss] Failed:", err);
    await ctx.reply(
      formatError(
        `Failed to archive discussion: ${err instanceof Error ? err.message : String(err)}`
      ),
      { parse_mode: "HTML" }
    );
  }
}
