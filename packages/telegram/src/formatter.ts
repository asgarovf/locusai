/**
 * Telegram message formatting utilities.
 * Telegram has a 4096 character limit per message.
 * We use MarkdownV2 formatting where needed.
 */

const MAX_MESSAGE_LENGTH = 4000; // Leave some room for formatting

/**
 * Strip ANSI escape codes from text.
 * Removes color codes like [34m, [1m, [0m, etc.
 */
export function stripAnsi(text: string): string {
  // biome-ignore lint: regex for ANSI escape sequences
  return text.replace(/\x1b\[[0-9;]*[a-zA-Z]|\x1b\].*?\x07/g, "");
}

/**
 * Escape special characters for Telegram MarkdownV2
 */
export function escapeMarkdown(text: string): string {
  return text.replace(/([_*[\]()~`>#+\-=|{}.!\\])/g, "\\$1");
}

/**
 * Truncate long output for Telegram, preserving the beginning and end
 */
export function truncateOutput(
  text: string,
  maxLength = MAX_MESSAGE_LENGTH
): string {
  if (text.length <= maxLength) return text;

  const halfLen = Math.floor((maxLength - 50) / 2);
  const start = text.slice(0, halfLen);
  const end = text.slice(-halfLen);
  return `${start}\n\n... (truncated ${text.length - maxLength} chars) ...\n\n${end}`;
}

/**
 * Format command output as a Telegram message with code block
 */
export function formatCommandOutput(
  command: string,
  output: string,
  exitCode: number | null
): string {
  const status =
    exitCode === 0 ? "completed" : `failed (exit code: ${exitCode})`;
  const cleanOutput = stripAnsi(output);
  const truncated = truncateOutput(cleanOutput, MAX_MESSAGE_LENGTH - 200);

  let msg = `<b>Command:</b> <code>${escapeHtml(command)}</code>\n`;
  msg += `<b>Status:</b> ${exitCode === 0 ? "✅" : "❌"} ${escapeHtml(status)}\n\n`;

  if (truncated.trim()) {
    msg += `<pre>${escapeHtml(truncated)}</pre>`;
  } else {
    msg += "<i>No output</i>";
  }

  return msg;
}

/**
 * Format an error message
 */
export function formatError(message: string): string {
  return `❌ <b>Error:</b> ${escapeHtml(message)}`;
}

/**
 * Format a success message
 */
export function formatSuccess(message: string): string {
  return `✅ ${escapeHtml(message)}`;
}

/**
 * Format an info message
 */
export function formatInfo(message: string): string {
  return `ℹ️ ${escapeHtml(message)}`;
}

/**
 * Escape HTML entities for Telegram HTML parse mode
 */
export function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/**
 * Split a long message into multiple Telegram messages
 */
export function splitMessage(
  text: string,
  maxLength = MAX_MESSAGE_LENGTH
): string[] {
  if (text.length <= maxLength) return [text];

  const messages: string[] = [];
  let remaining = text;

  while (remaining.length > 0) {
    if (remaining.length <= maxLength) {
      messages.push(remaining);
      break;
    }

    // Try to split at a newline
    let splitIndex = remaining.lastIndexOf("\n", maxLength);
    if (splitIndex === -1 || splitIndex < maxLength / 2) {
      splitIndex = maxLength;
    }

    messages.push(remaining.slice(0, splitIndex));
    remaining = remaining.slice(splitIndex);
  }

  return messages;
}
