/**
 * Inline keyboard builders for interactive Telegram responses.
 *
 * Keyboards are attached to messages to let users take actions
 * without typing commands manually.
 */

import { InlineKeyboard } from "grammy";

// ─── Callback Data Prefixes ─────────────────────────────────────────────────

export const CB = {
  APPROVE_PLAN: "plan:approve:",
  REJECT_PLAN: "plan:reject",
  SPRINT_ACTIVE: "sprint:active:",
  RUN_START: "run:start",
  CONFIRM_ACTION: "confirm:yes",
  CANCEL_ACTION: "confirm:no",
  VIEW_PR: "pr:view:",
  VIEW_LOGS: "logs:view",
  RUN_AGAIN: "run:again:",
  APPROVE_REVIEW: "review:approve:",
  REQUEST_CHANGES: "review:changes:",
  VIEW_DIFF: "review:diff:",
  RUN_SPRINT: "sprint:run",
  VIEW_ISSUES: "issues:view",
  STASH_POP: "stash:pop",
  STASH_LIST: "stash:list",
  STASH_DROP: "stash:drop",
} as const;

// ─── Keyboard Builders ──────────────────────────────────────────────────────

/** Keyboard shown after plan creation (sprint required for approval). */
export function planKeyboard(
  planId: string,
  sprintName: string
): InlineKeyboard {
  return new InlineKeyboard()
    .text(
      "✅ Approve Plan",
      `${CB.APPROVE_PLAN}${planId}:${sprintName}`
    )
    .text("❌ Reject Plan", CB.REJECT_PLAN);
}

/** Keyboard shown after plan approval with a sprint. */
export function sprintActiveKeyboard(sprintName: string): InlineKeyboard {
  return new InlineKeyboard().text(
    "🚀 Activate Sprint",
    `${CB.SPRINT_ACTIVE}${sprintName}`
  );
}

/** Simple run keyboard. */
export function runKeyboard(): InlineKeyboard {
  return new InlineKeyboard().text("🚀 Run", CB.RUN_START);
}

/** Keyboard shown after a run completes. */
export function runCompleteKeyboard(issueNumber?: number): InlineKeyboard {
  const kb = new InlineKeyboard();
  kb.text("📄 View Logs", CB.VIEW_LOGS);
  if (issueNumber) {
    kb.text("🔄 Run Again", `${CB.RUN_AGAIN}${issueNumber}`);
  }
  return kb;
}

/** Keyboard shown after review. */
export function reviewKeyboard(prNumber: number): InlineKeyboard {
  return new InlineKeyboard()
    .text("✅ Approve", `${CB.APPROVE_REVIEW}${prNumber}`)
    .text("🔄 Request Changes", `${CB.REQUEST_CHANGES}${prNumber}`)
    .row()
    .text("📝 View Diff", `${CB.VIEW_DIFF}${prNumber}`);
}

/** Confirmation keyboard for destructive operations. */
export function confirmKeyboard(): InlineKeyboard {
  return new InlineKeyboard()
    .text("✅ Confirm", CB.CONFIRM_ACTION)
    .text("❌ Cancel", CB.CANCEL_ACTION);
}

/** Keyboard shown after status check. */
export function statusKeyboard(): InlineKeyboard {
  return new InlineKeyboard()
    .text("🚀 Run Sprint", CB.RUN_SPRINT)
    .text("📋 Issues", CB.VIEW_ISSUES)
    .row()
    .text("📄 Logs", CB.VIEW_LOGS);
}

/** Keyboard for stash operations. */
export function stashKeyboard(): InlineKeyboard {
  return new InlineKeyboard()
    .text("📤 Pop", CB.STASH_POP)
    .text("📋 List", CB.STASH_LIST)
    .text("🗑 Drop", CB.STASH_DROP);
}
