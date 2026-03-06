/**
 * CommandRouter — parses inbound text into structured commands or free-text.
 *
 * Platform adapters can customize the prefix (default "/") and
 * how arguments are extracted from raw message text.
 */

import type { FreeText, ParsedCommand } from "./types.js";

export class CommandRouter {
  private prefix: string;

  constructor(prefix = "/") {
    this.prefix = prefix;
  }

  /** Parse a message text into a command or free-text. */
  parse(text: string): ParsedCommand | FreeText {
    const trimmed = text.trim();

    if (!trimmed.startsWith(this.prefix)) {
      return { type: "freetext", text: trimmed };
    }

    // Extract command and args: "/command arg1 arg2"
    const withoutPrefix = trimmed.slice(this.prefix.length);
    const parts = withoutPrefix.split(/\s+/);
    const rawCommand = parts[0] ?? "";

    // Handle @botname suffix (e.g., "/run@MyBot arg1")
    const command = rawCommand.replace(/@\S+$/, "").toLowerCase();

    if (!command) {
      return { type: "freetext", text: trimmed };
    }

    const args = parts.slice(1);

    return {
      type: "command",
      command,
      args,
      raw: trimmed,
    };
  }
}
