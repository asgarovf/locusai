/**
 * Custom raw-mode input handler for interactive CLI sessions.
 *
 * Supports:
 * - Shift+Enter / Alt+Enter / Ctrl+J for newline insertion
 * - Bracketed paste mode for multi-line paste
 * - Heuristic paste detection for terminals without bracketed paste
 * - Input locking during agent processing (only Ctrl+C passes through)
 * - Proper backspace, Ctrl+U (clear), Ctrl+W (delete word)
 */

// ── ANSI Escape Sequences ────────────────────────────────────
const CSI = "\x1b[";
const PASTE_START = `${CSI}200~`;
const PASTE_END = `${CSI}201~`;
const ENABLE_BRACKETED_PASTE = `${CSI}?2004h`;
const DISABLE_BRACKETED_PASTE = `${CSI}?2004l`;
const CLEAR_SCREEN_DOWN = `${CSI}J`;

export interface InputHandlerOptions {
  prompt?: string;
  continuationPrompt?: string;
  onSubmit: (input: string) => void;
  onInterrupt: () => void;
  onClose: () => void;
}

export class InputHandler {
  private buffer = "";
  private isPasting = false;
  private locked = false;
  private active = false;
  private displayedLines = 0;

  private readonly prompt: string;
  private readonly continuationPrompt: string;
  private readonly onSubmit: (input: string) => void;
  private readonly onInterrupt: () => void;
  private readonly onClose: () => void;

  constructor(options: InputHandlerOptions) {
    this.prompt = options.prompt ?? "> ";
    this.continuationPrompt = options.continuationPrompt ?? "\u2026 ";
    this.onSubmit = options.onSubmit;
    this.onInterrupt = options.onInterrupt;
    this.onClose = options.onClose;
  }

  /** Start raw-mode input handling. */
  start(): void {
    if (this.active) return;
    if (!process.stdin.isTTY) return;

    process.stdin.setRawMode(true);
    process.stdin.resume();
    process.stdin.setEncoding("utf-8");
    process.stdout.write(ENABLE_BRACKETED_PASTE);

    this.active = true;
    process.stdin.on("data", this.handleData);
  }

  /** Stop input handling and restore terminal state. */
  stop(): void {
    if (!this.active) return;

    process.stdout.write(DISABLE_BRACKETED_PASTE);
    if (process.stdin.isTTY) {
      process.stdin.setRawMode(false);
    }
    process.stdin.removeListener("data", this.handleData);
    process.stdin.pause();
    this.active = false;
  }

  /** Lock input during agent processing. Only Ctrl+C passes through. */
  lock(): void {
    this.locked = true;
  }

  /** Unlock and show prompt for new input. */
  showPrompt(): void {
    this.locked = false;
    this.buffer = "";
    this.displayedLines = 0;
    process.stdout.write(this.prompt);
    this.displayedLines = 1;
  }

  // ── Data Handler ──────────────────────────────────────────

  private handleData = (data: string): void => {
    // While locked, only handle Ctrl+C
    if (this.locked) {
      if (data.includes("\x03")) {
        this.onInterrupt();
      }
      return;
    }

    // Handle bracketed paste sequences
    if (data.includes(PASTE_START) || this.isPasting) {
      this.handleBracketedPaste(data);
      return;
    }

    // Heuristic paste: if a data chunk has \r with printable content after it,
    // the whole chunk is likely a paste operation
    if (this.looksLikePaste(data)) {
      this.handleHeuristicPaste(data);
      return;
    }

    // Normal keystroke processing
    this.processKeystrokes(data);
  };

  // ── Bracketed Paste ───────────────────────────────────────

  private handleBracketedPaste(data: string): void {
    let remaining = data;

    const startIdx = remaining.indexOf(PASTE_START);
    if (startIdx !== -1) {
      if (startIdx > 0) {
        this.processKeystrokes(remaining.slice(0, startIdx));
      }
      this.isPasting = true;
      remaining = remaining.slice(startIdx + PASTE_START.length);
    }

    const endIdx = remaining.indexOf(PASTE_END);
    if (endIdx !== -1) {
      this.appendPasteContent(remaining.slice(0, endIdx));
      this.isPasting = false;

      const afterPaste = remaining.slice(endIdx + PASTE_END.length);
      if (afterPaste.length > 0) {
        this.processKeystrokes(afterPaste);
      }
      return;
    }

    if (this.isPasting) {
      this.appendPasteContent(remaining);
    }
  }

  private appendPasteContent(content: string): void {
    const normalized = content.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
    this.buffer += normalized;
    this.fullRender();
  }

  // ── Heuristic Paste Detection ─────────────────────────────

  private looksLikePaste(data: string): boolean {
    const crIdx = data.indexOf("\r");
    if (crIdx === -1) return false;
    // Check if there's printable content after the \r (or \r\n)
    let afterIdx = crIdx + 1;
    if (afterIdx < data.length && data[afterIdx] === "\n") afterIdx++;
    return afterIdx < data.length && data.charCodeAt(afterIdx) >= 32;
  }

  private handleHeuristicPaste(data: string): void {
    const normalized = data.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
    this.buffer += normalized;
    this.fullRender();
  }

  // ── Normal Keystroke Processing ───────────────────────────

