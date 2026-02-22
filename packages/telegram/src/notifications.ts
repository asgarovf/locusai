import type { EventEmitter } from "node:events";
import type { Suggestion } from "@locusai/shared";
import type { Telegraf } from "telegraf";
import { Markup } from "telegraf";
import { escapeHtml, truncateOutput } from "./formatter.js";

const PROPOSALS_GENERATED = "PROPOSALS_GENERATED";

// ── Complexity display ──────────────────────────────────────────────────

const COMPLEXITY_DISPLAY: Record<string, string> = {
  low: "2/5",
  medium: "3/5",
  high: "4/5",
};

// ── Suggestion type icons ───────────────────────────────────────────────

const SUGGESTION_TYPE_ICONS: Record<string, string> = {
  CODE_FIX: "🔧",
  DEPENDENCY_UPDATE: "📦",
  NEXT_STEP: "➡️",
  REFACTOR: "♻️",
  TEST_FIX: "🧪",
};

// ============================================================================
// Notifier
// ============================================================================

/**
 * Sends Telegram messages in response to proposal/suggestion events.
 *
 * Usage:
 *   const notifier = new Notifier(bot, chatId);
 *   notifier.connect(client.emitter); // subscribes to events
 */
export class Notifier {
  constructor(
    private readonly bot: Telegraf,
    private readonly chatId: number
  ) {}

  /**
   * Subscribe to proposal events on the given emitter.
   */
  connect(emitter: EventEmitter): void {
    emitter.on(
      PROPOSALS_GENERATED,
      (payload: { suggestions: Suggestion[] }) => {
        for (const suggestion of payload.suggestions) {
          this.notifyProposal(suggestion).catch((err) =>
            console.error("[notifier] Failed to send proposal:", err)
          );
        }
      }
    );
  }

  // ── Proposal notification ──────────────────────────────────────────

  async notifyProposal(suggestion: Suggestion): Promise<void> {
    const complexity =
      COMPLEXITY_DISPLAY[
        String(suggestion.metadata?.complexity).toLowerCase()
      ] ?? "3/5";

    const relatedTo =
      (suggestion.metadata?.relatedBacklogItem as string) || "New initiative";

    let msg = `💡 <b>Proposal:</b> ${escapeHtml(suggestion.title)}\n\n`;
    msg += `${escapeHtml(truncateOutput(suggestion.description, 800))}\n\n`;
    msg += `<b>Complexity:</b> ${escapeHtml(complexity)}\n`;
    msg += `<b>Related to:</b> ${escapeHtml(relatedTo)}`;

    const buttons = [
      [
        Markup.button.callback("▶️ Start", `proposal_start_${suggestion.id}`),
        Markup.button.callback("⏭ Skip", `proposal_skip_${suggestion.id}`),
        Markup.button.callback(
          "📋 Details",
          `proposal_details_${suggestion.id}`
        ),
      ],
    ];

    await this.bot.telegram.sendMessage(this.chatId, msg, {
      parse_mode: "HTML",
      ...Markup.inlineKeyboard(buttons),
    });
  }

  // ── Suggestion notification ─────────────────────────────────────────

  async notifySuggestion(suggestion: Suggestion): Promise<void> {
    const icon = SUGGESTION_TYPE_ICONS[suggestion.type] ?? "💡";

    let msg = `${icon} <b>Suggestion:</b> ${escapeHtml(suggestion.title)}\n\n`;
    msg += `${escapeHtml(truncateOutput(suggestion.description, 800))}\n`;
    msg += `\n<b>Type:</b> ${escapeHtml(suggestion.type)}`;

    const buttons = [
      [
        Markup.button.callback("🔧 Fix", `suggestion_fix_${suggestion.id}`),
        Markup.button.callback("⏭ Skip", `suggestion_skip_${suggestion.id}`),
        Markup.button.callback(
          "📋 Details",
          `suggestion_details_${suggestion.id}`
        ),
      ],
    ];

    await this.bot.telegram.sendMessage(this.chatId, msg, {
      parse_mode: "HTML",
      ...Markup.inlineKeyboard(buttons),
    });
  }
}
