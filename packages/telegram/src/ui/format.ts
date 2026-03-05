/**
 * Output formatting utilities for Telegram messages.
 *
 * Telegram supports a subset of Markdown (MarkdownV2) and HTML.
 * We use HTML mode for reliability — fewer escaping issues than MarkdownV2.
 */

/** Maximum Telegram message length (4096 chars). */
const MAX_MESSAGE_LENGTH = 4096;

/** Maximum length for a code block inside a message. */
const MAX_CODE_LENGTH = 3800;

/** Escape HTML special characters for Telegram HTML mode. */
export function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/** Wrap text in a code block. */
export function codeBlock(text: string, language = ""): string {
  const truncated = truncate(text, MAX_CODE_LENGTH);
  return `<pre><code${language ? ` class="language-${language}"` : ""}>${escapeHtml(truncated)}</code></pre>`;
}

/** Wrap text in inline code. */
export function inlineCode(text: string): string {
  return `<code>${escapeHtml(text)}</code>`;
}

/** Bold text. */
export function bold(text: string): string {
  return `<b>${text}</b>`;
}

/** Italic text. */
export function italic(text: string): string {
  return `<i>${text}</i>`;
}

/** Truncate text to a max length, appending "..." if truncated. */
export function truncate(text: string, maxLength = MAX_MESSAGE_LENGTH): string {
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength - 20)}\n\n... (truncated)`;
}

/** Split long output into multiple messages if needed. */
export function splitMessage(text: string): string[] {
  if (text.length <= MAX_MESSAGE_LENGTH) return [text];

  const chunks: string[] = [];
  let remaining = text;

  while (remaining.length > 0) {
    if (remaining.length <= MAX_MESSAGE_LENGTH) {
      chunks.push(remaining);
      break;
    }

    // Try to split at a newline
    let splitIdx = remaining.lastIndexOf("\n", MAX_MESSAGE_LENGTH);
    if (splitIdx === -1 || splitIdx < MAX_MESSAGE_LENGTH / 2) {
      splitIdx = MAX_MESSAGE_LENGTH;
    }

    chunks.push(remaining.slice(0, splitIdx));
    remaining = remaining.slice(splitIdx);
  }

  return chunks;
}

/** Format a command result as a Telegram message. */
export function formatCommandResult(
  command: string,
  output: string,
  exitCode: number
): string {
  const status = exitCode === 0 ? "✅" : "❌";
  const header = `${status} ${bold(escapeHtml(command))}`;

  if (!output.trim()) {
    return exitCode === 0
      ? `${header}\n\nCompleted successfully.`
      : `${header}\n\nFailed with exit code ${exitCode}.`;
  }

  return `${header}\n\n${codeBlock(output.trim())}`;
}

/** Format a streaming progress message. */
export function formatStreamingMessage(
  command: string,
  output: string,
  isComplete: boolean
): string {
  const status = isComplete ? "✅" : "⏳";
  const header = `${status} ${bold(escapeHtml(command))}`;

  if (!output.trim()) {
    return `${header}\n\n${italic("Running...")}\n\n${italic("Send /cancel to abort")}`;
  }

  // Take last N lines for streaming display
  const lines = output.trim().split("\n");
  const lastLines = lines.slice(-30).join("\n");

  const hint = isComplete ? "" : `\n\n${italic("Send /cancel to abort")}`;
  return `${header}\n\n${codeBlock(lastLines)}${hint}`;
}

/** Format a concurrency conflict message. */
export function formatConflictMessage(
  blockedCommand: string,
  running: { command: string; args: string[] }
): string {
  const runningLabel = `/${escapeHtml(running.command)}${running.args.length ? ` ${escapeHtml(running.args.join(" "))}` : ""}`;
  return `⚠️ ${bold(escapeHtml(`/${blockedCommand}`))} cannot start — ${bold(runningLabel)} is already running.\n\nSend /cancel to abort it, or wait for it to finish.`;
}

/** Format an error message. */
export function formatError(message: string, detail?: string): string {
  let text = `❌ ${bold("Error")}\n\n${escapeHtml(message)}`;
  if (detail) {
    text += `\n\n${codeBlock(detail)}`;
  }
  return text;
}

/** Format a success message. */
export function formatSuccess(message: string): string {
  return `✅ ${escapeHtml(message)}`;
}

/** Format an info message. */
export function formatInfo(message: string): string {
  return `ℹ️ ${escapeHtml(message)}`;
}
