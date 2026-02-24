/**
 * Terminal capabilities, colors, and dimensions.
 * Pure ANSI escape codes — no external dependencies.
 */

// ─── Terminal Capability Detection ───────────────────────────────────────────

export interface TerminalCapabilities {
  isTTY: boolean;
  trueColor: boolean;
  color256: boolean;
  colorBasic: boolean;
  columns: number;
  rows: number;
  unicode: boolean;
}

let cachedCapabilities: TerminalCapabilities | null = null;

export function getCapabilities(): TerminalCapabilities {
  if (cachedCapabilities) return cachedCapabilities;

  const isTTY = process.stdout.isTTY ?? false;
  const colorterm = process.env.COLORTERM ?? "";
  const term = process.env.TERM ?? "";
  const termProgram = process.env.TERM_PROGRAM ?? "";

  const trueColor =
    colorterm === "truecolor" ||
    colorterm === "24bit" ||
    ["iTerm.app", "ghostty", "WezTerm", "vscode"].includes(termProgram);

  const color256 = trueColor || term.includes("256color") || termProgram !== "";

  const colorBasic = isTTY && term !== "dumb";

  cachedCapabilities = {
    isTTY,
    trueColor,
    color256,
    colorBasic,
    columns: process.stdout.columns ?? 80,
    rows: process.stdout.rows ?? 24,
    unicode: process.env.LANG?.includes("UTF") ?? true,
  };

  // Listen for resize events
  if (isTTY) {
    process.stdout.on("resize", () => {
      if (cachedCapabilities) {
        cachedCapabilities.columns = process.stdout.columns ?? 80;
        cachedCapabilities.rows = process.stdout.rows ?? 24;
      }
    });
  }

  return cachedCapabilities;
}

/** Reset cached capabilities (for testing). */
export function resetCapabilities(): void {
  cachedCapabilities = null;
}

// ─── ANSI Color Functions ────────────────────────────────────────────────────

const enabled = () => getCapabilities().colorBasic;

function wrap(open: string, close: string): (text: string) => string {
  return (text: string) => (enabled() ? `${open}${text}${close}` : text);
}

// Styles
export const bold = wrap("\x1b[1m", "\x1b[22m");
export const dim = wrap("\x1b[2m", "\x1b[22m");
export const italic = wrap("\x1b[3m", "\x1b[23m");
export const underline = wrap("\x1b[4m", "\x1b[24m");
export const strikethrough = wrap("\x1b[9m", "\x1b[29m");

// Foreground colors
export const red = wrap("\x1b[31m", "\x1b[39m");
export const green = wrap("\x1b[32m", "\x1b[39m");
export const yellow = wrap("\x1b[33m", "\x1b[39m");
export const blue = wrap("\x1b[34m", "\x1b[39m");
export const magenta = wrap("\x1b[35m", "\x1b[39m");
export const cyan = wrap("\x1b[36m", "\x1b[39m");
export const white = wrap("\x1b[37m", "\x1b[39m");
export const gray = wrap("\x1b[90m", "\x1b[39m");

// Bright foreground
export const redBright = wrap("\x1b[91m", "\x1b[39m");
export const greenBright = wrap("\x1b[92m", "\x1b[39m");
export const yellowBright = wrap("\x1b[93m", "\x1b[39m");
export const blueBright = wrap("\x1b[94m", "\x1b[39m");
export const magentaBright = wrap("\x1b[95m", "\x1b[39m");
export const cyanBright = wrap("\x1b[96m", "\x1b[39m");

// Background colors
export const bgRed = wrap("\x1b[41m", "\x1b[49m");
export const bgGreen = wrap("\x1b[42m", "\x1b[49m");
export const bgYellow = wrap("\x1b[43m", "\x1b[49m");
export const bgBlue = wrap("\x1b[44m", "\x1b[49m");

// ─── ANSI Utilities ──────────────────────────────────────────────────────────

