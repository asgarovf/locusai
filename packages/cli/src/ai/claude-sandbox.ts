/**
 * Sandboxed Claude Code runner.
 * Wraps Claude execution inside a Docker sandbox microVM for hypervisor-level isolation.
 *
 * Supports two modes:
 * - **Ephemeral** (default): creates a sandbox per execute() call and removes it after.
 * - **Persistent**: reuses a single sandbox across multiple execute() calls.
 *   The first call uses `docker sandbox run` to create it; subsequent calls
 *   use `docker sandbox exec`. Call `destroy()` to remove the sandbox when done.
 */

import { type ChildProcess, execSync, spawn } from "node:child_process";
import { getLogger } from "../core/logger.js";
import { enforceSandboxIgnore } from "../core/sandbox-ignore.js";
import {
  registerActiveSandbox,
  unregisterActiveSandbox,
} from "../core/shutdown.js";
import type { AgentRunner, RunnerOptions, RunnerResult } from "../types.js";
import { buildClaudeArgs } from "./claude.js";

export class SandboxedClaudeRunner implements AgentRunner {
  name = "claude-sandboxed";
  private process: ChildProcess | null = null;
  private aborted = false;
  private sandboxName: string | null = null;

  // ─── Persistent sandbox support ───────────────────────────────────────────
  private persistent: boolean;
  private sandboxCreated = false;
  /** When true, the sandbox is user-managed (created by `locus sandbox`). Never destroy it. */
  private userManaged = false;

  /**
   * @param persistentName  If provided, enables persistent mode.
   *   The sandbox with this name is created on the first execute() call
   *   and reused for all subsequent calls. Call destroy() to clean up.
   * @param userManaged  If true, the sandbox was created externally by
   *   `locus sandbox` and already exists. We only exec into it, never
   *   create or destroy it.
   */
  constructor(persistentName?: string, userManaged = false) {
    if (persistentName) {
      this.persistent = true;
      this.sandboxName = persistentName;
      this.userManaged = userManaged;
      // If user-managed, the sandbox already exists
      if (userManaged) {
        this.sandboxCreated = true;
      }
    } else {
      this.persistent = false;
    }
  }

  /** Delegate to ClaudeRunner — checks host `claude` CLI availability. */
  async isAvailable(): Promise<boolean> {
    const { ClaudeRunner } = await import("./claude.js");
    const delegate = new ClaudeRunner();
    return delegate.isAvailable();
  }

  /** Delegate to ClaudeRunner — returns host `claude` CLI version. */
  async getVersion(): Promise<string> {
    const { ClaudeRunner } = await import("./claude.js");
    const delegate = new ClaudeRunner();
    return delegate.getVersion();
  }

