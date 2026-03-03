/**
 * Predefined response message templates for common bot interactions.
 *
 * All messages use HTML formatting for Telegram.
 */

import { bold, codeBlock, escapeHtml, italic } from "./format.js";

// ─── Welcome & Help ─────────────────────────────────────────────────────────

export function welcomeMessage(): string {
  return [
    `${bold("🤖 Locus Telegram Bot")}`,
    "",
    "Control your Locus agent directly from Telegram.",
    "",
    `${bold("Locus Commands")}`,
    "/run [issue#...] — Execute issues",
    "/status — Dashboard view",
    "/issues [filters] — List issues",
    "/issue &lt;#&gt; — Show issue details",
    "/sprint [sub] — Sprint management",
    "/plan [args] — AI planning",
    "/review &lt;pr#&gt; — Code review",
    "/iterate &lt;pr#&gt; — Re-execute with feedback",
    "/discuss [topic] — AI discussion",
    "/exec [prompt] — REPL / one-shot",
    "/logs — View logs",
    "/config [path] — View config",
    "/artifacts — View artifacts",
    "",
    `${bold("Git Commands")}`,
    "/gitstatus — Git status",
    "/stage [files|.] — Stage files",
    "/commit &lt;message&gt; — Commit changes",
    "/stash [pop|list|drop] — Stash operations",
    "/branch [name] — List/create branches",
    "/checkout &lt;branch&gt; — Switch branch",
    "/diff — Show diff",
    "/pr &lt;title&gt; — Create pull request",
    "",
    `${bold("Service Commands")}`,
    "/service start|stop|restart|status|logs",
    "",
    "/help — Show this message",
  ].join("\n");
}

// ─── Plan Messages ──────────────────────────────────────────────────────────

export function planCreatedMessage(planOutput: string): string {
  return [
    `📋 ${bold("Plan Created")}`,
    "",
    codeBlock(planOutput),
    "",
    italic("Use the buttons below to approve or reject the plan."),
  ].join("\n");
}

export function planApprovedMessage(): string {
  return `✅ ${bold("Plan Approved")} — Proceeding with execution.`;
}

export function planRejectedMessage(): string {
  return `❌ ${bold("Plan Rejected")} — No changes will be made.`;
}

// ─── Run Messages ───────────────────────────────────────────────────────────

export function runStartedMessage(target: string): string {
  return `🚀 ${bold("Run Started")} — ${escapeHtml(target)}`;
}

export function runCompletedMessage(target: string, prNumber?: number): string {
  const lines = [`✅ ${bold("Run Completed")} — ${escapeHtml(target)}`];
  if (prNumber) {
    lines.push("", `Pull Request: #${prNumber}`);
  }
  return lines.join("\n");
}

export function runFailedMessage(target: string, error: string): string {
  return [
    `❌ ${bold("Run Failed")} — ${escapeHtml(target)}`,
    "",
    codeBlock(error),
  ].join("\n");
}

// ─── Review Messages ────────────────────────────────────────────────────────

export function reviewStartedMessage(prNumber: number): string {
  return `🔍 ${bold("Reviewing")} PR #${prNumber}...`;
}

export function reviewCompletedMessage(
  prNumber: number,
  output: string
): string {
  return [
    `✅ ${bold("Review Complete")} — PR #${prNumber}`,
    "",
    codeBlock(output),
  ].join("\n");
}

// ─── Git Messages ───────────────────────────────────────────────────────────

export function gitCommitMessage(message: string, hash: string): string {
  return [
    `✅ ${bold("Committed")}`,
    "",
    `Message: ${escapeHtml(message)}`,
    `Hash: ${escapeHtml(hash)}`,
  ].join("\n");
}

export function gitBranchCreatedMessage(name: string): string {
  return `✅ Branch ${bold(escapeHtml(name))} created.`;
}

export function gitCheckoutMessage(branch: string): string {
  return `✅ Switched to branch ${bold(escapeHtml(branch))}.`;
}

export function gitStashMessage(action: string): string {
  return `✅ ${bold("Stash")} — ${escapeHtml(action)} completed.`;
}

export function prCreatedMessage(prNumber: number, url: string): string {
  return [
    `✅ ${bold("Pull Request Created")}`,
    "",
    `PR #${prNumber}: ${escapeHtml(url)}`,
  ].join("\n");
}

// ─── Service Messages ───────────────────────────────────────────────────────

export function serviceStatusMessage(
  status: string,
  pid: number | null,
  uptime: number | null,
  memory: number | null,
  restarts: number
): string {
  const uptimeStr = uptime ? formatUptime(uptime) : "N/A";
  const memoryStr = memory ? formatMemory(memory) : "N/A";

  return [
    `🤖 ${bold("Locus Telegram Bot")}`,
    "",
    `Status: ${bold(status)}`,
    `PID: ${pid ?? "N/A"}`,
    `Uptime: ${uptimeStr}`,
    `Memory: ${memoryStr}`,
    `Restarts: ${restarts}`,
  ].join("\n");
}

export function serviceNotRunningMessage(): string {
  return [
    `⚠️ ${bold("Bot Not Running")}`,
    "",
    "Start the bot with:",
    `${bold("locus pkg telegram start")}`,
  ].join("\n");
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function formatUptime(startTimeMs: number): string {
  const diff = Date.now() - startTimeMs;
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days}d ${hours % 24}h`;
  if (hours > 0) return `${hours}h ${minutes % 60}m`;
  if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
  return `${seconds}s`;
}

function formatMemory(bytes: number): string {
  const mb = bytes / (1024 * 1024);
  return `${mb.toFixed(1)} MB`;
}
