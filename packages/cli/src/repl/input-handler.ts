/**
 * Raw-mode REPL input handler with multiline editing.
 *
 * Key behavior:
 * - Enter submits
 * - Shift+Enter / Alt+Enter / Ctrl+J insert newline
 * - Up/Down move across lines in multiline buffers
 * - Up/Down navigate history in single-line buffers
 * - Bracketed paste preserves multi-line content
 */

import { dim, stripAnsi, yellow } from "../display/terminal.js";
import {
  collectReferencedAttachments,
  type DetectedImage,
  type ImageAttachment,
  normalizeImagePlaceholders,
} from "./image-detect.js";

export type InputResult =
  | { type: "submit"; text: string; images: DetectedImage[] }
  | { type: "interrupt" }
  | { type: "exit" }
  | { type: "tab" };

export interface InputHandlerOptions {
  prompt: string;
  getHistory?: () => string[];
  onTab?: (partial: string) => string | null;
}

const CSI = "\x1b[";
const SAVE_CURSOR = "\x1b7";
const RESTORE_CURSOR = "\x1b8";
const ENABLE_BRACKETED_PASTE = `${CSI}?2004h`;
const DISABLE_BRACKETED_PASTE = `${CSI}?2004l`;
const ENABLE_KITTY_KEYBOARD = "\x1b[>1u";
const DISABLE_KITTY_KEYBOARD = "\x1b[<u";
const PASTE_START = `${CSI}200~`;
const PASTE_END = `${CSI}201~`;

const CTRL_A = "\x01";
const CTRL_C = "\x03";
const CTRL_D = "\x04";
const CTRL_E = "\x05";
const CTRL_K = "\x0b";
const CTRL_J = "\x0a";
const CTRL_U = "\x15";
const CTRL_W = "\x17";
const TAB = "\t";
const ENTER = "\r";
const ENTER_CRLF = "\r\n";
const ESC = "\x1b";
const BACKSPACE = "\x7f";

const SEQ_LEFT = `${CSI}D`;
const SEQ_RIGHT = `${CSI}C`;
const SEQ_UP = `${CSI}A`;
const SEQ_DOWN = `${CSI}B`;
const SEQ_HOME = `${CSI}H`;
const SEQ_END = `${CSI}F`;
const SEQ_HOME_1 = `${CSI}1~`;
const SEQ_END_4 = `${CSI}4~`;
const SEQ_HOME_O = "\x1bOH";
const SEQ_END_O = "\x1bOF";
const SEQ_DELETE = `${CSI}3~`;
const SEQ_WORD_LEFT = `${CSI}1;5D`;
const SEQ_WORD_RIGHT = `${CSI}1;5C`;
const SEQ_SHIFT_LEFT = `${CSI}1;2D`;
const SEQ_SHIFT_RIGHT = `${CSI}1;2C`;
const SEQ_META_LEFT = `${CSI}1;9D`;
const SEQ_META_RIGHT = `${CSI}1;9C`;
const SEQ_META_SHIFT_LEFT = `${CSI}1;10D`;
const SEQ_META_SHIFT_RIGHT = `${CSI}1;10C`;

const SEQ_SHIFT_ENTER_CSI_U = `${CSI}13;2u`;
const SEQ_SHIFT_ENTER_MODIFY = `${CSI}27;2;13~`;
const SEQ_SHIFT_ENTER_TILDE = `${CSI}13;2~`;
const SEQ_ALT_ENTER = `${ESC}${ENTER}`;

