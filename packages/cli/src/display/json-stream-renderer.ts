import type { StreamChunk } from "@locusai/sdk/node";
import {
  type CliStreamEvent,
  CliStreamEventType,
  createCliStreamEvent,
  createProtocolError,
  type ProtocolErrorCode,
} from "@locusai/shared";
import { ExecutionStatsTracker } from "./execution-stats";

/**
 * Options for creating a JsonStreamRenderer.
 */
export interface JsonStreamRendererOptions {
  /** Session identifier for correlation */
  sessionId: string;
  /** CLI command being executed (e.g., "exec") */
  command: string;
  /** AI model name */
  model?: string;
  /** AI provider name */
  provider?: string;
  /** Working directory */
  cwd?: string;
}

/**
 * Renders CLI output as newline-delimited JSON (NDJSON) to stdout.
 *
 * Each line is a validated {@link CliStreamEvent} object.
 * Guarantees deterministic terminal behavior:
 * - Always emits a `start` event first
 * - Always emits a `done` event last (on success, error, or signal)
 * - On failure, emits `error` before `done`
 *
 * All outbound payloads are validated against shared Zod schemas
 * via {@link createCliStreamEvent} before emission.
 */
export class JsonStreamRenderer {
  private readonly sessionId: string;
  private readonly command: string;
  private readonly model?: string;
  private readonly provider?: string;
  private readonly cwd?: string;
  private readonly statsTracker: ExecutionStatsTracker;
  private started = false;
  private done = false;

  constructor(options: JsonStreamRendererOptions) {
    this.sessionId = options.sessionId;
    this.command = options.command;
    this.model = options.model;
    this.provider = options.provider;
    this.cwd = options.cwd;
    this.statsTracker = new ExecutionStatsTracker();
  }

  /**
   * Emit the `start` event. Must be called before any other emit.
   */
  emitStart(): void {
    if (this.started) return;
    this.started = true;

    this.emit(
      createCliStreamEvent(CliStreamEventType.START, this.sessionId, {
        command: this.command,
        model: this.model,
        provider: this.provider,
        cwd: this.cwd,
      })
    );
  }

  /**
   * Process an SDK StreamChunk and emit the corresponding CLI stream event.
   */
  handleChunk(chunk: StreamChunk): void {
    this.ensureStarted();

    switch (chunk.type) {
      case "text_delta":
        this.emit(
          createCliStreamEvent(CliStreamEventType.TEXT_DELTA, this.sessionId, {
            content: chunk.content,
          })
        );
        break;

      case "thinking":
        this.emit(
          createCliStreamEvent(CliStreamEventType.THINKING, this.sessionId, {
            content: chunk.content,
          })
        );
        break;

      case "tool_use":
        this.statsTracker.toolStarted(chunk.tool, chunk.id);
        this.emit(
          createCliStreamEvent(
            CliStreamEventType.TOOL_STARTED,
            this.sessionId,
            {
              tool: chunk.tool,
              toolId: chunk.id,
              parameters: chunk.parameters as
                | Record<string, unknown>
                | undefined,
            }
          )
        );
        break;

      case "tool_result":
        if (chunk.success) {
          this.statsTracker.toolCompleted(chunk.tool, chunk.id);
        } else {
          this.statsTracker.toolFailed(
            chunk.tool,
            chunk.error ?? "Unknown error",
            chunk.id
          );
        }
        this.emit(
          createCliStreamEvent(
            CliStreamEventType.TOOL_COMPLETED,
            this.sessionId,
            {
              tool: chunk.tool,
              toolId: chunk.id,
              success: chunk.success,
              duration: chunk.duration,
              error: chunk.error,
            }
          )
        );
        break;

      case "tool_parameters":
        // Tool parameters are included in tool_started; skip separate event
        break;

      case "result":
        // Final result — no separate event; text was already streamed
        break;

      case "error":
        this.statsTracker.setError(chunk.error);
        this.emitError("UNKNOWN", chunk.error);
        break;
    }
  }

  /**
   * Emit a status change event.
   */
  emitStatus(status: string, message?: string): void {
    this.ensureStarted();
    this.emit(
      createCliStreamEvent(CliStreamEventType.STATUS, this.sessionId, {
        status,
        message,
      })
    );
  }

  /**
   * Emit a structured error event.
   */
  emitError(
    code: ProtocolErrorCode | string,
    message: string,
    options?: { details?: unknown; recoverable?: boolean }
  ): void {
    this.ensureStarted();
    this.emit(
      createCliStreamEvent(CliStreamEventType.ERROR, this.sessionId, {
        error: createProtocolError(code as ProtocolErrorCode, message, options),
      })
    );
  }

  /**
   * Emit the terminal `done` event. Idempotent — only emits once.
   *
   * @param exitCode - Process exit code (0 = success)
   */
  emitDone(exitCode: number): void {
    if (this.done) return;
    this.done = true;
    this.ensureStarted();

    const stats = this.statsTracker.finalize();

    this.emit(
      createCliStreamEvent(CliStreamEventType.DONE, this.sessionId, {
        exitCode,
        duration: stats.duration,
        toolsUsed: stats.toolsUsed.length > 0 ? stats.toolsUsed : undefined,
        tokensUsed: stats.tokensUsed,
        success: exitCode === 0,
      })
    );
  }

  /**
   * Convenience: emit error + done for a fatal failure.
   */
  emitFatalError(
    code: ProtocolErrorCode | string,
    message: string,
    options?: { details?: unknown }
  ): void {
    this.statsTracker.setError(message);
    this.emitError(code, message, {
      ...options,
      recoverable: false,
    });
    this.emitDone(1);
  }

  /**
   * Whether the terminal `done` event has been emitted.
   */
  isDone(): boolean {
    return this.done;
  }

  // --------------------------------------------------------------------------
  // Private
  // --------------------------------------------------------------------------

  private ensureStarted(): void {
    if (!this.started) {
      this.emitStart();
    }
  }

  /**
   * Write a validated event as a single NDJSON line to stdout.
   */
  private emit(event: CliStreamEvent): void {
    process.stdout.write(`${JSON.stringify(event)}\n`);
  }
}