/** Strip all ANSI escape sequences from a string. */
export function stripAnsi(str: string): string {
  // biome-ignore lint/suspicious/noControlCharactersInRegex: ANSI escape sequence stripping requires matching control chars
  return str.replace(/\x1b\[[0-9;]*m/g, "");
}

/** Get visual width of a string (excluding ANSI codes). */
export function visualWidth(str: string): number {
  return stripAnsi(str).length;
}

/** Pad a string to a target visual width (ignoring ANSI codes). */
export function padEnd(str: string, width: number): string {
  const currentWidth = visualWidth(str);
  if (currentWidth >= width) return str;
  return str + " ".repeat(width - currentWidth);
}

/** Truncate a string to a max visual width, adding ellipsis if needed. */
export function truncate(str: string, maxWidth: number): string {
  const stripped = stripAnsi(str);
  if (stripped.length <= maxWidth) return str;
  // For ANSI strings, we need to be more careful, but for most cases
  // truncating the stripped version is fine for display purposes
  return `${stripped.slice(0, maxWidth - 1)}…`;
}

// ─── Terminal Control ────────────────────────────────────────────────────────

/** Clear the current line. */
export function clearLine(): void {
  if (getCapabilities().isTTY) {
    process.stdout.write("\x1b[2K\r");
  }
}

/** Move cursor up N lines. */
export function cursorUp(n: number): void {
  if (n > 0 && getCapabilities().isTTY) {
    process.stdout.write(`\x1b[${n}A`);
  }
}

/** Hide cursor. */
export function hideCursor(): void {
  if (getCapabilities().isTTY) {
    process.stdout.write("\x1b[?25l");
  }
}

/** Show cursor. */
export function showCursor(): void {
  if (getCapabilities().isTTY) {
    process.stdout.write("\x1b[?25h");
  }
}

/**
 * Begin synchronized output — reduces flicker on supported terminals.
 * Supported in iTerm2, WezTerm, kitty, foot, and newer terminal emulators.
 */
export function beginSync(): void {
  if (getCapabilities().isTTY) {
    process.stdout.write("\x1b[?2026h");
  }
}

/** End synchronized output — flushes the buffered frame. */
export function endSync(): void {
  if (getCapabilities().isTTY) {
    process.stdout.write("\x1b[?2026l");
  }
}

// ─── Box Drawing ─────────────────────────────────────────────────────────────

export const box = {
  topLeft: "┌",
  topRight: "┐",
  bottomLeft: "└",
  bottomRight: "┘",
  horizontal: "─",
  vertical: "│",
  teeRight: "├",
  teeLeft: "┤",
} as const;

/** Draw a horizontal rule of the given width. */
export function horizontalRule(width: number): string {
  return box.horizontal.repeat(width);
}

/** Create a bordered box around text lines. */
export function drawBox(
  lines: string[],
  options?: { title?: string; width?: number }
): string {
  const width = options?.width ?? getCapabilities().columns - 2;
  const innerWidth = width - 2; // account for left/right borders
  const title = options?.title;

  const parts: string[] = [];

  // Top border
  if (title) {
    const titleStr = ` ${title} `;
    const remaining = innerWidth - titleStr.length;
    parts.push(
      `${box.topLeft}${box.horizontal} ${title} ${box.horizontal.repeat(Math.max(0, remaining - 1))}${box.topRight}`
    );
  } else {
    parts.push(
      `${box.topLeft}${box.horizontal.repeat(innerWidth)}${box.topRight}`
    );
  }

  // Content lines
  for (const line of lines) {
    const padded = padEnd(line, innerWidth);
    parts.push(`${box.vertical}${padded}${box.vertical}`);
  }

  // Bottom border
  parts.push(
    `${box.bottomLeft}${box.horizontal.repeat(innerWidth)}${box.bottomRight}`
  );

  return parts.join("\n");
}
