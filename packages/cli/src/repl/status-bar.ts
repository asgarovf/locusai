import type { AiProvider } from "@locusai/sdk/node";
import type { REPLMode } from "./slash-commands";

export interface StatusBarState {
  provider: AiProvider;
  model: string;
  sessionId: string;
  mode: REPLMode;
  discussionId?: string;
}

/**
 * Persistent status line rendered at the top of the terminal.
 *
 * Uses ANSI escape codes to save/restore cursor position and write
 * a single-line status bar without disrupting normal output flow.
 */
export class StatusBar {
  private lastState: StatusBarState | null = null;

  /**
   * Render (or re-render) the status bar at the top of the terminal.
   */
  update(state: StatusBarState): void {
    this.lastState = state;
    this.render();
  }

  /**
   * Re-render the status bar using the last known state.
   * No-op if update() hasn't been called yet.
   */
  refresh(): void {
    if (this.lastState) {
      this.render();
    }
  }

  /**
   * Format the status bar content string (no ANSI positioning, just content).
   * Exported for testability.
   */
  formatContent(state: StatusBarState): string {
    const providerModel = `[${state.provider}:${state.model}]`;
    const sessionShort = `session:${state.sessionId.slice(0, 8)}`;

    let modeStr: string;
    if (state.mode === "discussion" && state.discussionId) {
      modeStr = `mode:discussion(${state.discussionId.slice(0, 8)})`;
    } else {
      modeStr = `mode:${state.mode}`;
    }

    const help = "/help for commands";

    return `${providerModel} | ${sessionShort} | ${modeStr} | ${help}`;
  }

  private render(): void {
    if (!this.lastState) return;

    const content = this.formatContent(this.lastState);
    const cols = process.stdout.columns || 80;

    // Truncate if terminal is too narrow
    const displayContent =
      content.length > cols ? `${content.slice(0, cols - 1)}…` : content;

    // Dim the status bar text
    const dimStart = "\x1b[2m";
    const dimEnd = "\x1b[0m";

    // Save cursor position, move to top-left, clear line, write, restore cursor
    const seq = [
      "\x1b7", // Save cursor position
      "\x1b[1;1H", // Move to row 1, col 1
      "\x1b[2K", // Clear entire line
      `${dimStart}${displayContent}${dimEnd}`,
      "\x1b8", // Restore cursor position
    ].join("");

    process.stdout.write(seq);
  }
}