const CONTROL_SEQUENCES = [
  PASTE_START,
  PASTE_END,
  SEQ_SHIFT_ENTER_CSI_U,
  SEQ_SHIFT_ENTER_MODIFY,
  SEQ_SHIFT_ENTER_TILDE,
  SEQ_ALT_ENTER,
  SEQ_WORD_LEFT,
  SEQ_WORD_RIGHT,
  SEQ_META_SHIFT_LEFT,
  SEQ_META_SHIFT_RIGHT,
  SEQ_META_LEFT,
  SEQ_META_RIGHT,
  SEQ_SHIFT_LEFT,
  SEQ_SHIFT_RIGHT,
  SEQ_DELETE,
  SEQ_HOME_1,
  SEQ_END_4,
  SEQ_HOME_O,
  SEQ_END_O,
  SEQ_LEFT,
  SEQ_RIGHT,
  SEQ_UP,
  SEQ_DOWN,
  SEQ_HOME,
  SEQ_END,
  ENTER_CRLF,
]
  // Longest first so prefixes do not steal matches.
  .sort((a, b) => b.length - a.length);

export class InputHandler {
  private prompt: string;
  private getHistory: () => string[];
  private onTab: ((partial: string) => string | null) | undefined;
  private locked = false;
  private lastInterruptTime = 0;

  constructor(options: InputHandlerOptions) {
    this.prompt = options.prompt;
    this.getHistory = options.getHistory ?? (() => []);
    this.onTab = options.onTab;
  }

  setPrompt(prompt: string): void {
    this.prompt = prompt;
  }

  lock(): void {
    this.locked = true;
  }

  unlock(): void {
    this.locked = false;
  }

  isLocked(): boolean {
    return this.locked;
  }

  // Kept for compatibility with REPL orchestration.
  enableProtocols(): void {
    // No-op: protocol toggles are scoped to each readline() call.
  }

  // Kept for compatibility with REPL orchestration.
  disableProtocols(): void {
    // No-op: protocol toggles are scoped to each readline() call.
  }

