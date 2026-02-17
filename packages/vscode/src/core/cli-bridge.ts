import { EventEmitter } from "node:events";
import {
  type CliStreamEvent,
  type HostEvent,
  parseCliStreamEvent,
} from "@locusai/shared";
import {
  createCliNotFoundError,
  createMalformedEventError,
  createProcessCrashError,
  createTimeoutError,
  normalizeCliEvent,
} from "./events";
import {
  type ProcessExitResult,
  ProcessRunner,
  type SpawnConfig,
} from "./process-runner";

// ============================================================================
// Types
// ============================================================================

export interface CliBridgeConfig {
  /** Absolute path to the CLI binary. */
  cliBinaryPath: string;
  /** Working directory for the CLI process. */
  cwd: string;
  /** Session ID for this run. */
  sessionId: string;
  /** Prompt text to send to the CLI. */
  prompt: string;
  /** Optional model override. */
  model?: string;
  /** Optional extra CLI arguments. */
  extraArgs?: string[];
  /** Optional environment variables. */
  env?: Record<string, string>;
  /** Timeout in milliseconds. 0 = no timeout. Default: 0. */
  timeoutMs?: number;
}

/**
 * Events emitted by CliBridge:
 * - `event`: A normalized HostEvent from the CLI stream.
 * - `cli-event`: The raw parsed CliStreamEvent (for debugging/logging).
 * - `stderr`: Raw stderr output from the CLI process.
 * - `exit`: The final ProcessExitResult.
 * - `error`: A spawn or I/O error.
 */
export interface CliBridgeEvents {
  event: (hostEvent: HostEvent) => void;
  "cli-event": (cliEvent: CliStreamEvent) => void;
  stderr: (data: string) => void;
  exit: (result: ProcessExitResult) => void;
  error: (err: Error) => void;
}

// ============================================================================
// CliBridge
// ============================================================================

/**
 * Orchestrates CLI spawning, NDJSON stream parsing, and event
 * normalization. Composes ProcessRunner with shared schema validation
 * to emit typed HostEvents in real time.
 *
 * Framework-agnostic — no VS Code dependencies.
 */
export class CliBridge {
  private readonly emitter = new EventEmitter();
  private runner: ProcessRunner | null = null;
  private sessionId: string | undefined;
  private configuredTimeoutMs = 0;
  private receivedDone = false;
  private hasEmittedTerminalError = false;

  /**
   * Start a CLI session. Spawns the CLI binary in `--json-stream` mode
   * and begins parsing NDJSON output.
   *
   * Throws if called more than once on the same instance.
   */
  start(config: CliBridgeConfig): void {
    if (this.runner) {
      throw new Error("CliBridge: start() called more than once");
    }

    this.sessionId = config.sessionId;
    this.hasEmittedTerminalError = false;
    this.runner = new ProcessRunner();

    this.runner.on("stdout-line", (line) => {
      this.handleLine(line);
    });

    this.runner.on("stderr-data", (data) => {
      this.emitter.emit("stderr", data);
    });

    this.runner.on("exit", (result) => {
      this.handleExit(result);
    });

    this.runner.on("error", (err) => {
      if (this.hasEmittedTerminalError) return;
      this.hasEmittedTerminalError = true;

      // Detect CLI binary not found (ENOENT from spawn).
      if (isEnoent(err)) {
        const errorEvent = createCliNotFoundError(
          this.sessionId,
          config.cliBinaryPath
        );
        this.emitter.emit("event", errorEvent);
        return;
      }

      this.emitter.emit("error", err);
    });

    const args = this.buildArgs(config);

    const timeoutMs = config.timeoutMs ?? 0;

    const spawnConfig: SpawnConfig = {
      command: config.cliBinaryPath,
      args,
      cwd: config.cwd,
      env: config.env,
      timeoutMs,
    };

    this.configuredTimeoutMs = timeoutMs;
    this.runner.spawn(spawnConfig);
  }