  async execute(options: RunnerOptions): Promise<RunnerResult> {
    const log = getLogger();
    this.aborted = false;

    // Use -p to pass the prompt as a CLI argument since docker sandbox run
    // doesn't forward stdin to the agent process inside the VM.
    // Note: -p is the short form of --print; we must NOT also include --print
    // (which buildClaudeArgs used to add) or claude's arg parser will conflict.
    const claudeArgs = ["-p", options.prompt, ...buildClaudeArgs(options)];

    let dockerArgs: string[];

    if (this.persistent && !this.sandboxName) {
      throw new Error("Sandbox name is required");
    }

    if (
      this.persistent &&
      this.sandboxCreated &&
      (await this.isSandboxRunning())
    ) {
      // ── Persistent mode: sandbox already exists → docker sandbox exec ──
      const name = this.sandboxName; // Guaranteed non-null by isSandboxRunning

      if (!name) {
        throw new Error("Sandbox name is required");
      }

      // Enforce .sandboxignore before each exec to remove sensitive files
      options.onStatusChange?.("Syncing sandbox...");
      await enforceSandboxIgnore(name, options.cwd);
      options.onStatusChange?.("Thinking...");

      // Docker sandbox exposes the workspace at the same host path (not
      // /home/agent/workspace), so set -w to the host cwd.
      dockerArgs = [
        "sandbox",
        "exec",
        "-w",
        options.cwd,
        name,
        "claude",
        ...claudeArgs,
      ];
    } else {
      // ── First call (persistent) or ephemeral mode → docker sandbox run ──
      if (!this.persistent) {
        this.sandboxName = buildSandboxName(options);
      }

      const name = this.sandboxName;

      if (!name) {
        throw new Error("Sandbox name is required");
      }

      registerActiveSandbox(name);

      options.onStatusChange?.("Syncing sandbox...");

      dockerArgs = [
        "sandbox",
        "run",
        "--name",
        name,
        "claude",
        options.cwd, // workspace path for Docker to sync
        "--", // separator
        ...claudeArgs,
      ];
    }

    log.debug("Spawning sandboxed claude", {
      sandboxName: this.sandboxName,
      persistent: this.persistent,
      reusing: this.persistent && this.sandboxCreated,
      args: dockerArgs.join(" "),
      cwd: options.cwd,
    });

    try {
      return await new Promise<RunnerResult>((resolve) => {
        let output = "";
        let errorOutput = "";

        this.process = spawn("docker", dockerArgs, {
          stdio: ["ignore", "pipe", "pipe"],
          env: process.env, // Docker proxy handles credential injection
        });

        // If this is a persistent sandbox run (first call), mark as created
        // once the process spawns successfully.
        if (this.persistent && !this.sandboxCreated) {
          this.process.on("spawn", () => {
            this.sandboxCreated = true;
          });
        }

        if (options.verbose) {
          // JSON stream mode: parse NDJSON events to extract tool calls and
          // the final text response separately.
          let lineBuffer = "";
          const seenToolIds = new Set<string>();

          this.process.stdout?.on("data", (chunk: Buffer) => {
            lineBuffer += chunk.toString();
            const lines = lineBuffer.split("\n");
            lineBuffer = lines.pop() ?? "";

            for (const line of lines) {
              if (!line.trim()) continue;
              try {
                const event = JSON.parse(line) as ClaudeStreamEvent;

                if (event.type === "assistant" && event.message?.content) {
                  for (const item of event.message.content) {
                    if (
                      item.type === "tool_use" &&
                      item.id &&
                      !seenToolIds.has(item.id)
                    ) {
                      seenToolIds.add(item.id);
                      options.onToolActivity?.(
                        formatToolCall(item.name ?? "", item.input ?? {})
                      );
                    }
                  }
                } else if (event.type === "result") {
                  const text = event.result ?? "";
                  output = text;
                  options.onOutput?.(text);
                }
              } catch {
                const newLine = `${line}\n`;

                output += newLine;
                options.onOutput?.(newLine);
              }
            }
          });
        } else {
          this.process.stdout?.on("data", (chunk: Buffer) => {
            const text = chunk.toString();
            output += text;
            options.onOutput?.(text);
          });
        }

        this.process.stderr?.on("data", (chunk: Buffer) => {
          const text = chunk.toString();
          errorOutput += text;
          log.debug("sandboxed claude stderr", { text: text.slice(0, 500) });
          // Surface stderr so the user can see sandbox errors in real time
          options.onOutput?.(text);
        });

        this.process.on("close", (code) => {
          this.process = null;

          if (this.aborted) {
            resolve({
              success: false,
              output,
              error: "Aborted by user",
              exitCode: code ?? 143,
            });
            return;
          }

          if (code === 0) {
            resolve({
              success: true,
              output,
              exitCode: 0,
            });
          } else {
            resolve({
              success: false,
              output,
              error: errorOutput || `sandboxed claude exited with code ${code}`,
              exitCode: code ?? 1,
            });
          }
        });

        this.process.on("error", (err) => {
          this.process = null;
          // Spawn failed — sandbox was NOT created
          if (this.persistent && !this.sandboxCreated) {
            // Keep sandboxCreated as false so next call retries with `run`
          }
          resolve({
            success: false,
            output,
            error: `Failed to spawn docker sandbox: ${err.message}`,
            exitCode: 1,
          });
        });

        // Handle abort signal
        if (options.signal) {
          options.signal.addEventListener("abort", () => {
            this.abort();
          });
        }
      });
    } finally {
      // Only clean up sandbox in ephemeral mode
      if (!this.persistent) {
        this.cleanupSandbox();
      }
    }
  }

  abort(): void {
    this.aborted = true;
    const log = getLogger();

    if (this.persistent) {
      // Persistent mode: kill the local docker exec/run process
      // but keep the sandbox alive for future prompts.
      log.debug("Aborting sandboxed claude (persistent — keeping sandbox)", {
        sandboxName: this.sandboxName,
      });
      if (this.process) {
        this.process.kill("SIGTERM");
        const timer = setTimeout(() => {
          if (this.process) {
            this.process.kill("SIGKILL");
          }
        }, 3000);
        if (timer.unref) timer.unref();
      }
    } else {
      // Ephemeral mode: remove the sandbox entirely
      if (!this.sandboxName) return;
      log.debug("Aborting sandboxed claude (ephemeral — removing sandbox)", {
        sandboxName: this.sandboxName,
      });
      try {
        execSync(`docker sandbox rm ${this.sandboxName}`, { timeout: 60_000 });
      } catch {
        // Sandbox may already be stopped — that's fine
      }
    }
  }