  async readline(): Promise<InputResult> {
    await this.waitUntilUnlocked();

    return new Promise<InputResult>((resolve) => {
      const stdin = process.stdin as NodeJS.ReadStream;
      const out = process.stderr;

      let buffer = "";
      let cursor = 0;
      let renderedRows = 0;
      let renderedCursorRow = 0;
      let preferredColumn: number | null = null;
      let pending = "";
      let isPasting = false;
      let pasteBuffer = "";
      let imageAttachments: ImageAttachment[] = [];
      let nextImageId = 1;

      const history = this.getHistory();
      let historyIndex = -1;
      let historyDraft = "";

      let resolved = false;
      const wasRaw = stdin.isRaw;

      const finish = (result: InputResult) => {
        if (resolved) return;
        resolved = true;

        stdin.removeListener("data", onData);

        if (stdin.isTTY) {
          out.write(DISABLE_BRACKETED_PASTE + DISABLE_KITTY_KEYBOARD);
          out.write("\x1b[?25h");
          stdin.setRawMode(!!wasRaw);
        }

        stdin.pause();
        resolve(result);
      };

      const resetHistoryNavigation = () => {
        historyIndex = -1;
        historyDraft = "";
      };

      const setBuffer = (next: string) => {
        buffer = next;
        if (cursor > buffer.length) cursor = buffer.length;
      };

      const normalizeInsertedText = (text: string): string => {
        if (!text) return "";

        const normalized = normalizeImagePlaceholders(
          text,
          imageAttachments,
          nextImageId
        );
        imageAttachments = normalized.attachments;
        nextImageId = normalized.nextId;
        return normalized.text;
      };

      const insertText = (text: string) => {
        const normalizedText = normalizeInsertedText(text);
        if (!normalizedText) return;

        const next =
          buffer.slice(0, cursor) + normalizedText + buffer.slice(cursor);
        cursor += normalizedText.length;
        setBuffer(next);
        preferredColumn = null;
        resetHistoryNavigation();
      };

      const deleteBeforeCursor = () => {
        if (cursor === 0) return;
        const next = buffer.slice(0, cursor - 1) + buffer.slice(cursor);
        cursor -= 1;
        setBuffer(next);
        preferredColumn = null;
        resetHistoryNavigation();
      };

      const deleteAtCursor = () => {
        if (cursor >= buffer.length) return;
        const next = buffer.slice(0, cursor) + buffer.slice(cursor + 1);
        setBuffer(next);
        preferredColumn = null;
        resetHistoryNavigation();
      };

      const moveCursorLeft = () => {
        if (cursor > 0) {
          cursor -= 1;
          preferredColumn = null;
        }
      };

      const moveCursorRight = () => {
        if (cursor < buffer.length) {
          cursor += 1;
          preferredColumn = null;
        }
      };

      const moveToLineStart = () => {
        const { lineStart } = getCursorLineBounds(buffer, cursor);
        cursor = lineStart;
        preferredColumn = null;
      };

      const moveToLineEnd = () => {
        const { lineEnd } = getCursorLineBounds(buffer, cursor);
        cursor = lineEnd;
        preferredColumn = null;
      };

      const moveWordLeft = () => {
        if (cursor === 0) return;
        let i = cursor;
        while (i > 0 && /\s/.test(buffer[i - 1] ?? "")) i -= 1;
        while (i > 0 && !/\s/.test(buffer[i - 1] ?? "")) i -= 1;
        cursor = i;
        preferredColumn = null;
      };

      const moveWordRight = () => {
        if (cursor >= buffer.length) return;
        let i = cursor;
        while (i < buffer.length && /\s/.test(buffer[i] ?? "")) i += 1;
        while (i < buffer.length && !/\s/.test(buffer[i] ?? "")) i += 1;
        cursor = i;
        preferredColumn = null;
      };

      const deleteWordBeforeCursor = () => {
        if (cursor === 0) return;
        const start = findPreviousWordStart(buffer, cursor);
        const next = buffer.slice(0, start) + buffer.slice(cursor);
        cursor = start;
        setBuffer(next);
        preferredColumn = null;
        resetHistoryNavigation();
      };

      const deleteLineBeforeCursor = () => {
        if (cursor === 0) return;
        const next = buffer.slice(cursor);
        buffer = next;
        cursor = 0;
        preferredColumn = null;
        resetHistoryNavigation();
      };

      const deleteLineAfterCursor = () => {
        if (cursor >= buffer.length) return;
        buffer = buffer.slice(0, cursor);
        preferredColumn = null;
        resetHistoryNavigation();
      };

      const tryHistoryUp = () => {
        if (history.length === 0) return;
        if (historyIndex === -1) {
          historyDraft = buffer;
          historyIndex = 0;
        } else if (historyIndex < history.length - 1) {
          historyIndex += 1;
        } else {
          return;
        }

        setBuffer(history[historyIndex] ?? "");
        imageAttachments = [];
        nextImageId = 1;
        cursor = buffer.length;
        preferredColumn = null;
      };

      const tryHistoryDown = () => {
        if (historyIndex === -1) return;

        if (historyIndex > 0) {
          historyIndex -= 1;
          setBuffer(history[historyIndex] ?? "");
          imageAttachments = [];
          nextImageId = 1;
        } else {
          historyIndex = -1;
          setBuffer(historyDraft);
          historyDraft = "";
          imageAttachments = [];
          nextImageId = 1;
        }

        cursor = buffer.length;
        preferredColumn = null;
      };

      const moveCursorVertical = (direction: -1 | 1) => {
        const lineStarts = getLineStarts(buffer);
        const currentLine = findLineIndex(lineStarts, cursor);
        const currentLineStart = lineStarts[currentLine] ?? 0;

        const currentColumn = cursor - currentLineStart;
        const targetColumn = preferredColumn ?? currentColumn;

        const targetLine = currentLine + direction;
        if (targetLine < 0 || targetLine >= lineStarts.length) return;

        const targetLineStart = lineStarts[targetLine] ?? 0;
        const targetLineEnd =
          targetLine + 1 < lineStarts.length
            ? (lineStarts[targetLine + 1] ?? buffer.length) - 1
            : buffer.length;

        const targetLen = Math.max(0, targetLineEnd - targetLineStart);
        cursor = targetLineStart + Math.min(targetColumn, targetLen);
        preferredColumn = targetColumn;
      };

      const handleUp = () => {
        if (buffer.includes("\n")) {
          moveCursorVertical(-1);
          return;
        }
        tryHistoryUp();
      };

      const handleDown = () => {
        if (buffer.includes("\n")) {
          moveCursorVertical(1);
          return;
        }
        tryHistoryDown();
      };

      const tryTabCompletion = () => {
        if (!this.onTab) return;
        if (buffer.includes("\n")) return;

        const completion = this.onTab(buffer);
        if (!completion || completion === buffer) return;

        setBuffer(completion);
        cursor = buffer.length;
        preferredColumn = null;
      };

      const submit = () => {
        const normalized = normalizeImagePlaceholders(
          buffer,
          imageAttachments,
          nextImageId
        );
        buffer = normalized.text;
        imageAttachments = normalized.attachments;
        nextImageId = normalized.nextId;
        const images = collectReferencedAttachments(buffer, imageAttachments);

        out.write("\r\n");
        finish({ type: "submit", text: buffer, images });
      };

      const clearBufferOrInterrupt = () => {
        if (buffer.length > 0) {
          buffer = "";
          cursor = 0;
          imageAttachments = [];
          nextImageId = 1;
          preferredColumn = null;
          resetHistoryNavigation();
          render();
          return;
        }

        const now = Date.now();
        if (now - this.lastInterruptTime < 2000) {
          out.write("\r\n");
          finish({ type: "interrupt" });
          return;
        }

        this.lastInterruptTime = now;
        out.write(`\r\n${dim("Press Ctrl+C again to exit")}\r\n`);
      };

      const maybeHeuristicPaste = (chunk: string): boolean => {
        if (chunk.includes(ESC)) return false;
        if (!looksLikePaste(chunk) && !looksLikeImagePathChunk(chunk)) {
          return false;
        }

        const normalized = normalizeLineEndings(chunk);
        insertText(normalized);
        render();
        return true;
      };

      const handleSequence = (seq: string) => {
        switch (seq) {
          case ENTER_CRLF:
          case ENTER:
            submit();
            return;
          case CTRL_J:
          case SEQ_ALT_ENTER:
          case SEQ_SHIFT_ENTER_CSI_U:
          case SEQ_SHIFT_ENTER_MODIFY:
          case SEQ_SHIFT_ENTER_TILDE:
            insertText("\n");
            render();
            return;
          case BACKSPACE:
          case "\b":
            deleteBeforeCursor();
            render();
            return;
          case SEQ_DELETE:
            deleteAtCursor();
            render();
            return;
          case SEQ_LEFT:
            moveCursorLeft();
            render();
            return;
          case SEQ_RIGHT:
            moveCursorRight();
            render();
            return;
          case SEQ_UP:
            handleUp();
            render();
            return;
          case SEQ_DOWN:
            handleDown();
            render();
            return;
          case SEQ_HOME:
          case SEQ_HOME_1:
          case SEQ_HOME_O:
          case CTRL_A:
            moveToLineStart();
            render();
            return;
          case SEQ_END:
          case SEQ_END_4:
          case SEQ_END_O:
          case CTRL_E:
            moveToLineEnd();
            render();
            return;
          case CTRL_U:
            deleteLineBeforeCursor();
            render();
            return;
          case CTRL_K:
            deleteLineAfterCursor();
            render();
            return;
          case CTRL_W:
          case "\x1b\x7f":
            deleteWordBeforeCursor();
            render();
            return;
          case SEQ_WORD_LEFT:
          case SEQ_SHIFT_LEFT:
          case SEQ_META_LEFT:
          case SEQ_META_SHIFT_LEFT:
          case "\x1bb":
            moveWordLeft();
            render();
            return;
          case SEQ_WORD_RIGHT:
          case SEQ_SHIFT_RIGHT:
          case SEQ_META_RIGHT:
          case SEQ_META_SHIFT_RIGHT:
          case "\x1bf":
            moveWordRight();
            render();
            return;
          case TAB:
            tryTabCompletion();
            render();
            return;
          case CTRL_C:
            clearBufferOrInterrupt();
            render();
            return;
          case CTRL_D:
            if (buffer.length === 0) {
              out.write("\r\n");
              finish({ type: "exit" });
              return;
            }
            deleteAtCursor();
            render();
            return;
          default:
            // Only insert printable characters; ignore unrecognised ESC sequences.
            if (seq.charCodeAt(0) >= 32) {
              insertText(seq);
              render();
            }
            return;
        }
      };

      const processPending = () => {
        while (!resolved && pending.length > 0) {
          if (isPasting) {
            const endIdx = pending.indexOf(PASTE_END);
            if (endIdx === -1) {
              pasteBuffer += pending;
              pending = "";
              break;
            }

            pasteBuffer += pending.slice(0, endIdx);
            pending = pending.slice(endIdx + PASTE_END.length);
            isPasting = false;

            insertText(normalizeLineEndings(pasteBuffer));
            pasteBuffer = "";
            render();
            continue;
          }

          if (pending.startsWith(PASTE_START)) {
            isPasting = true;
            pending = pending.slice(PASTE_START.length);
            continue;
          }

          const matched = CONTROL_SEQUENCES.find((seq) =>
            pending.startsWith(seq)
          );
          if (matched) {
            pending = pending.slice(matched.length);
            handleSequence(matched);
            continue;
          }

          if (pending.startsWith(ESC)) {
            const csiSeq = parseCsiSequence(pending);
            if (csiSeq) {
              const seq = csiSeq;
              pending = pending.slice(seq.length);
              handleSequence(seq);
              continue;
            }

            if (pending.length === 1) {
              break;
            }

            const altCandidate = pending.slice(0, 2);
            if (
              altCandidate === "\x1b\x7f" ||
              altCandidate === "\x1bb" ||
              altCandidate === "\x1bf"
            ) {
              pending = pending.slice(2);
              handleSequence(altCandidate);
              continue;
            }

            // Unknown/partial ESC sequence: consume ESC to avoid deadlock.
            pending = pending.slice(1);
            continue;
          }

          const ch = pending[0] ?? "";
          pending = pending.slice(ch.length || 1);
          handleSequence(ch);
        }
      };

      const onData = (data: Buffer | string) => {
        if (resolved) return;

        const chunk = typeof data === "string" ? data : data.toString("utf8");

        if (this.locked) {
          if (chunk.includes(CTRL_C)) {
            out.write("\r\n");
            finish({ type: "interrupt" });
          }
          return;
        }

        if (!isPasting && maybeHeuristicPaste(chunk)) {
          return;
        }

        pending += chunk;
        processPending();
      };

      const render = () => {
        const cols = process.stderr.columns || process.stdout.columns || 80;
        const { display, rows, cursorRow, cursorCol } = buildRenderState(
          this.prompt,
          buffer,
          cursor,
          cols
        );

        out.write("\x1b[?25l");

        if (renderedRows > 0) {
          out.write("\r");
          if (renderedCursorRow > 0) {
            out.write(`${CSI}${renderedCursorRow}A`);
          }
          out.write(`${CSI}J`);
        }

        // Anchor at the top of the render block to avoid drift when content shrinks.
        out.write(SAVE_CURSOR);
        out.write(display);

        // Restore to the render-block anchor and move to the logical insertion point.
        out.write(RESTORE_CURSOR);
        if (cursorRow > 0) {
          out.write(`${CSI}${cursorRow}B`);
        }
        if (cursorCol > 1) {
          out.write(`${CSI}${cursorCol - 1}C`);
        }

        out.write("\x1b[?25h");
        renderedRows = rows;
        renderedCursorRow = cursorRow;
      };

      if (stdin.isTTY) {
        stdin.setRawMode(true);
      }
      stdin.resume();
      stdin.on("data", onData);

      if (stdin.isTTY) {
        out.write(ENABLE_BRACKETED_PASTE + ENABLE_KITTY_KEYBOARD);
      }

      render();
    });
  }

