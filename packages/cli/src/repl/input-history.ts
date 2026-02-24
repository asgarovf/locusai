/**
 * Persistent input history for the REPL.
 * Stores history across sessions in .locus/sessions/.input-history.
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

const MAX_ENTRIES = 500;

export class InputHistory {
  private entries: string[] = [];
  private filePath: string;

  constructor(projectRoot: string) {
    this.filePath = join(projectRoot, ".locus", "sessions", ".input-history");
    this.load();
  }

  /** Add an entry to history. Deduplicates consecutive identical entries. */
  add(text: string): void {
    const trimmed = text.trim();
    if (!trimmed) return;

    // Deduplicate: don't add if same as most recent
    if (this.entries.length > 0 && this.entries[0] === trimmed) {
      return;
    }

    // Remove any existing identical entry (move to front)
    const existing = this.entries.indexOf(trimmed);
    if (existing !== -1) {
      this.entries.splice(existing, 1);
    }

    // Add to front (most recent first)
    this.entries.unshift(trimmed);

    // Trim to max size
    if (this.entries.length > MAX_ENTRIES) {
      this.entries = this.entries.slice(0, MAX_ENTRIES);
    }

    this.save();
  }

  /** Get all history entries (most recent first). */
  getEntries(): string[] {
    return [...this.entries];
  }

  /** Get entry at index (0 = most recent). */
  get(index: number): string | undefined {
    return this.entries[index];
  }

  /** Get the number of entries. */
  get length(): number {
    return this.entries.length;
  }

  /** Search entries by prefix. Returns matching entries. */
  search(prefix: string): string[] {
    const lower = prefix.toLowerCase();
    return this.entries.filter((e) => e.toLowerCase().startsWith(lower));
  }

  /** Clear all history. */
  clear(): void {
    this.entries = [];
    this.save();
  }

  // ─── Persistence ──────────────────────────────────────────────────────────

  private load(): void {
    try {
      if (!existsSync(this.filePath)) return;
      const content = readFileSync(this.filePath, "utf-8");
      this.entries = content
        .split("\n")
        .map((line) => this.unescape(line))
        .filter(Boolean);
    } catch {
      // Start with empty history
    }
  }

  private save(): void {
    try {
      const dir = dirname(this.filePath);
      if (!existsSync(dir)) {
        mkdirSync(dir, { recursive: true });
      }
      const content = this.entries.map((e) => this.escape(e)).join("\n");
      writeFileSync(this.filePath, content, "utf-8");
    } catch {
      // Silently ignore save errors
    }
  }

  // Escape newlines so each history entry is one file line
  private escape(text: string): string {
    return text.replace(/\\/g, "\\\\").replace(/\n/g, "\\n");
  }

  private unescape(text: string): string {
    return text.replace(/\\n/g, "\n").replace(/\\\\/g, "\\");
  }
}
