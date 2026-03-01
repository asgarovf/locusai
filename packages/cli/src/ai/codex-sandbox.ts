/**
 * Sandboxed Codex runner.
 * Executes Codex inside an existing user-managed Docker sandbox.
 */

import { type ChildProcess, spawn } from "node:child_process";
import { getLogger } from "../core/logger.js";
import { enforceSandboxIgnore } from "../core/sandbox-ignore.js";
import type { AgentRunner, RunnerOptions, RunnerResult } from "../types.js";
import { buildCodexArgs, CodexRunner } from "./codex.js";

// ─── Codex JSONL event types ─────────────────────────────────────────────────

interface CodexItem {
  type?: string;
  text?: string;
  command?: string;
  exit_code?: number | null;
}

interface CodexEvent {
  type: string;
  item?: CodexItem;
}

export class SandboxedCodexRunner implements AgentRunner {
  name = "codex-sandboxed";
  private process: ChildProcess | null = null;
  private aborted = false;
  private codexInstalled = false;

  constructor(private readonly sandboxName: string) {}

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

    if (!(await this.isSandboxRunning())) {
      return {
        success: false,
        output: "",
        error: `Sandbox is not running: ${this.sandboxName}`,
        exitCode: 1,
      };
    }

    const codexArgs = buildCodexArgs(options.model);

    options.onStatusChange?.("Syncing sandbox...");
    await enforceSandboxIgnore(this.sandboxName, options.cwd);

    if (!this.codexInstalled) {
      options.onStatusChange?.("Checking codex...");
      await this.ensureCodexInstalled(this.sandboxName);
      this.codexInstalled = true;
    }

    options.onStatusChange?.("Thinking...");

    const dockerArgs = [
      "sandbox",
      "exec",
      "-i",
      "-w",
      options.cwd,
      this.sandboxName,
      "codex",
      ...codexArgs,
    ];

    log.debug("Spawning sandboxed codex", {
      sandboxName: this.sandboxName,
      args: dockerArgs.join(" "),
      cwd: options.cwd,
    });

    return await new Promise<RunnerResult>((resolve) => {
      let rawOutput = "";
      let errorOutput = "";

      this.process = spawn("docker", dockerArgs, {
        stdio: ["pipe", "pipe", "pipe"],
        env: process.env,
      });

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
                options.onToolActivity?.(text.split("\n")[0].slice(0, 80));
              }
            } else if (type === "turn.completed") {
              flushAgentMessages();
            }
          } catch {
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
          resolve({ success: true, output: rawOutput, exitCode: 0 });
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

      if (options.signal) {
        options.signal.addEventListener("abort", () => {
          this.abort();
        });
      }

      this.process.stdin?.write(options.prompt);
      this.process.stdin?.end();
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

  /** Ensure `codex` CLI is installed inside the sandbox. */
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
        {
          timeout: 120_000,
        }
      );
    }
  }
}