  private async waitUntilUnlocked(): Promise<void> {
    if (!this.locked) return;

    await new Promise<void>((resolve) => {
      const tick = () => {
        if (!this.locked) {
          resolve();
          return;
        }
        setTimeout(tick, 10);
      };
      tick();
    });
  }
}

function getLineStarts(text: string): number[] {
  const starts = [0];
  for (let i = 0; i < text.length; i++) {
    if (text[i] === "\n") {
      starts.push(i + 1);
    }
  }
  return starts;
}

function findLineIndex(starts: number[], cursor: number): number {
  for (let i = starts.length - 1; i >= 0; i--) {
    if ((starts[i] ?? 0) <= cursor) return i;
  }
  return 0;
}

function getCursorLineBounds(
  text: string,
  cursor: number
): {
  lineStart: number;
  lineEnd: number;
} {
  const starts = getLineStarts(text);
  const lineIndex = findLineIndex(starts, cursor);
  const lineStart = starts[lineIndex] ?? 0;
  const lineEnd =
    lineIndex + 1 < starts.length
      ? (starts[lineIndex + 1] ?? text.length) - 1
      : text.length;
  return { lineStart, lineEnd };
}

function findPreviousWordStart(text: string, cursor: number): number {
  let i = cursor;
  while (i > 0 && /\s/.test(text[i - 1] ?? "")) i -= 1;
  while (i > 0 && !/\s/.test(text[i - 1] ?? "")) i -= 1;
  return i;
}

