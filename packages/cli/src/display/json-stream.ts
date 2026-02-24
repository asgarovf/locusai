/**
 * NDJSON event stream for VSCode extension protocol.
 * Emits structured events as newline-delimited JSON to stdout.
 */

import type { NDJSONEvent } from "../types.js";

export class JsonStream {
  private sessionId: string;
  private startTime: number;
  private toolCount: number = 0;
  private tokenCount: number = 0;

  constructor(sessionId: string) {
    this.sessionId = sessionId;
    this.startTime = Date.now();
  }

  /** Emit a start event. */
  emitStart(): void {
    this.emit({
      type: "start",
      sessionId: this.sessionId,
      timestamp: new Date().toISOString(),
    });
  }

  /** Emit a status change. */
  emitStatus(state: "thinking" | "working"): void {
    this.emit({
      type: "status",
      state,
      elapsed: Date.now() - this.startTime,
    });
  }

  /** Emit a text delta (streaming content). */
  emitTextDelta(content: string): void {
    this.emit({
      type: "text_delta",
      content,
    });
  }

  /** Emit thinking content. */
  emitThinking(content: string): void {
    this.emit({
      type: "thinking",
      content,
    });
  }

  /** Emit a tool started event. */
  emitToolStarted(tool: string, params: Record<string, unknown>): void {
    this.emit({
      type: "tool_started",
      tool,
      params,
    });
  }

  /** Emit a tool completed event. */
  emitToolCompleted(
    tool: string,
    duration: number,
    summary: string,
    diff?: string
  ): void {
    this.toolCount++;
    const event: NDJSONEvent = {
      type: "tool_completed",
      tool,
      duration,
      summary,
    };
    if (diff) {
      (event as Extract<NDJSONEvent, { type: "tool_completed" }>).diff = diff;
    }
    this.emit(event);
  }

  /** Emit a completion event. */
  emitDone(): void {
    this.emit({
      type: "done",
      sessionId: this.sessionId,
      stats: {
        duration: Date.now() - this.startTime,
        tools: this.toolCount,
        tokens: this.tokenCount,
      },
    });
  }

  /** Emit an error event. */
  emitError(message: string, retryable: boolean = false): void {
    this.emit({
      type: "error",
      message,
      retryable,
    });
  }

  /** Update token count (for stats). */
  addTokens(count: number): void {
    this.tokenCount += count;
  }

  /** Get session stats. */
  getStats(): { duration: number; tools: number; tokens: number } {
    return {
      duration: Date.now() - this.startTime,
      tools: this.toolCount,
      tokens: this.tokenCount,
    };
  }

  // ─── Internal ─────────────────────────────────────────────────────────────

  private emit(event: NDJSONEvent): void {
    process.stdout.write(`${JSON.stringify(event)}\n`);
  }
}
