import { c } from "@locusai/sdk/node";

/**
 * ANSI escape codes for cursor and screen control.
 */
const ANSI = {
  HIDE_CURSOR: "\x1b[?25l",
  SHOW_CURSOR: "\x1b[?25h",
  SAVE_CURSOR: "\x1b7",
  RESTORE_CURSOR: "\x1b8",
  MOVE_TO_TOP: "\x1b[1;1H",
  CLEAR_LINE: "\x1b[2K",
  SCROLL_DOWN: "\x1b[1S",
  SET_SCROLL_REGION: (top: number, bottom: number) => `\x1b[${top};${bottom}r`,
  RESET_SCROLL_REGION: "\x1b[r",
};

/**
 * Spinner frames using braille patterns for smooth animation.
 */
const SPINNER_FRAMES = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"];

/**
 * Tool icons for visual identification in status bar.
 */
const TOOL_ICONS: Record<string, string> = {
  Read: "📖",
  Write: "✍️",
  Edit: "✏️",
  Bash: "⚡",
  Grep: "🔍",
  Glob: "📁",
  WebFetch: "🌐",
  Task: "🤖",
  Search: "🔎",
  List: "📋",
};

/**
 * Human-readable tool messages.
 */
const TOOL_MESSAGES: Record<string, string> = {
  Read: "Reading",
  Write: "Writing",
  Edit: "Editing",
  Bash: "Running",
  Grep: "Searching",
  Glob: "Finding",
  WebFetch: "Fetching",
  Task: "Spawning",
  Search: "Searching",
  List: "Listing",
};

export interface StatusBarOptions {
  /** Whether to enable the status bar (default: true) */
  enabled?: boolean;
}

/**
 * Top-of-screen status bar showing current activity.
 *
 * Features:
 * - Fixed position at top of terminal
 * - Real-time activity indicator with spinner
 * - Progress percentage display
 * - Terminal resize handling
 * - Non-intrusive rendering using cursor save/restore
 */
export class StatusBar {
  private isVisible = false;
  private currentStatus = "";
  private spinnerInterval: ReturnType<typeof setInterval> | null = null;
  private spinnerFrameIndex = 0;
  private enabled: boolean;
  private resizeHandler: (() => void) | null = null;
  private isScrollRegionSet = false;

  constructor(options: StatusBarOptions = {}) {
    this.enabled = options.enabled ?? true;
  }

  /**
   * Show the status bar with the given status message.
   */
  show(status: string): void {
    if (!this.enabled) return;

    if (!this.isVisible) {
      this.setupScrollRegion();
      this.attachResizeHandler();
      process.stdout.write(ANSI.HIDE_CURSOR);
      this.isVisible = true;
    }

    this.currentStatus = status;
    this.render();
  }

  /**
   * Show status with animated spinner.
   */
  showWithSpinner(status: string): void {
    if (!this.enabled) return;

    this.show(status);
    this.startSpinner();
  }

  /**
   * Show thinking indicator.
   */
  showThinking(): void {
    this.showWithSpinner("🤔 Thinking...\n");
  }

  /**
   * Show tool execution status.
   */
  showTool(toolName: string, detail?: string): void {
    const icon = TOOL_ICONS[toolName] ?? "🔧";
    const message = TOOL_MESSAGES[toolName] ?? toolName;
    const fullStatus = detail
      ? `${icon} ${message}: ${this.truncate(detail, 40)}`
      : `${icon} ${message}...`;
    this.showWithSpinner(fullStatus);
  }

  /**
   * Hide the status bar and restore normal terminal behavior.
   */
  hide(): void {
    if (!this.isVisible) return;

    this.stopSpinner();
    this.clear();
    this.resetScrollRegion();
    this.detachResizeHandler();
    process.stdout.write(ANSI.SHOW_CURSOR);
    this.isVisible = false;
  }

  /**
   * Update the status bar with progress information.
   */
  updateProgress(current: number, total: number, label?: string): void {
    if (!this.enabled) return;

    const percentage = Math.round((current / total) * 100);
    const progressBar = this.createProgressBar(percentage);
    const labelText = label ? `${label}: ` : "Progress: ";
    const status = `${labelText}${progressBar} ${current}/${total} (${percentage}%)`;
    this.show(status);
  }

