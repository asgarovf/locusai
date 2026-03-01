/**
 * Sandboxed Claude runner.
 * Executes Claude inside an existing user-managed Docker sandbox.
 */

import { type ChildProcess, spawn } from "node:child_process";
import { getLogger } from "../core/logger.js";
import { enforceSandboxIgnore } from "../core/sandbox-ignore.js";
import type { AgentRunner, RunnerOptions, RunnerResult } from "../types.js";
import { buildClaudeArgs } from "./claude.js";

export class SandboxedClaudeRunner implements AgentRunner {
  name = "claude-sandboxed";
  private process: ChildProcess | null = null;
  private aborted = false;

  constructor(private readonly sandboxName: string) {}

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

    if (!(await this.isSandboxRunning())) {
      return {
        success: false,
        output: "",
        error: `Sandbox is not running: ${this.sandboxName}`,
        exitCode: 1,
      };
    }

    // Use -p to pass prompt because docker sandbox exec doesn't pass stdin into
    // Claude's prompt argument flow the same way across environments.
    const claudeArgs = ["-p", options.prompt, ...buildClaudeArgs(options)];

    options.onStatusChange?.("Syncing sandbox...");
    await enforceSandboxIgnore(this.sandboxName, options.cwd);
    options.onStatusChange?.("Thinking...");

    const dockerArgs = [
      "sandbox",
      "exec",
      "-w",
      options.cwd,
      this.sandboxName,
      "claude",
      ...claudeArgs,
    ];

    log.debug("Spawning sandboxed claude", {
      sandboxName: this.sandboxName,
      args: dockerArgs.join(" "),
      cwd: options.cwd,
    });

    return await new Promise<RunnerResult>((resolve) => {
      let output = "";
      let errorOutput = "";

      this.process = spawn("docker", dockerArgs, {
        stdio: ["ignore", "pipe", "pipe"],
        env: process.env,
      });

      if (options.verbose) {
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
          resolve({ success: true, output, exitCode: 0 });
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

      if (options.signal) {
        options.signal.addEventListener("abort", () => {
          this.abort();
        });
      }
    });
  }

  abort(): void {
    this.aborted = true;
    if (!this.process) return;

    this.process.kill("SIGTERM");
    const timer = setTimeout(() => {
      if (this.process) {
        this.process.kill("SIGKILL");
      }
    }, 3000);
    if (timer.unref) timer.unref();
  }

  private async isSandboxRunning(): Promise<boolean> {
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
      return "spawning agent";
    default:
      return name;
  }
}
