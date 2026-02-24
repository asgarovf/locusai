/**
 * Tab completion for the REPL.
 * Handles slash commands and file paths.
 */

import { readdirSync } from "node:fs";
import { basename, dirname, join } from "node:path";

export interface CompletionProvider {
  /** Get completion for the current input. Returns the completed text, or null. */
  complete(input: string): string | null;
}

export class SlashCommandCompletion implements CompletionProvider {
  private commands: string[];
  private lastInput: string = "";
  private matchIndex: number = 0;
  private matches: string[] = [];

  constructor(commands: string[]) {
    this.commands = commands.sort();
  }

  complete(input: string): string | null {
    // Only complete slash commands
    if (!input.startsWith("/")) return null;

    // Reset cycle if input changed
    if (input !== this.lastInput) {
      this.lastInput = input;
      this.matchIndex = 0;
      this.matches = this.commands.filter((cmd) => cmd.startsWith(input));
    } else {
      // Cycle through matches
      this.matchIndex = (this.matchIndex + 1) % this.matches.length;
    }

    if (this.matches.length === 0) return null;
    return this.matches[this.matchIndex];
  }
}

export class FilePathCompletion implements CompletionProvider {
  private projectRoot: string;
  private lastInput: string = "";
  private matchIndex: number = 0;
  private matches: string[] = [];

  constructor(projectRoot: string) {
    this.projectRoot = projectRoot;
  }

  complete(input: string): string | null {
    // Don't complete slash commands or empty input
    if (input.startsWith("/") || !input.trim()) return null;

    // Look for file path patterns in the input
    const words = input.split(/\s+/);
    const lastWord = words[words.length - 1];

    if (!lastWord || lastWord.length < 2) return null;

    // Reset cycle if input changed
    if (input !== this.lastInput) {
      this.lastInput = input;
      this.matchIndex = 0;
      this.matches = this.findMatches(lastWord);
    } else {
      this.matchIndex = (this.matchIndex + 1) % this.matches.length;
    }

    if (this.matches.length === 0) return null;

    // Replace last word with the match
    words[words.length - 1] = this.matches[this.matchIndex];
    return words.join(" ");
  }

  private findMatches(partial: string): string[] {
    try {
      const dir = partial.includes("/")
        ? join(this.projectRoot, dirname(partial))
        : this.projectRoot;
      const prefix = basename(partial);

      const entries = readdirSync(dir, { withFileTypes: true });
      return entries
        .filter((e) => {
          // Skip hidden files and common junk
          if (e.name.startsWith(".")) return false;
          if (e.name === "node_modules") return false;
          return e.name.startsWith(prefix);
        })
        .map((e) => {
          const name = e.isDirectory() ? `${e.name}/` : e.name;
          return partial.includes("/") ? `${dirname(partial)}/${name}` : name;
        })
        .slice(0, 20); // Limit results
    } catch {
      return [];
    }
  }
}

/**
 * Combined completion provider that tries slash commands first,
 * then file paths.
 */
export class CombinedCompletion implements CompletionProvider {
  private providers: CompletionProvider[];

  constructor(providers: CompletionProvider[]) {
    this.providers = providers;
  }

  complete(input: string): string | null {
    for (const provider of this.providers) {
      const result = provider.complete(input);
      if (result !== null) return result;
    }
    return null;
  }
}
