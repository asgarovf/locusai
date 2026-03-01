/**
 * Newline-gated markdown streaming renderer.
 * Buffers text until complete lines are received, then renders
 * with ANSI markdown formatting. Adaptive two-gear pacing.
 * Uses synchronized output for flicker reduction.
 */

import {
  beginSync,
  bold,
  cyan,
  dim,
  endSync,
  getCapabilities,
  gray,
  green,
  italic,
  underline,
  yellow,
} from "./terminal.js";

export class StreamRenderer {
  private buffer: string = "";
  private lineQueue: string[] = [];
  private inCodeBlock: boolean = false;
  private codeBlockLang: string = "";
  private inTable: boolean = false;
  private renderTimer: ReturnType<typeof setInterval> | null = null;
  private catchUpMode: boolean = false;
  private totalLinesRendered: number = 0;
  private isFirstLine: boolean = true;
  private hasContent: boolean = false;
  private onRender: (line: string) => void;

  constructor(onRender?: (line: string) => void) {
    this.onRender = onRender ?? ((line) => process.stdout.write(`${line}\r\n`));
  }

  /** Start the rendering loop. */
  start(): void {
    if (this.renderTimer) return;
    this.renderTimer = setInterval(() => this.tick(), 16); // ~60fps
    if (this.renderTimer.unref) {
      this.renderTimer.unref();
    }
  }

  /** Feed a text delta from the AI stream. */
  push(text: string): void {
    this.buffer += text;

    // Trim leading newlines before any real content arrives
    if (!this.hasContent) {
      this.buffer = this.buffer.replace(/^\n+/, "");
      if (this.buffer.length === 0) return;
      this.hasContent = true;
    }

    // Extract complete lines (newline-gated)
    const lines = this.buffer.split("\n");
    this.buffer = lines.pop() ?? ""; // Keep incomplete line in buffer

    for (const line of lines) {
      this.lineQueue.push(line);
    }
  }

  /** Stop rendering and flush remaining content. */
  stop(): void {
    if (this.renderTimer) {
      clearInterval(this.renderTimer);
      this.renderTimer = null;
    }

    // Drop trailing empty lines from the queue
    while (this.lineQueue.length > 0 && this.lineQueue[this.lineQueue.length - 1]?.trim() === "") {
      this.lineQueue.pop();
    }

    // Flush remaining queue
    while (this.lineQueue.length > 0) {
      const line = this.lineQueue.shift();
      if (line !== undefined) this.renderLine(line);
    }

    // Flush any remaining buffer content
    if (this.buffer.trim()) {
      this.renderLine(this.buffer);
    }
    this.buffer = "";

    // Reset state
    this.inTable = false;
  }

  /** Get total lines rendered. */
  getLinesRendered(): number {
    return this.totalLinesRendered;
  }

  // ─── Render Loop ──────────────────────────────────────────────────────────

  private tick(): void {
    if (this.lineQueue.length === 0) {
      if (this.catchUpMode) {
        this.catchUpMode = false;
      }
      return;
    }

    // Determine pacing mode
    if (this.lineQueue.length > 8 || this.catchUpMode) {
      // CatchUp mode: drain entire queue
      this.catchUpMode = true;
      while (this.lineQueue.length > 0) {
        const line = this.lineQueue.shift();
        if (line !== undefined) this.renderLine(line);
      }
    } else {
      // Smooth mode: drain one line per tick
      const line = this.lineQueue.shift();
      if (line !== undefined) this.renderLine(line);
    }
  }

  private renderLine(raw: string): void {
    const prefix = this.isFirstLine ? `${dim("●")} ` : "  ";
    if (this.isFirstLine) this.isFirstLine = false;
    const formatted = `${prefix}${this.formatMarkdown(raw)}`;
    beginSync();
    this.onRender(formatted);
    endSync();
    this.totalLinesRendered++;
  }

  // ─── Markdown Formatting ──────────────────────────────────────────────────