function normalizeLineEndings(input: string): string {
  return input.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
}

function looksLikePaste(chunk: string): boolean {
  if (chunk.length <= 1) return false;
  for (let i = 0; i < chunk.length; i++) {
    const code = chunk.charCodeAt(i);
    if (code >= 0 && code < 32 && code !== 9 && code !== 10 && code !== 13) {
      return false;
    }
  }
  return chunk.includes("\n") || chunk.includes("\r");
}

function looksLikeImagePathChunk(chunk: string): boolean {
  if (chunk.length <= 1) return false;
  return /(?:\/|~\/|\.\/)[^\r\n]+\.(?:png|jpe?g|gif|webp|bmp|svg|tiff?)/i.test(
    chunk
  );
}

function rowsForWidth(width: number, cols: number): number {
  if (width <= 0) return 1;
  return Math.floor((width - 1) / cols) + 1;
}

function cursorPositionForWidth(
  widthBeforeCursor: number,
  cols: number
): {
  rowOffset: number;
  col: number;
} {
  if (widthBeforeCursor <= 0) {
    return { rowOffset: 0, col: 1 };
  }

  // Position the caret at the insertion point (after typed chars),
  // not on top of the last rendered character cell.
  const rowOffset = Math.floor(widthBeforeCursor / cols);
  const col = (widthBeforeCursor % cols) + 1;
  return { rowOffset, col };
}

