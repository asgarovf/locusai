import type { EventEmitter } from "node:events";
import type { Suggestion } from "@locusai/shared";
import type { Telegraf } from "telegraf";
import { Markup } from "telegraf";
import { escapeHtml, truncateOutput } from "./formatter.js";

// Job event names (mirrored from @locusai/sdk/node JobEvent enum to avoid
// pulling in Node-only exports at the package level).
const JOB_STARTED = "JOB_STARTED";
const JOB_COMPLETED = "JOB_COMPLETED";
const JOB_FAILED = "JOB_FAILED";
const PROPOSALS_GENERATED = "PROPOSALS_GENERATED";

// ── Job result types (structural — avoids hard dependency on sdk/node) ──

interface JobResultPayload {
  summary: string;
  suggestions: Array<{
    type: string;
    title: string;
    description: string;
    metadata?: Record<string, unknown>;
  }>;
  filesChanged: number;
  prUrl?: string;
  errors?: string[];
}

interface JobStartedPayload {
  jobType: string;
  jobRunId: string;
}

interface JobCompletedPayload {
  jobType: string;
  jobRunId: string;
  result: JobResultPayload;
}

interface JobFailedPayload {
  jobType: string;
  jobRunId: string;
  error: string;
}

// ── Display names ───────────────────────────────────────────────────────

const JOB_DISPLAY_NAMES: Record<string, string> = {
  LINT_SCAN: "Lint Scan",
  DEPENDENCY_CHECK: "Dependency Check",
  TODO_CLEANUP: "TODO Cleanup",
  FLAKY_TEST_DETECTION: "Flaky Test Detection",
  CUSTOM: "Custom",
};

function formatJobName(jobType: string): string {
  return JOB_DISPLAY_NAMES[jobType] ?? jobType;
}

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
// JobNotifier
// ============================================================================

/**
 * Sends Telegram messages in response to job lifecycle events.
 *
 * Usage:
 *   const notifier = new JobNotifier(bot, chatId);
 *   notifier.connect(client.emitter); // subscribes to JOB_* events
 */
export class JobNotifier {
  constructor(
    private readonly bot: Telegraf,
    private readonly chatId: number
  ) {}

  /**
   * Subscribe to job lifecycle events on the given emitter.
   * Typically called with `client.emitter` from a LocusClient that
   * is also used by a JobRunner / JobScheduler.
   */
  connect(emitter: EventEmitter): void {
    emitter.on(JOB_STARTED, (payload: JobStartedPayload) => {
      this.notifyJobStarted(
        payload.jobType,
        formatJobName(payload.jobType)
      ).catch((err) =>
        console.error("[notifier] Failed to send JOB_STARTED:", err)
      );
    });

    emitter.on(JOB_COMPLETED, (payload: JobCompletedPayload) => {
      this.notifyJobCompleted(payload).catch((err) =>
        console.error("[notifier] Failed to send JOB_COMPLETED:", err)
      );
    });

    emitter.on(JOB_FAILED, (payload: JobFailedPayload) => {
      this.notifyJobFailed(payload.jobType, payload.error).catch((err) =>
        console.error("[notifier] Failed to send JOB_FAILED:", err)
      );
    });

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

  // ── Lifecycle notifications ─────────────────────────────────────────

  async notifyJobStarted(jobType: string, jobName: string): Promise<void> {
    const msg =
      `🔄 <b>Starting:</b> ${escapeHtml(jobName)}\n` +
      `<b>Type:</b> <code>${escapeHtml(jobType)}</code>`;

    await this.bot.telegram.sendMessage(this.chatId, msg, {
      parse_mode: "HTML",
    });
  }

  async notifyJobCompleted(payload: JobCompletedPayload): Promise<void> {
    const { jobType, result } = payload;
    const jobName = formatJobName(jobType);

    let msg = `✅ <b>${escapeHtml(jobName)}</b> completed\n\n`;
    msg += `${escapeHtml(truncateOutput(result.summary, 500))}\n\n`;
    msg += `<b>Files changed:</b> ${result.filesChanged}\n`;
    msg += `<b>Suggestions:</b> ${result.suggestions.length}\n`;

    if (result.prUrl) {
      msg += `<b>PR:</b> <a href="${escapeHtml(result.prUrl)}">${escapeHtml(result.prUrl)}</a>\n`;
    }

    if (result.errors?.length) {
      msg += "\n<b>Errors:</b>\n";
      for (const err of result.errors.slice(0, 5)) {
        msg += `⚠️ ${escapeHtml(err)}\n`;
      }
    }

    const buttons: ReturnType<typeof Markup.button.url>[][] = [];
    if (result.prUrl) {
      buttons.push([Markup.button.url("🔗 View PR", result.prUrl)]);
    }

    await this.bot.telegram.sendMessage(this.chatId, msg, {
      parse_mode: "HTML",
      link_preview_options: { is_disabled: true },
      ...(buttons.length > 0 ? Markup.inlineKeyboard(buttons) : {}),
    });
  }

  async notifyJobFailed(jobType: string, error: string): Promise<void> {
    const jobName = formatJobName(jobType);
    const msg =
      `❌ <b>${escapeHtml(jobName)}</b> failed\n\n` +
      `<b>Error:</b> ${escapeHtml(truncateOutput(error, 1000))}`;

    await this.bot.telegram.sendMessage(this.chatId, msg, {
      parse_mode: "HTML",
    });
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
