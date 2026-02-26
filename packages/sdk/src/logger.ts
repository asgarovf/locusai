/**
 * Simple structured logger for community package authors.
 *
 * Produces output that is visually consistent with the Locus CLI's own
 * terminal output (same prefix symbols and colour coding).  All output goes
 * to `process.stderr` so it does not pollute `stdout` that packages may use
 * for machine-readable data.
 */

// ─── Minimal ANSI helpers (no external deps) ─────────────────────────────────

const colorEnabled = (): boolean =>
  process.stderr.isTTY === true && process.env.NO_COLOR === undefined;

const wrap =
  (open: string, close: string) =>
  (text: string): string =>
    colorEnabled() ? `${open}${text}${close}` : text;

const bold = wrap("\x1b[1m", "\x1b[22m");
const dim = wrap("\x1b[2m", "\x1b[22m");
const red = wrap("\x1b[31m", "\x1b[39m");
const yellow = wrap("\x1b[33m", "\x1b[39m");
const cyan = wrap("\x1b[36m", "\x1b[39m");
const gray = wrap("\x1b[90m", "\x1b[39m");

// ─── Logger interface ────────────────────────────────────────────────────────

/** Logger instance returned by {@link createLogger}. */
export interface LocusLogger {
  /**
   * Log an informational message.
   * Displayed with a `●` prefix in cyan.
   */
  info(msg: string, data?: Record<string, unknown>): void;
  /**
   * Log a warning message.
   * Displayed with a `⚠` prefix in yellow.
   */
  warn(msg: string, data?: Record<string, unknown>): void;
  /**
   * Log an error message.
   * Displayed with a `✗` prefix in red.
   */
  error(msg: string, data?: Record<string, unknown>): void;
  /**
   * Log a debug message.
   * Only visible when the `LOCUS_DEBUG` environment variable is set.
   */
  debug(msg: string, data?: Record<string, unknown>): void;
}

// ─── Implementation ───────────────────────────────────────────────────────────

function formatData(data?: Record<string, unknown>): string {
  if (!data || Object.keys(data).length === 0) return "";
  return ` ${dim(JSON.stringify(data))}`;
}

/**
 * Create a named logger instance whose output style matches the Locus CLI.
 *
 * The `name` is displayed as a prefix so users can identify which package
 * produced a given log line, e.g. `[telegram] Starting bot...`.
 *
 * @example
 * ```ts
 * import { createLogger } from "@locusai/sdk";
 *
 * const logger = createLogger("telegram");
 * logger.info("Bot started");
 * logger.error("Connection failed", { code: 503 });
 * ```
 *
 * @param name - Short identifier for the package, shown in every log line.
 */
export function createLogger(name: string): LocusLogger {
  const prefix = dim(`[${name}]`);

  return {
    info(msg: string, data?: Record<string, unknown>): void {
      process.stderr.write(
        `${bold(cyan("●"))} ${prefix} ${msg}${formatData(data)}\n`
      );
    },

    warn(msg: string, data?: Record<string, unknown>): void {
      process.stderr.write(
        `${bold(yellow("⚠"))}  ${prefix} ${yellow(msg)}${formatData(data)}\n`
      );
    },

    error(msg: string, data?: Record<string, unknown>): void {
      process.stderr.write(
        `${bold(red("✗"))} ${prefix} ${red(msg)}${formatData(data)}\n`
      );
    },

    debug(msg: string, data?: Record<string, unknown>): void {
      if (!process.env.LOCUS_DEBUG) return;
      process.stderr.write(
        `${gray("⋯")} ${prefix} ${gray(msg)}${formatData(data)}\n`
      );
    },
  };
}