function buildRenderState(
  prompt: string,
  buffer: string,
  cursor: number,
  cols: number
): {
  display: string;
  rows: number;
  cursorRow: number;
  cursorCol: number;
} {
  const continuationPrompt = buildContinuationPrompt(prompt);
  const logicalLines = buffer.split("\n");

  let rows = 0;
  let cursorRow = 0;
  let cursorCol = 1;

  let remaining = cursor;

  for (let i = 0; i < logicalLines.length; i++) {
    const line = logicalLines[i] ?? "";
    const prefix = i === 0 ? prompt : continuationPrompt;
    const prefixWidth = stripAnsi(prefix).length;

    const lineWidth = prefixWidth + line.length;
    const lineRows = rowsForWidth(lineWidth, cols);

    if (remaining >= 0 && remaining <= line.length) {
      const widthBeforeCursor = prefixWidth + remaining;
      const pos = cursorPositionForWidth(widthBeforeCursor, cols);
      cursorRow = rows + pos.rowOffset;
      cursorCol = pos.col;
      remaining = -1;
    } else if (remaining >= 0) {
      remaining -= line.length + 1;
    }

    rows += lineRows;
  }

  if (remaining >= 0) {
    // Cursor at end of buffer after loop (defensive fallback).
    const lastLine = logicalLines[logicalLines.length - 1] ?? "";
    const prefix = logicalLines.length <= 1 ? prompt : continuationPrompt;
    const prefixWidth = stripAnsi(prefix).length;
    const pos = cursorPositionForWidth(prefixWidth + lastLine.length, cols);
    const rowsBeforeLast =
      rows - rowsForWidth(prefixWidth + lastLine.length, cols);
    cursorRow = rowsBeforeLast + pos.rowOffset;
    cursorCol = pos.col;
  }

  const display = logicalLines
    .map((line, i) => `${i === 0 ? prompt : continuationPrompt}${line}`)
    .join("\r\n");

  return {
    display,
    rows: Math.max(1, rows),
    cursorRow,
    cursorCol,
  };
}

