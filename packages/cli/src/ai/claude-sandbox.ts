/**
 * Sandboxed Claude Code runner.
 * Wraps Claude execution inside a Docker sandbox microVM for hypervisor-level isolation.
 * Delegates to `docker sandbox run` instead of spawning `claude` directly.
 */

import { type ChildProcess, spawn } from "node:child_process";
import { getLogger } from "../core/logger.js";
import type { AgentRunner, RunnerOptions, RunnerResult } from "../types.js";
import { buildClaudeArgs, ClaudeRunner } from "./claude.js";

export class SandboxedClaudeRunner implements AgentRunner {
  name = "claude-sandboxed";
  private process: ChildProcess | null = null;
  private aborted = false;
  private sandboxName: string | null = null;

  /** Delegate to ClaudeRunner — checks host `claude` CLI availability. */
  async isAvailable(): Promise<boolean> {
    const delegate = new ClaudeRunner();
    return delegate.isAvailable();
  }

  /** Delegate to ClaudeRunner — returns host `claude` CLI version. */
  async getVersion(): Promise<string> {
    const delegate = new ClaudeRunner();
    return delegate.getVersion();
  }

  async execute(options: RunnerOptions): Promise<RunnerResult> {
    const log = getLogger();
    this.aborted = false;

    const claudeArgs = buildClaudeArgs(options);
    const activityId = options.cwd.split("/").pop() ?? "run";
    this.sandboxName = `locus-${activityId}-${Date.now()}`;

    const dockerArgs = [
      "sandbox",
      "run",
      "--name",
      this.sandboxName,
      "claude",
      options.cwd, // workspace path for Docker to sync
      "--", // separator
      ...claudeArgs,
    ];

    log.debug("Spawning sandboxed claude", {
      sandboxName: this.sandboxName,
      args: dockerArgs.join(" "),
      cwd: options.cwd,
    });

    return new Promise<RunnerResult>((resolve) => {
      let output = "";
      let errorOutput = "";

      this.process = spawn("docker", dockerArgs, {
        stdio: ["pipe", "pipe", "pipe"],
        env: process.env, // Docker proxy handles credential injection
      });

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

      // Write prompt via stdin and close it — passing prompt as a CLI argument
      // can exceed OS arg limits for long prompts, and leaving stdin open causes
      // claude to hang waiting for input when it detects a piped stdin.
      this.process.stdin?.write(options.prompt);
      this.process.stdin?.end();
    });
  }

  abort(): void {
    if (!this.process) return;

    this.aborted = true;
    const log = getLogger();
    log.debug("Aborting sandboxed claude process", {
      sandboxName: this.sandboxName,
    });

    // Graceful SIGTERM first
    this.process.kill("SIGTERM");

    // Force kill after 3 seconds
    const forceKillTimer = setTimeout(() => {
      if (this.process) {
        log.debug("Force killing sandboxed claude process");
        this.process.kill("SIGKILL");
      }
    }, 3000);

    if (forceKillTimer.unref) {
      forceKillTimer.unref();
    }
  }

  /** Get the current sandbox name (for external cleanup/registry). */
  getSandboxName(): string | null {
    return this.sandboxName;
  }
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