  /**
   * Cancel the running CLI session. Sends SIGTERM, escalates to SIGKILL
   * after grace period. Emits a deterministic final error event.
   */
  cancel(): void {
    this.runner?.cancel();
  }

  /**
   * Forcefully kill the CLI process.
   */
  kill(): void {
    this.runner?.kill();
  }

  /** Whether the CLI process is still running. */
  get running(): boolean {
    return this.runner?.running ?? false;
  }

  /** The CLI process PID, or undefined. */
  get pid(): number | undefined {
    return this.runner?.pid;
  }

  // ── Typed listener API ──────────────────────────────────────────────

  on<K extends keyof CliBridgeEvents>(
    event: K,
    listener: CliBridgeEvents[K]
  ): this {
    this.emitter.on(event, listener);
    return this;
  }

  off<K extends keyof CliBridgeEvents>(
    event: K,
    listener: CliBridgeEvents[K]
  ): this {
    this.emitter.off(event, listener);
    return this;
  }

  once<K extends keyof CliBridgeEvents>(
    event: K,
    listener: CliBridgeEvents[K]
  ): this {
    this.emitter.once(event, listener);
    return this;
  }

  removeAllListeners(): this {
    this.emitter.removeAllListeners();
    this.runner?.removeAllListeners();
    return this;
  }

  // ── Private ─────────────────────────────────────────────────────────

  private buildArgs(config: CliBridgeConfig): string[] {
    const args = ["--json-stream", "--session-id", config.sessionId];

    if (config.model) {
      args.push("--model", config.model);
    }

    if (config.extraArgs) {
      args.push(...config.extraArgs);
    }

    args.push("--", config.prompt);

    return args;
  }

  private handleLine(line: string): void {
    const trimmed = line.trim();
    if (trimmed.length === 0) return;

    let parsed: unknown;
    try {
      parsed = JSON.parse(trimmed);
    } catch {
      const errorEvent = createMalformedEventError(
        this.sessionId,
        trimmed,
        new Error("Invalid JSON")
      );
      this.emitter.emit("event", errorEvent);
      return;
    }

    const result = parseCliStreamEvent(parsed);
    if (!result.success) {
      const errorEvent = createMalformedEventError(
        this.sessionId,
        trimmed,
        result.error
      );
      this.emitter.emit("event", errorEvent);
      return;
    }

    const cliEvent = result.data as CliStreamEvent;
    this.emitter.emit("cli-event", cliEvent);

    if (cliEvent.type === "done") {
      this.receivedDone = true;
    }

    const hostEvent = normalizeCliEvent(cliEvent);
    if (hostEvent) {
      this.emitter.emit("event", hostEvent);
    }
  }

  private handleExit(result: ProcessExitResult): void {
    if (result.timedOut && !this.hasEmittedTerminalError) {
      this.hasEmittedTerminalError = true;
      const timeoutEvent = createTimeoutError(
        this.sessionId,
        this.configuredTimeoutMs
      );
      this.emitter.emit("event", timeoutEvent);
    } else if (result.cancelled) {
      // User-initiated cancellation — not an error.
      // The session layer already transitions to CANCELED via USER_STOP.
      // Do NOT emit a PROCESS_CRASHED error for expected cancellations.
      this.hasEmittedTerminalError = true;
    } else if (
      result.exitCode !== null &&
      result.exitCode !== 0 &&
      !this.receivedDone &&
      !this.hasEmittedTerminalError
    ) {
      this.hasEmittedTerminalError = true;
      const errorEvent = createProcessCrashError(
        this.sessionId,
        result.exitCode,
        result.signal
      );
      this.emitter.emit("event", errorEvent);
    }

    this.emitter.emit("exit", result);
  }
}

// ============================================================================
// Helpers
// ============================================================================

function isEnoent(err: unknown): boolean {
  return (
    err instanceof Error && (err as NodeJS.ErrnoException).code === "ENOENT"
  );
}
