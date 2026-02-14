import { type ChildProcess, spawn } from "node:child_process";
import { EventEmitter } from "node:events";

// ============================================================================
// Types
// ============================================================================

export interface SpawnConfig {
  /** Absolute path to the CLI binary. */
  command: string;
  /** Arguments to pass to the CLI. */
  args: string[];
  /** Working directory for the child process. */
  cwd?: string;
  /** Environment variables (merged with process.env). */
  env?: Record<string, string>;
  /** Timeout in milliseconds. 0 = no timeout. */
  timeoutMs?: number;
}

export interface ProcessExitResult {
  /** Exit code, or null if killed by signal. */
  exitCode: number | null;
  /** Signal that killed the process, or null. */
  signal: string | null;
  /** Whether the process was cancelled via cancel(). */
  cancelled: boolean;
  /** Whether the process was killed due to timeout. */
  timedOut: boolean;
}

/**
 * Events emitted by ProcessRunner:
 * - `stdout-line`: A complete line from stdout (no trailing newline).
 * - `stderr-data`: Raw stderr chunk (string).
 * - `exit`: Process exited with a ProcessExitResult.
 * - `error`: Spawn or I/O error (Error object).
 */
export interface ProcessRunnerEvents {
  "stdout-line": (line: string) => void;
  "stderr-data": (data: string) => void;
  exit: (result: ProcessExitResult) => void;
  error: (err: Error) => void;
}

// ============================================================================
// ProcessRunner
// ============================================================================

const SIGTERM_GRACE_MS = 3000;

/**
 * Manages a single child-process lifecycle with cancellation, timeout,
 * and signal handling. Framework-agnostic — no VS Code dependencies.
 */
export class ProcessRunner {
  private readonly emitter = new EventEmitter();
  private child: ChildProcess | null = null;
  private cancelled = false;
  private timedOut = false;
  private timeoutTimer: ReturnType<typeof setTimeout> | null = null;
  private killTimer: ReturnType<typeof setTimeout> | null = null;
  private exited = false;
  private stdoutBuffer = "";

  /**
   * Spawn the child process.
   * Throws if called more than once on the same instance.
   */
  spawn(config: SpawnConfig): void {
    if (this.child) {
      throw new Error("ProcessRunner: spawn() called more than once");
    }

    const env = config.env ? { ...process.env, ...config.env } : process.env;

    this.child = spawn(config.command, config.args, {
      cwd: config.cwd,
      env,
      stdio: ["ignore", "pipe", "pipe"],
    });

    this.child.stdout?.setEncoding("utf-8");
    this.child.stderr?.setEncoding("utf-8");

    this.child.stdout?.on("data", (chunk: string) => {
      this.handleStdoutChunk(chunk);
    });

    this.child.stderr?.on("data", (chunk: string) => {
      this.emitter.emit("stderr-data", chunk);
    });

    this.child.on("error", (err: Error) => {
      this.emitter.emit("error", err);
    });

    this.child.on("close", (code: number | null, signal: string | null) => {
      this.handleExit(code, signal);
    });

    if (config.timeoutMs && config.timeoutMs > 0) {
      this.timeoutTimer = setTimeout(() => {
        this.timedOut = true;
        this.terminateProcess();
      }, config.timeoutMs);
    }
  }

  /**
   * Cancel the running process. Sends SIGTERM, then SIGKILL after grace.
   * No-op if the process already exited.
   */
  cancel(): void {
    if (this.exited || !this.child) return;
    this.cancelled = true;
    this.terminateProcess();
  }

  /**
   * Forcefully kill the process with SIGKILL.
   * No-op if the process already exited.
   */
  kill(): void {
    if (this.exited || !this.child) return;
    this.child.kill("SIGKILL");
  }

  /** Whether the process is still running. */
  get running(): boolean {
    return this.child !== null && !this.exited;
  }

  /** The child process PID, or undefined. */
  get pid(): number | undefined {
    return this.child?.pid;
  }

  // ── Typed listener API ──────────────────────────────────────────────

  on<K extends keyof ProcessRunnerEvents>(
    event: K,
    listener: ProcessRunnerEvents[K]
  ): this {
    this.emitter.on(event, listener);
    return this;
  }

  off<K extends keyof ProcessRunnerEvents>(
    event: K,
    listener: ProcessRunnerEvents[K]
  ): this {
    this.emitter.off(event, listener);
    return this;
  }

  once<K extends keyof ProcessRunnerEvents>(
    event: K,
    listener: ProcessRunnerEvents[K]
  ): this {
    this.emitter.once(event, listener);
    return this;
  }

  removeAllListeners(): this {
    this.emitter.removeAllListeners();
    return this;
  }

  // ── Private ─────────────────────────────────────────────────────────

  private handleStdoutChunk(chunk: string): void {
    this.stdoutBuffer += chunk;
    let newlineIdx = this.stdoutBuffer.indexOf("\n");
    while (newlineIdx !== -1) {
      const line = this.stdoutBuffer.slice(0, newlineIdx);
      this.stdoutBuffer = this.stdoutBuffer.slice(newlineIdx + 1);
      if (line.length > 0) {
        this.emitter.emit("stdout-line", line);
      }
      newlineIdx = this.stdoutBuffer.indexOf("\n");
    }
  }

  private handleExit(code: number | null, signal: string | null): void {
    if (this.exited) return;
    this.exited = true;
    this.clearTimers();

    // Flush remaining stdout buffer
    if (this.stdoutBuffer.length > 0) {
      this.emitter.emit("stdout-line", this.stdoutBuffer);
      this.stdoutBuffer = "";
    }

    const result: ProcessExitResult = {
      exitCode: code,
      signal,
      cancelled: this.cancelled,
      timedOut: this.timedOut,
    };

    this.emitter.emit("exit", result);
  }

  private terminateProcess(): void {
    if (!this.child || this.exited) return;

    this.child.kill("SIGTERM");

    this.killTimer = setTimeout(() => {
      if (!this.exited && this.child) {
        this.child.kill("SIGKILL");
      }
    }, SIGTERM_GRACE_MS);
  }

  private clearTimers(): void {
    if (this.timeoutTimer) {
      clearTimeout(this.timeoutTimer);
      this.timeoutTimer = null;
    }
    if (this.killTimer) {
      clearTimeout(this.killTimer);
      this.killTimer = null;
    }
  }
}