  private processKeystrokes(data: string): void {
    let i = 0;

    while (i < data.length) {
      if (this.locked) break;

      const ch = data[i];

      // Ctrl+C
      if (ch === "\x03") {
        if (this.buffer.length > 0) {
          this.buffer = "";
          process.stdout.write(`\r\n${CLEAR_SCREEN_DOWN}${this.prompt}`);
          this.displayedLines = 1;
        } else {
          this.onInterrupt();
        }
        i++;
        continue;
      }

      // Ctrl+D
      if (ch === "\x04") {
        if (this.buffer.length === 0) {
          process.stdout.write("\n");
          this.onClose();
        }
        i++;
        continue;
      }

      // Enter (\r) — submit
      if (ch === "\r") {
        i++;
        if (i < data.length && data[i] === "\n") i++;
        this.submit();
        continue;
      }

      // Ctrl+J (\n) — insert newline
      if (ch === "\n") {
        this.insertNewline();
        i++;
        continue;
      }

      // Escape sequences
      if (ch === "\x1b") {
        const consumed = this.processEscapeSequence(data, i);
        i += consumed;
        continue;
      }

      // Backspace
      if (ch === "\x7f" || ch === "\x08") {
        this.deleteLastChar();
        i++;
        continue;
      }

      // Ctrl+U — clear entire input
      if (ch === "\x15") {
        this.buffer = "";
        this.fullRender();
        i++;
        continue;
      }

      // Ctrl+W — delete last word
      if (ch === "\x17") {
        this.deleteLastWord();
        i++;
        continue;
      }

      // Tab — ignore
      if (ch === "\x09") {
        i++;
        continue;
      }

      // Other control characters — ignore
      if (ch.charCodeAt(0) < 32) {
        i++;
        continue;
      }

      // Regular printable character
      this.buffer += ch;
      this.fullRender();
      i++;
    }
  }

  /**
   * Process an escape sequence starting at position `pos`.
   * Returns the number of characters consumed.
   */
  private processEscapeSequence(data: string, pos: number): number {
    if (pos + 1 >= data.length) return 1; // lone ESC

    const next = data[pos + 1];

    // Alt+Enter: ESC + \r
    if (next === "\r") {
      this.insertNewline();
      if (pos + 2 < data.length && data[pos + 2] === "\n") return 3;
      return 2;
    }

    // CSI sequences: ESC + [
    if (next === "[") {
      return this.processCSI(data, pos);
    }

    // SS3 sequences: ESC + O (+ one char)
    if (next === "O") {
      return pos + 2 < data.length ? 3 : 2;
    }

    return 2;
  }

  /**
   * Process a CSI sequence (ESC [ params final).
   * Returns the number of characters consumed.
   */
  private processCSI(data: string, pos: number): number {
    let j = pos + 2; // skip ESC [

    // Parameter bytes: 0x30–0x3F
    while (j < data.length && data.charCodeAt(j) >= 0x30 && data.charCodeAt(j) <= 0x3f) j++;
    // Intermediate bytes: 0x20–0x2F
    while (j < data.length && data.charCodeAt(j) >= 0x20 && data.charCodeAt(j) <= 0x2f) j++;
    // Final byte
    if (j < data.length) j++;

    const seq = data.slice(pos, j);

    // Shift+Enter (kitty keyboard protocol): \x1b[13;2u
    if (seq === "\x1b[13;2u") {
      this.insertNewline();
    }

    return j - pos;
  }

  // ── Buffer Operations ─────────────────────────────────────

  private insertNewline(): void {
    this.buffer += "\n";
    this.fullRender();
  }

  private deleteLastChar(): void {
    if (this.buffer.length === 0) return;
    this.buffer = this.buffer.slice(0, -1);
    this.fullRender();
  }

  private deleteLastWord(): void {
    if (this.buffer.length === 0) return;
    const prev = this.buffer;
    this.buffer = this.buffer.replace(/\S*\s*$/, "");
    if (this.buffer !== prev) {
      this.fullRender();
    }
  }

  private submit(): void {
    const input = this.buffer;
    this.buffer = "";
    this.displayedLines = 0;
    process.stdout.write("\n");
    this.locked = true;
    this.onSubmit(input);
  }

  // ── Rendering ─────────────────────────────────────────────

  /** Strip ANSI escape sequences and return visual character count. */
  private visualLength(str: string): number {
    const ESC = String.fromCharCode(0x1b);
    return str.replace(new RegExp(`${ESC}\\[[0-9;]*m`, "g"), "").length;
  }

  /** Calculate number of physical terminal lines for the current buffer. */
  private calculatePhysicalLines(): number {
    const cols = process.stdout.columns || 80;
    const lines = this.buffer.split("\n");
    let total = 0;
    for (let i = 0; i < lines.length; i++) {
      const prefix = i === 0 ? this.prompt : this.continuationPrompt;
      // Use visual width (strip ANSI color codes) for accurate calculation
      const len = this.visualLength(prefix) + lines[i].length;
      // An empty line still occupies 1 physical line
      total += len === 0 ? 1 : Math.ceil(len / cols) || 1;
    }
    return total;
  }

  /** Clear the current input display and redraw from scratch. */
  private fullRender(): void {
    // Build entire output as a single string to prevent flicker
    let output = "";

    if (this.displayedLines > 0) {
      if (this.displayedLines > 1) {
        output += `\r${CSI}${this.displayedLines - 1}A`;
      } else {
        output += "\r";
      }
      output += CLEAR_SCREEN_DOWN;
    }

    const lines = this.buffer.split("\n");
    for (let idx = 0; idx < lines.length; idx++) {
      const p = idx === 0 ? this.prompt : this.continuationPrompt;
      if (idx > 0) output += "\r\n";
      output += p + lines[idx];
    }

    process.stdout.write(output);
    this.displayedLines = this.calculatePhysicalLines();
  }
}
