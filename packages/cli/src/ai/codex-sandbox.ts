/**
 * Sandboxed Codex runner.
 * Wraps Codex execution inside a Docker sandbox microVM for hypervisor-level isolation.
 *
 * Supports two modes:
 * - **Ephemeral** (default): creates a sandbox per execute() call and removes it after.
 * - **Persistent**: reuses a single sandbox across multiple execute() calls.
 *   The first call uses `docker sandbox run` to create it; subsequent calls
 *   use `docker sandbox exec`. Call `destroy()` to remove the sandbox when done.
 *
 * Docker sandbox only ships with `claude` pre-installed. This runner creates
 * the sandbox with `claude` as the base agent and then installs `codex` inside.
 */

import { type ChildProcess, execSync, spawn } from "node:child_process";
import { getLogger } from "../core/logger.js";
import { enforceSandboxIgnore } from "../core/sandbox-ignore.js";
import {
  registerActiveSandbox,
  unregisterActiveSandbox,
} from "../core/shutdown.js";
import type { AgentRunner, RunnerOptions, RunnerResult } from "../types.js";
import { buildCodexArgs, CodexRunner } from "./codex.js";

// ─── Codex JSONL event types ─────────────────────────────────────────────────

interface CodexItem {
  id?: string;
  type?: string;
  text?: string;
  command?: string;
  aggregated_output?: string;
  exit_code?: number | null;
  status?: string;
}

interface CodexEvent {
  type: string;
  item?: CodexItem;
  thread_id?: string;
  usage?: Record<string, number>;
}

export class SandboxedCodexRunner implements AgentRunner {
  name = "codex-sandboxed";
  private process: ChildProcess | null = null;
  private aborted = false;
  private sandboxName: string | null = null;

