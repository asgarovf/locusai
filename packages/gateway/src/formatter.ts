/**
 * MessageFormatter — adapts gateway output to each platform's capabilities.
 *
 * Handles format conversion (plain/markdown/html) and message splitting
 * based on platform constraints.
 */

import type { PlatformCapabilities } from "./types.js";

/** Determine the best output format for a platform. */
export function bestFormat(
  capabilities: PlatformCapabilities
): "plain" | "markdown" | "html" {
  if (capabilities.supportsHTML) return "html";
  if (capabilities.supportsMarkdown) return "markdown";
  return "plain";
}

/** Split long text into chunks respecting platform message limits. */
export function splitMessage(text: string, maxLength: number): string[] {
  if (text.length <= maxLength) return [text];

  const chunks: string[] = [];
  let remaining = text;

  while (remaining.length > 0) {
    if (remaining.length <= maxLength) {
      chunks.push(remaining);
      break;
    }

    // Try to split at a newline
    let splitIdx = remaining.lastIndexOf("\n", maxLength);
    if (splitIdx === -1 || splitIdx < maxLength / 2) {
      splitIdx = maxLength;
    }

    chunks.push(remaining.slice(0, splitIdx));
    remaining = remaining.slice(splitIdx);
  }

  return chunks;
}

/** Truncate text to a max length, appending indicator if truncated. */
export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength - 20)}\n\n... (truncated)`;
}