  /**
   * Remove the persistent sandbox and unregister from shutdown handler.
   * Call this when the REPL session ends.
   * No-op in ephemeral mode (cleanup happens automatically).
   * No-op for user-managed sandboxes (lifecycle controlled by `locus sandbox rm`).
   */
  destroy(): void {
    if (!this.sandboxName) return;

    // User-managed sandboxes are never destroyed by the runner
    if (this.userManaged) {
      unregisterActiveSandbox(this.sandboxName);
      return;
    }

    const log = getLogger();
    log.debug("Destroying sandbox", { sandboxName: this.sandboxName });

    try {
      execSync(`docker sandbox rm ${this.sandboxName}`, { timeout: 60_000 });
    } catch {
      // Already removed — that's fine
    }

    unregisterActiveSandbox(this.sandboxName);
    this.sandboxName = null;
    this.sandboxCreated = false;
  }

  /** Remove the Docker sandbox and unregister from the shutdown handler. (Ephemeral mode only.) */
  private cleanupSandbox(): void {
    if (!this.sandboxName) return;

    const log = getLogger();
    log.debug("Cleaning up sandbox", { sandboxName: this.sandboxName });

    try {
      execSync(`docker sandbox rm ${this.sandboxName}`, {
        timeout: 60_000,
      });
    } catch {
      // Already removed (e.g. by abort) — that's fine
    }

    unregisterActiveSandbox(this.sandboxName);
    this.sandboxName = null;
  }

  /** Check if the sandbox is actually running (via `docker sandbox ls`). */
  private async isSandboxRunning(): Promise<boolean> {
    if (!this.sandboxName) return false;
    try {
      const { promisify } = await import("node:util");
      const { exec } = await import("node:child_process");
      const execAsync = promisify(exec);
      const { stdout } = await execAsync("docker sandbox ls", {
        timeout: 5000,
      });
      return stdout.includes(this.sandboxName);
    } catch {
      return false;
    }
  }

  /** Get the current sandbox name (for external cleanup/registry). */
  getSandboxName(): string | null {
    return this.sandboxName;
  }
}

/**
 * Build a sandbox name from runner options.
 * For issue runs (activity like "issue #42"), produces: locus-issue-42-<timestamp>
 * Fallback: locus-<last-path-segment>-<timestamp>
 */
function buildSandboxName(options: { cwd: string; activity?: string }): string {
  const ts = Date.now();

  // Extract issue number from activity label (e.g., "issue #42")
  if (options.activity) {
    const match = options.activity.match(/issue\s*#(\d+)/i);
    if (match) {
      return `locus-issue-${match[1]}-${ts}`;
    }
  }

  // Fallback to cwd-based naming
  const segment = options.cwd.split("/").pop() ?? "run";
  return `locus-${segment}-${ts}`;
}

/**
 * Build a persistent sandbox name for a REPL session.
 * Uses the workspace directory name + timestamp.
 */
export function buildPersistentSandboxName(cwd: string): string {
  const segment = cwd.split("/").pop() ?? "repl";
  return `locus-${segment}-${Date.now()}`;
}

// ─── stream-json event types (subset used for verbose mode) ─────────────────

interface ClaudeStreamEvent {
  type: string;
  message?: {
    content?: Array<{
      type: string;
      id?: string;
      name?: string;
      input?: Record<string, unknown>;
    }>;
  };
  /** Final text result (type: "result"). */
  result?: string;
  is_error?: boolean;
}

function formatToolCall(name: string, input: Record<string, unknown>): string {
  switch (name) {
    case "Read":
      return `reading ${input.file_path ?? ""}`;
    case "Write":
      return `writing ${input.file_path ?? ""}`;
    case "Edit":
    case "MultiEdit":
      return `editing ${input.file_path ?? ""}`;
    case "Bash":
      return `running: ${String(input.command ?? "").slice(0, 60)}`;
    case "Glob":
      return `glob ${input.pattern ?? ""}`;
    case "Grep":
      return `grep ${input.pattern ?? ""}`;
    case "LS":
      return `ls ${input.path ?? ""}`;
    case "WebFetch":
      return `fetching ${String(input.url ?? "").slice(0, 50)}`;
    case "WebSearch":
      return `searching: ${input.query ?? ""}`;
    case "Task":
      return `spawning agent`;
    default:
      return name;
  }
}