function buildContinuationPrompt(prompt: string): string {
  const width = stripAnsi(prompt).length;
  return dim(`.${".".repeat(Math.max(0, width - 2))} `);
}

function parseCsiSequence(input: string): string | null {
  if (!input.startsWith("\x1b[")) return null;

  let i = 2;
  while (i < input.length) {
    const code = input.charCodeAt(i);
    const isParam = code >= 0x30 && code <= 0x3f;
    if (isParam) {
      i += 1;
      continue;
    }

    const isIntermediate = code >= 0x20 && code <= 0x2f;
    if (isIntermediate) {
      i += 1;
      continue;
    }

    const isFinal = code >= 0x40 && code <= 0x7e;
    if (isFinal) {
      return input.slice(0, i + 1);
    }

    return null;
  }

  return null;
}

export const __testUtils = {
  buildRenderState,
  getLineStarts,
};

/**
 * Listen for ESC or Ctrl+C keystrokes during AI execution.
 * Returns a cleanup function that removes the listener.
 *
 * Uses a dual-interrupt pattern:
 * - First ESC/Ctrl+C: calls onInterrupt() to abort the current operation
 * - Second ESC/Ctrl+C within 2s: calls onForceExit() to force quit
 */
export function listenForInterrupt(
  onInterrupt: () => void,
  onForceExit?: () => void
): () => void {
  const stdin = process.stdin;
  if (!stdin.isTTY)
    return () => {
      // noop for non-TTY
    };

  const wasRaw = stdin.isRaw;
  stdin.setRawMode(true);
  stdin.resume();

  let interrupted = false;
  let interruptTime = 0;

  const handler = (data: Buffer) => {
    const seq = data.toString();
    if (seq === "\x1b" || seq === "\x03") {
      const now = Date.now();

      if (interrupted && now - interruptTime < 2000 && onForceExit) {
        onForceExit();
        return;
      }

      interrupted = true;
      interruptTime = now;
      onInterrupt();

      if (onForceExit) {
        process.stderr.write(
          `\r\n${dim("Press")} ${yellow("ESC")} ${dim("again to force exit")}\r\n`
        );
      }
    }
  };

  stdin.on("data", handler);

  return () => {
    stdin.removeListener("data", handler);
    if (wasRaw !== undefined && stdin.isTTY) {
      stdin.setRawMode(wasRaw);
    }
  };
}