  private formatMarkdown(line: string): string {
    // Code block start/end
    if (line.startsWith("```")) {
      this.inCodeBlock = !this.inCodeBlock;
      if (this.inCodeBlock) {
        this.codeBlockLang = line.slice(3).trim();
        return dim(
          `┌─ ${this.codeBlockLang || "code"} ${"─".repeat(Math.max(0, 40 - (this.codeBlockLang?.length ?? 0)))}`
        );
      }
      this.codeBlockLang = "";
      return dim(`└${"─".repeat(44)}`);
    }

    // Inside code block — no further formatting
    if (this.inCodeBlock) {
      return `  ${this.highlightCode(line)}`;
    }

    // Headers
    if (line.startsWith("### ")) {
      return bold(cyan(line.slice(4)));
    }
    if (line.startsWith("## ")) {
      return bold(cyan(line.slice(3)));
    }
    if (line.startsWith("# ")) {
      return bold(cyan(line.slice(2)));
    }

    // Horizontal rule
    if (/^[-*_]{3,}$/.test(line.trim())) {
      return dim("─".repeat(Math.min(60, getCapabilities().columns - 4)));
    }

    // Table rows (pipe-delimited)
    if (line.trim().startsWith("|") && line.trim().endsWith("|")) {
      return this.formatTableLine(line);
    }

    // List items
    if (/^(\s*[-*+]\s)/.test(line)) {
      return this.formatInline(line.replace(/^(\s*)([-*+])(\s)/, "$1•$3"));
    }

    // Numbered lists
    if (/^\s*\d+\.\s/.test(line)) {
      return this.formatInline(line);
    }

    // Blockquotes
    if (line.startsWith("> ")) {
      return dim("│ ") + italic(this.formatInline(line.slice(2)));
    }

    // Inline formatting
    return this.formatInline(line);
  }

  private formatInline(text: string): string {
    let result = text;

    // Markdown links: [text](url)
    result = result.replace(
      /\[([^\]]+)\]\(([^)]+)\)/g,
      (_, linkText, url) => `${underline(cyan(linkText))} ${dim(`(${url})`)}`
    );

    // Bold: **text**
    result = result.replace(/\*\*([^*]+)\*\*/g, (_, content) => bold(content));

    // Italic: *text*
    result = result.replace(/(?<!\*)\*([^*]+)\*(?!\*)/g, (_, content) =>
      italic(content)
    );

    // Strikethrough: ~~text~~
    result = result.replace(/~~([^~]+)~~/g, (_, content) => dim(content));

    // Inline code: `text`
    result = result.replace(/`([^`]+)`/g, (_, content) => bold(cyan(content)));

    return result;
  }

  private formatTableLine(line: string): string {
    const trimmed = line.trim();
    const cells = trimmed
      .slice(1, -1)
      .split("|")
      .map((c) => c.trim());

    // Separator row (e.g., |---|---|)
    if (cells.every((c) => /^[-:]+$/.test(c))) {
      this.inTable = true;
      return dim(
        `├${"─".repeat(Math.min(60, getCapabilities().columns - 4))}┤`
      );
    }

    // Header or data row
    const formatted = cells.map((cell) => this.formatInline(cell));

    if (!this.inTable) {
      // First row = header
      this.inTable = true;
      return `  ${formatted.map((c) => bold(c)).join(dim(" │ "))}`;
    }

    return `  ${formatted.join(dim(" │ "))}`;
  }

  private highlightCode(line: string): string {
    // Basic syntax highlighting — keywords and strings
    let result = line;

    // Strings (single and double quoted)
    result = result.replace(/(["'])(?:(?!\1|\\).|\\.)*\1/g, (match) =>
      green(match)
    );

    // Comments (// and #)
    result = result.replace(/(\/\/.*|#.*)$/, (match) => gray(match));

    // Keywords (common across languages)
    const keywords =
      /\b(const|let|var|function|return|if|else|for|while|class|import|export|from|async|await|try|catch|throw|new|this|type|interface|enum|def|fn|pub|use|mod|struct|impl)\b/g;
    result = result.replace(keywords, (match) => yellow(match));

    return result;
  }
}
