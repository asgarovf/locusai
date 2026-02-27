/**
 * Sandboxed Codex runner.
 * Wraps Codex execution inside a Docker sandbox microVM for hypervisor-level isolation.
 * Delegates to `docker sandbox run` instead of spawning `codex` directly.
 */

import { type ChildProcess, execSync, spawn } from "node:child_process";
import { getLogger } from "../core/logger.js";
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
    this.sandboxName = buildSandboxName(options);

    // Register with shutdown handler so SIGINT/SIGTERM cleans up this sandbox
    registerActiveSandbox(this.sandboxName);

    const dockerArgs = [
      "sandbox",
      "run",
      "--name",
      this.sandboxName,
      "codex",
      options.cwd, // workspace path for Docker to sync
      "--", // separator
      ...codexArgs,
    ];

    log.debug("Spawning sandboxed codex", {
      sandboxName: this.sandboxName,
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

              if (type === "item.started" && item?.type === "command_execution") {
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
      this.cleanupSandbox();
    }
  }

  abort(): void {
    if (!this.sandboxName) return;

    this.aborted = true;
    const log = getLogger();
    log.debug("Aborting sandboxed codex process", {
      sandboxName: this.sandboxName,
    });

    // docker sandbox rm kills the VM and reclaims resources
    try {
      execSync(`docker sandbox rm ${this.sandboxName}`, { timeout: 10000 });
    } catch {
      // Sandbox may already be stopped — that's fine
    }
  }

  /** Remove the Docker sandbox and unregister from the shutdown handler. */
  private cleanupSandbox(): void {
    if (!this.sandboxName) return;

    const log = getLogger();
    log.debug("Cleaning up sandbox", { sandboxName: this.sandboxName });

    try {
      execSync(`docker sandbox rm ${this.sandboxName}`, { timeout: 10000 });
    } catch {
      // Already removed (e.g. by abort) — that's fine
    }

    unregisterActiveSandbox(this.sandboxName);
    this.sandboxName = null;
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