  /**
   * Check if the status bar is currently visible.
   */
  isActive(): boolean {
    return this.isVisible;
  }

  /**
   * Enable or disable the status bar.
   */
  setEnabled(enabled: boolean): void {
    if (!enabled && this.isVisible) {
      this.hide();
    }
    this.enabled = enabled;
  }

  /**
   * Set up scroll region to reserve top line for status bar.
   */
  private setupScrollRegion(): void {
    const rows = process.stdout.rows || 24;
    // Set scroll region from line 2 to bottom
    process.stdout.write(ANSI.SET_SCROLL_REGION(2, rows));
    // Move cursor to line 2 (first usable line)
    process.stdout.write("\x1b[2;1H");
    this.isScrollRegionSet = true;
  }

  /**
   * Reset the scroll region to normal.
   */
  private resetScrollRegion(): void {
    if (!this.isScrollRegionSet) return;
    process.stdout.write(ANSI.RESET_SCROLL_REGION);
    this.isScrollRegionSet = false;
  }

  /**
   * Render the status bar at the top of the terminal.
   */
  private render(): void {
    const width = process.stdout.columns || 80;
    const spinnerFrame = this.spinnerInterval
      ? SPINNER_FRAMES[this.spinnerFrameIndex]
      : "";

    // Build status text
    const statusText = spinnerFrame
      ? `${spinnerFrame} ${this.currentStatus}`
      : this.currentStatus;

    // Truncate if too long
    const displayText = this.truncate(statusText, width - 4);

    // Pad to fill width
    const paddedText = displayText.padEnd(width - 2);

    // Save cursor position
    process.stdout.write(ANSI.SAVE_CURSOR);

    // Move to top-left
    process.stdout.write(ANSI.MOVE_TO_TOP);

    // Clear the line
    process.stdout.write(ANSI.CLEAR_LINE);

    // Render the status bar with background color
    process.stdout.write(c.bgBlue(` ${paddedText} `));

    // Restore cursor position
    process.stdout.write(ANSI.RESTORE_CURSOR);
  }

  /**
   * Clear the status bar area.
   */
  private clear(): void {
    const width = process.stdout.columns || 80;

    // Save cursor position
    process.stdout.write(ANSI.SAVE_CURSOR);

    // Move to top-left
    process.stdout.write(ANSI.MOVE_TO_TOP);

    // Clear the line
    process.stdout.write(ANSI.CLEAR_LINE);
    process.stdout.write(" ".repeat(width));

    // Restore cursor position
    process.stdout.write(ANSI.RESTORE_CURSOR);
  }

  /**
   * Start the spinner animation.
   */
  private startSpinner(): void {
    if (this.spinnerInterval) return;

    this.spinnerFrameIndex = 0;

    this.spinnerInterval = setInterval(() => {
      this.spinnerFrameIndex =
        (this.spinnerFrameIndex + 1) % SPINNER_FRAMES.length;
      if (this.isVisible) {
        this.render();
      }
    }, 80);
  }

  /**
   * Stop the spinner animation.
   */
  private stopSpinner(): void {
    if (this.spinnerInterval) {
      clearInterval(this.spinnerInterval);
      this.spinnerInterval = null;
    }
  }

  /**
   * Attach handler for terminal resize events.
   */
  private attachResizeHandler(): void {
    if (this.resizeHandler) return;

    this.resizeHandler = () => {
      if (this.isVisible) {
        // Re-setup scroll region with new dimensions
        this.setupScrollRegion();
        this.render();
      }
    };

    process.stdout.on("resize", this.resizeHandler);
  }

  /**
   * Detach the terminal resize handler.
   */
  private detachResizeHandler(): void {
    if (this.resizeHandler) {
      process.stdout.off("resize", this.resizeHandler);
      this.resizeHandler = null;
    }
  }

  /**
   * Create a simple progress bar string.
   */
  private createProgressBar(percentage: number): string {
    const width = 20;
    const filled = Math.round((percentage / 100) * width);
    const empty = width - filled;
    return `[${"█".repeat(filled)}${"░".repeat(empty)}]`;
  }

  /**
   * Truncate a string to fit within the given width.
   */
  private truncate(text: string, maxLength: number): string {
    if (text.length <= maxLength) return text;
    return `${text.substring(0, maxLength - 3)}...`;
  }
}
