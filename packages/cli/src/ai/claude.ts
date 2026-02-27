/**
 * Claude Code subprocess runner.
 * Spawns `claude` CLI with --dangerously-skip-permissions for full-auto mode.
 */

import { type ChildProcess, execSync, spawn } from "node:child_process";
import { getLogger } from "../core/logger.js";
import type { AgentRunner, RunnerOptions, RunnerResult } from "../types.js";

export class ClaudeRunner implements AgentRunner {
  name = "claude";
  private process: ChildProcess | null = null;
  private aborted = false;

  async isAvailable(): Promise<boolean> {
    try {
      execSync("claude --version", {
        encoding: "utf-8",
        stdio: ["pipe", "pipe", "pipe"],
      });
      return true;
    } catch {
      return false;
    }
  }

  async getVersion(): Promise<string> {
    try {
      const output = execSync("claude --version", {
        encoding: "utf-8",
        stdio: ["pipe", "pipe", "pipe"],
      }).trim();
      // Output format varies: "claude 1.0.0" or just version number
      return output.replace(/^claude\s*/i, "");
    } catch {
      return "unknown";
    }
  }

  async execute(options: RunnerOptions): Promise<RunnerResult> {
    const log = getLogger();
    this.aborted = false;

    const args = [
      "--print",
      "--dangerously-skip-permissions",
      "--no-session-persistence",
    ];

    if (options.model) {
      args.push("--model", options.model);
    }

    if (options.verbose) {
      // stream-json gives real-time tool call events; --print requires
      // --verbose when using stream-json output format.
      args.push("--verbose", "--output-format", "stream-json");
    }

    log.debug("Spawning claude", { args: args.join(" "), cwd: options.cwd });

    return new Promise<RunnerResult>((resolve) => {
      let output = "";
      let errorOutput = "";

      // Remove Claude Code env vars to prevent nested session detection
      const env = { ...process.env };
      delete env.CLAUDECODE;
      delete env.CLAUDE_CODE;

      this.process = spawn("claude", args, {
        cwd: options.cwd,
        stdio: ["pipe", "pipe", "pipe"],
        env,
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
        log.debug("claude stderr", { text: text.slice(0, 500) });
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
            error: errorOutput || `claude exited with code ${code}`,
            exitCode: code ?? 1,
          });
        }
      });

      this.process.on("error", (err) => {
        this.process = null;
        resolve({
          success: false,
          output,
          error: `Failed to spawn claude: ${err.message}`,
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
    log.debug("Aborting claude process");

    // Graceful SIGTERM first
    this.process.kill("SIGTERM");

    // Force kill after 3 seconds
    const forceKillTimer = setTimeout(() => {
      if (this.process) {
        log.debug("Force killing claude process");
        this.process.kill("SIGKILL");
      }
    }, 3000);

    // Allow process to exit without waiting for this timer
    if (forceKillTimer.unref) {
      forceKillTimer.unref();
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