  // ─── Persistent sandbox support ───────────────────────────────────────────
  private persistent: boolean;
  private sandboxCreated = false;
  /** When true, the sandbox is user-managed (created by `locus sandbox`). Never destroy it. */
  private userManaged = false;
  /** Track whether codex has been installed in this sandbox to avoid repeated checks. */
  private codexInstalled = false;

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
      if (userManaged) {
        this.sandboxCreated = true;
      }
    } else {
      this.persistent = false;
    }
  }

  /** Delegate to CodexRunner — checks host `codex` CLI availability. */
  async isAvailable(): Promise<boolean> {
    const delegate = new CodexRunner();
    return delegate.isAvailable();
  }

  /** Delegate to CodexRunner — returns host `codex` CLI version. */
  async getVersion(): Promise<string> {
    const delegate = new CodexRunner();
    return delegate.getVersion();
  }

  async execute(options: RunnerOptions): Promise<RunnerResult> {
    const log = getLogger();
    this.aborted = false;

    const codexArgs = buildCodexArgs(options.model);

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
      const name = this.sandboxName;

      if (!name) {
        throw new Error("Sandbox name is required");
      }

      options.onStatusChange?.("Syncing sandbox...");
      await enforceSandboxIgnore(name, options.cwd);

      // Ensure codex is installed in the sandbox
      if (!this.codexInstalled) {
        options.onStatusChange?.("Checking codex...");
        await this.ensureCodexInstalled(name);
        this.codexInstalled = true;
      }

      options.onStatusChange?.("Thinking...");

      // Use -i to keep stdin open so we can pipe the prompt to codex.
      dockerArgs = [
        "sandbox",
        "exec",
        "-i",
        "-w",
        options.cwd,
        name,
        "codex",
        ...codexArgs,
      ];
    } else {
      // ── First call (persistent) or ephemeral mode ──
      // Docker sandbox only ships with `claude` pre-installed.
      // Create the sandbox with `claude` as the base agent, then install codex.
      if (!this.persistent) {
        this.sandboxName = buildSandboxName(options);
      }

      const name = this.sandboxName;

      if (!name) {
        throw new Error("Sandbox name is required");
      }

      registerActiveSandbox(name);

      // Step 1: Create sandbox with claude as the base agent
      options.onStatusChange?.("Creating sandbox...");
      await this.createSandboxWithClaude(name, options.cwd);

      // Step 2: Install codex
      options.onStatusChange?.("Installing codex...");
      await this.ensureCodexInstalled(name);
      this.codexInstalled = true;

      // Step 3: Enforce sandbox ignore
      options.onStatusChange?.("Syncing sandbox...");
      await enforceSandboxIgnore(name, options.cwd);

      options.onStatusChange?.("Thinking...");

      dockerArgs = [
        "sandbox",
        "exec",
        "-i",
        "-w",
        options.cwd,
        name,
        "codex",
        ...codexArgs,
      ];
    }

    log.debug("Spawning sandboxed codex", {
      sandboxName: this.sandboxName,
      persistent: this.persistent,
      reusing: this.persistent && this.sandboxCreated,
      args: dockerArgs.join(" "),
      cwd: options.cwd,
    });

    try {
      return await new Promise<RunnerResult>((resolve) => {
        let rawOutput = "";
        let errorOutput = "";

        this.process = spawn("docker", dockerArgs, {
          stdio: ["pipe", "pipe", "pipe"],
          env: process.env, // Docker proxy handles credential injection
        });

        // If this is a persistent sandbox run (first call), mark as created
        // once the process spawns successfully.
        if (this.persistent && !this.sandboxCreated) {
          this.process.on("spawn", () => {
            this.sandboxCreated = true;
          });
        }

        // Buffer agent_message items; flush to onOutput only on turn.completed
        // so the indicator stays alive while tools are running.
        let agentMessages: string[] = [];

        const flushAgentMessages = () => {
          if (agentMessages.length > 0) {
            options.onOutput?.(agentMessages.join("\n\n"));
            agentMessages = [];
          }
        };

        let lineBuffer = "";
        this.process.stdout?.on("data", (chunk: Buffer) => {
          lineBuffer += chunk.toString();
          const lines = lineBuffer.split("\n");
          lineBuffer = lines.pop() ?? "";

          for (const line of lines) {
            if (!line.trim()) continue;
            rawOutput += `${line}\n`;
            log.debug("sandboxed codex stdout line", { line });

            try {
              const event = JSON.parse(line) as CodexEvent;
              const { type, item } = event;

              if (
                type === "item.started" &&
                item?.type === "command_execution"
              ) {
                const cmd = (item.command ?? "").split("\n")[0].slice(0, 80);
                options.onToolActivity?.(`running: ${cmd}`);
              } else if (
                type === "item.completed" &&
                item?.type === "command_execution"
              ) {
                const code = item.exit_code;
                options.onToolActivity?.(code === 0 ? "done" : `exit ${code}`);
              } else if (
                type === "item.completed" &&
                item?.type === "reasoning"
              ) {
                const text = (item.text ?? "")
                  .trim()
                  .replace(/\*\*([^*]+)\*\*/g, "$1")
                  .replace(/(?<!\*)\*([^*]+)\*(?!\*)/g, "$1");
                if (text) options.onToolActivity?.(text);
              } else if (
                type === "item.completed" &&
                item?.type === "agent_message"
              ) {
                const text = item.text ?? "";
                if (text) {
                  agentMessages.push(text);
                  // Show a preview in the spinner while waiting for turn.completed
                  options.onToolActivity?.(text.split("\n")[0].slice(0, 80));
                }
              } else if (type === "turn.completed") {
                flushAgentMessages();
              }
            } catch {
              // Non-JSON line — pass through as output
              const newLine = `${line}\n`;
              rawOutput += newLine;
              options.onOutput?.(newLine);
            }
          }
        });

        this.process.stderr?.on("data", (chunk: Buffer) => {
          const text = chunk.toString();
          errorOutput += text;
          log.debug("sandboxed codex stderr", { text: text.slice(0, 500) });
        });

        this.process.on("close", (code) => {
          this.process = null;
          flushAgentMessages();

          if (this.aborted) {
            resolve({
              success: false,
              output: rawOutput,
              error: "Aborted by user",
              exitCode: code ?? 143,
            });
            return;
          }

          if (code === 0) {
            resolve({
              success: true,
              output: rawOutput,
              exitCode: 0,
            });
          } else {
            resolve({
              success: false,
              output: rawOutput,
              error: errorOutput || `sandboxed codex exited with code ${code}`,
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
            output: rawOutput,
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

        // Write prompt via stdin and close it — passing prompt as a CLI argument
        // can exceed OS arg limits for long prompts, and leaving stdin open causes
        // the process to hang waiting for input.
        this.process.stdin?.write(options.prompt);
        this.process.stdin?.end();
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
      // Persistent mode: kill the local docker exec process
      // but keep the sandbox alive for future prompts.
      log.debug("Aborting sandboxed codex (persistent — keeping sandbox)", {
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
      log.debug("Aborting sandboxed codex (ephemeral — removing sandbox)", {
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

  /**
   * Create a sandbox using `claude` as the base agent.
   * Docker sandbox only ships `claude` — we install `codex` separately.
   */
  private async createSandboxWithClaude(
    name: string,
    cwd: string
  ): Promise<void> {
    const { promisify } = await import("node:util");
    const { exec } = await import("node:child_process");
    const execAsync = promisify(exec);

    try {
      await execAsync(
        `docker sandbox run --name ${name} claude ${cwd} -- --version`,
        { timeout: 120_000 }
      );
    } catch {
      // claude --version exits quickly; non-zero exit is OK as long as the sandbox was created
    }
  }

  /**
   * Ensure `codex` CLI is installed inside the sandbox.
   * No-op if already installed.
   */
  private async ensureCodexInstalled(name: string): Promise<void> {
    const { promisify } = await import("node:util");
    const { exec } = await import("node:child_process");
    const execAsync = promisify(exec);

    try {
      await execAsync(`docker sandbox exec ${name} which codex`, {
        timeout: 5000,
      });
    } catch {
      await execAsync(
        `docker sandbox exec ${name} npm install -g @openai/codex`,
        { timeout: 120_000 }
      );
    }
  }

  /** Get the current sandbox name (for external cleanup/registry). */
  getSandboxName(): string | null {
    return this.sandboxName;
  }
}

/**
 * Build a sandbox name from runner options.
 * For issue runs (activity like "issue #42"), produces: locus-codex-issue-42-<timestamp>
 * Fallback: locus-codex-<last-path-segment>-<timestamp>
 */
function buildSandboxName(options: { cwd: string; activity?: string }): string {
  const ts = Date.now();

  // Extract issue number from activity label (e.g., "issue #42")
  if (options.activity) {
    const match = options.activity.match(/issue\s*#(\d+)/i);
    if (match) {
      return `locus-codex-issue-${match[1]}-${ts}`;
    }
  }

  // Fallback to cwd-based naming
  const segment = options.cwd.split("/").pop() ?? "run";
  return `locus-codex-${segment}-${ts}`;
}
