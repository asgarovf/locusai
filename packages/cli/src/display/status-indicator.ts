/**
 * Animated status indicator — thinking/working states.
 * True-color shimmer for supported terminals, braille fallback otherwise.
 */

import { cyan, dim, getCapabilities, truncate, visualWidth } from "./terminal.js";

export interface StatusIndicatorOptions {
  /** Activity description, e.g., "editing src/app.ts". */
  activity?: string;
}

export class StatusIndicator {
  private timer: ReturnType<typeof setInterval> | null = null;
  private startTime: number = 0;
  private activity: string = "";
  private frame: number = 0;

  // Braille spinner frames (fallback)
  private static BRAILLE = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"];

  // Diamond character for shimmer
  private static DIAMOND = "◆";

  /** Start the indicator with an initial message. */
  start(message: string, options?: StatusIndicatorOptions): void {
    this.stop(); // Clear any existing indicator
    this.startTime = Date.now();
    this.activity = options?.activity ?? "";
    this.frame = 0;

    if (process.stderr.isTTY) {
      process.stderr.write("\x1b[?25l"); // hide cursor
    }

    this.timer = setInterval(() => {
      this.render(message);
      this.frame++;
    }, 80);
  }

  /** Update the activity text without restarting. */
  setActivity(activity: string): void {
    this.activity = activity;
  }

  /** Stop and clear the indicator. */
  stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    if (process.stderr.isTTY) {
      process.stderr.write("\x1b[2K\r\x1b[?25h"); // clear line + show cursor
    }
  }

  /** Check if the indicator is currently active. */
  isActive(): boolean {
    return this.timer !== null;
  }

  private render(message: string): void {
    const caps = getCapabilities();
    const elapsed = Math.floor((Date.now() - this.startTime) / 1000);
    const elapsedStr = `${elapsed}s`;

    let prefix: string;
    if (caps.trueColor) {
      prefix = this.renderShimmer();
    } else {
      const brailleFrame =
        StatusIndicator.BRAILLE[this.frame % StatusIndicator.BRAILLE.length];
      prefix = cyan(brailleFrame);
    }

    let line = `${prefix} ${message} ${dim(`(${elapsedStr})`)}`;

    if (this.activity) {
      line += ` ${dim("—")} ${dim(this.activity)}`;
    }

    line += ` ${dim("— esc to interrupt")}`;

    // Use stderr columns — stdout columns may differ in piped environments.
    // Proper visual width check (strips ANSI codes) prevents line wrapping,
    // which would break the \x1b[2K\r overwrite and cause stacked output.
    const cols =
      (process.stderr as NodeJS.WriteStream).columns ??
      process.stdout.columns ??
      80;
    if (visualWidth(line) > cols - 1) {
      line = truncate(line, cols - 1);
    }

    if (!process.stderr.isTTY) return;
    // Write clear + frame atomically to the same stream — avoids cross-stream
    // ordering issues between stdout (clearLine) and stderr (spinner content).
    process.stderr.write("\x1b[2K\r" + line);
  }

  /**
   * Render the diamond with a true-color shimmer effect.
   * Uses a sinusoidal wave over a 2-second period.
   */
  private renderShimmer(): string {
    const t = Date.now() / 1000;
    const phase = (Math.sin(t * Math.PI) + 1) / 2; // 0..1 sinusoidal

    // Interpolate between dim cyan and bright cyan
    const r = Math.round(50 + phase * 50);
    const g = Math.round(180 + phase * 75);
    const b = Math.round(220 + phase * 35);

    return `\x1b[38;2;${r};${g};${b}m${StatusIndicator.DIAMOND}\x1b[39m`;
  }
}

/** Shared singleton for the main thinking indicator. */
let globalIndicator: StatusIndicator | null = null;

export function getStatusIndicator(): StatusIndicator {
  if (!globalIndicator) {
    globalIndicator = new StatusIndicator();
  }
  return globalIndicator;
}
