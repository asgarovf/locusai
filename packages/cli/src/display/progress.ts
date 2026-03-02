/**
 * Progress bars, spinners, and elapsed time utilities.
 */

import { bold, cyan, dim, green, red, yellow } from "./terminal.js";

// ─── Progress Bar ───────────────────────────────────────────────────────────

export interface ProgressBarOptions {
  /** Total width of the bar (default: 30). */
  width?: number;
  /** Show percentage (default: true). */
  showPercent?: boolean;
  /** Show count (default: true). */
  showCount?: boolean;
  /** Wrap bar in brackets (default: true). */
  brackets?: boolean;
  /** Label prefix. */
  label?: string;
}

/** Render a progress bar string. */
export function progressBar(
  current: number,
  total: number,
  options: ProgressBarOptions = {}
): string {
  const {
    width = 30,
    showPercent = true,
    showCount = true,
    brackets = true,
    label,
  } = options;
  const percent = total > 0 ? current / total : 0;
  const filled = Math.round(width * percent);
  const empty = width - filled;

  const bar = green("█".repeat(filled)) + dim("░".repeat(empty));
  const parts: string[] = [];

  if (label) parts.push(label);
  parts.push(brackets ? `[${bar}]` : bar);
  if (showPercent) parts.push(bold(`${Math.round(percent * 100)}%`));
  if (showCount) parts.push(dim(`(${current}/${total})`));

  return parts.join(" ");
}

// ─── Spinner ────────────────────────────────────────────────────────────────

const SPINNER_FRAMES = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"];

export class Spinner {
  private frame: number = 0;
  private timer: ReturnType<typeof setInterval> | null = null;
  private message: string = "";

  /** Start the spinner with a message. */
  start(message: string): void {
    this.stop();
    this.message = message;
    this.frame = 0;

    this.timer = setInterval(() => {
      if (!process.stderr.isTTY) return;
      const char = cyan(SPINNER_FRAMES[this.frame % SPINNER_FRAMES.length]);
      process.stderr.write(`\x1b[2K\r${char} ${this.message}`);
      this.frame++;
    }, 80);

    if (this.timer.unref) {
      this.timer.unref();
    }
  }

  /** Update the spinner message without restarting. */
  update(message: string): void {
    this.message = message;
  }

  /** Stop the spinner and optionally show a final message. */
  stop(finalMessage?: string): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    if (process.stderr.isTTY) {
      process.stderr.write("\x1b[2K\r");
    }
    if (finalMessage) {
      process.stderr.write(`${finalMessage}\n`);
    }
  }

  /** Stop with a success message. */
  succeed(message: string): void {
    this.stop(`${green("✓")} ${message}`);
  }

  /** Stop with a failure message. */
  fail(message: string): void {
    this.stop(`${red("✗")} ${message}`);
  }

  /** Stop with a warning message. */
  warn(message: string): void {
    this.stop(`${yellow("⚠")} ${message}`);
  }
}

// ─── Elapsed Time ───────────────────────────────────────────────────────────

/** Format milliseconds as a human-readable duration. */
function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60_000) return `${(ms / 1000).toFixed(1)}s`;
  const minutes = Math.floor(ms / 60_000);
  const seconds = Math.floor((ms % 60_000) / 1000);
  return `${minutes}m ${seconds}s`;
}

/** Create a timer that tracks elapsed time. */
export function createTimer(): {
  elapsed: () => number;
  formatted: () => string;
} {
  const start = Date.now();
  return {
    elapsed: () => Date.now() - start,
    formatted: () => formatDuration(Date.now() - start),
  };
}

// ─── Task Status ────────────────────────────────────────────────────────────

/** Render a task status line for sprint execution. */
export function renderTaskStatus(
  issueNumber: number,
  title: string,
  status: "pending" | "in_progress" | "done" | "failed",
  extra?: string
): string {
  const icons: Record<string, string> = {
    pending: dim("○"),
    in_progress: yellow("◉"),
    done: green("✓"),
    failed: red("✗"),
  };

  const icon = icons[status] ?? dim("○");
  const titleStr =
    status === "done" ? dim(title) : status === "failed" ? red(title) : title;
  const extraStr = extra ? ` ${dim(extra)}` : "";

  return `  ${icon} ${dim(`#${issueNumber}`)} ${titleStr}${extraStr}`;
}
