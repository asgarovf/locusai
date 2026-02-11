import { type ChildProcess, spawn } from "node:child_process";
import { join } from "node:path";
import type { TelegramConfig } from "./config.js";
import { buildSpawnEnv } from "./env.js";
import {
  EXECUTE_DEFAULT_TIMEOUT,
  STREAMING_DEFAULT_TIMEOUT,
} from "./timeouts.js";

function timestamp(): string {
  return new Date().toLocaleTimeString("en-GB", { hour12: false });
}

function log(id: string, message: string): void {
  console.log(`[${timestamp()}] [${id}] ${message}`);
}

export interface ExecutionResult {
  stdout: string;
  stderr: string;
  exitCode: number | null;
  killed: boolean;
}

interface RunningProcess {
  process: ChildProcess;
  command: string;
  startedAt: Date;
}

/**
 * Executes Locus CLI commands as child processes.
 * Captures output and supports killing running processes.
 */
export class CliExecutor {
  private config: TelegramConfig;
  private runningProcesses: Map<string, RunningProcess> = new Map();

  constructor(config: TelegramConfig) {
    this.config = config;
  }

  /**
   * Resolve the command and args based on testMode.
   * In test mode: `bun run packages/cli/src/cli.ts <args>`
   * In normal mode: `locus <args>`
   */
  private resolveCommand(args: string[]): { cmd: string; cmdArgs: string[] } {
    if (this.config.testMode) {
      const cliPath = join(this.config.projectPath, "packages/cli/src/cli.ts");
      return { cmd: "bun", cmdArgs: ["run", cliPath, ...args] };
    }
    return { cmd: "locus", cmdArgs: args };
  }

  /**
   * Execute a locus CLI command and return the full output.
   */
  async execute(
    args: string[],
    options?: { timeout?: number }
  ): Promise<ExecutionResult> {
    const timeout = options?.timeout ?? EXECUTE_DEFAULT_TIMEOUT;
    const id = `proc-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

    const { cmd, cmdArgs } = this.resolveCommand(args);
    const fullCommand = `${cmd} ${cmdArgs.join(" ")}`;
    const startTime = Date.now();
    log(id, `Process started: ${fullCommand}`);

    return new Promise<ExecutionResult>((resolve) => {
      const proc = spawn(cmd, cmdArgs, {
        cwd: this.config.projectPath,
        env: buildSpawnEnv(),
        stdio: ["pipe", "pipe", "pipe"],
      });

      this.runningProcesses.set(id, {
        process: proc,
        command: fullCommand,
        startedAt: new Date(),
      });

      let stdout = "";
      let stderr = "";
      let killed = false;

      proc.stdout?.on("data", (data: Buffer) => {
        stdout += data.toString();
      });

      proc.stderr?.on("data", (data: Buffer) => {
        stderr += data.toString();
      });

      const timer = setTimeout(() => {
        killed = true;
        proc.kill("SIGTERM");
      }, timeout);

      proc.on("close", (exitCode) => {
        clearTimeout(timer);
        this.runningProcesses.delete(id);
        const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
        log(
          id,
          `Process exited (code: ${exitCode}, ${elapsed}s)${killed ? " [killed]" : ""}`
        );
        resolve({ stdout, stderr, exitCode, killed });
      });

      proc.on("error", (err) => {
        clearTimeout(timer);
        this.runningProcesses.delete(id);
        log(id, `Process error: ${err.message}`);
        resolve({
          stdout,
          stderr: stderr || err.message,
          exitCode: 1,
          killed: false,
        });
      });
    });
  }

  /**
   * Execute a locus CLI command and stream output via a callback.
   * Useful for long-running commands like `locus run`.
   */
  executeStreaming(
    args: string[],
    onOutput: (chunk: string) => void,
    options?: { timeout?: number }
  ): { id: string; kill: () => void; done: Promise<ExecutionResult> } {
    const timeout = options?.timeout ?? STREAMING_DEFAULT_TIMEOUT;
    const id = `proc-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

    const { cmd, cmdArgs } = this.resolveCommand(args);
    const fullCommand = `${cmd} ${cmdArgs.join(" ")}`;
    const startTime = Date.now();
    log(id, `Process started (streaming): ${fullCommand}`);

    const proc = spawn(cmd, cmdArgs, {
      cwd: this.config.projectPath,
      env: buildSpawnEnv(),
      stdio: ["pipe", "pipe", "pipe"],
    });

    this.runningProcesses.set(id, {
      process: proc,
      command: fullCommand,
      startedAt: new Date(),
    });

    let stdout = "";
    let stderr = "";
    let killed = false;

    proc.stdout?.on("data", (data: Buffer) => {
      const text = data.toString();
      stdout += text;
      onOutput(text);
    });

    proc.stderr?.on("data", (data: Buffer) => {
      const text = data.toString();
      stderr += text;
      onOutput(text);
    });

    const timer = setTimeout(() => {
      killed = true;
      proc.kill("SIGTERM");
    }, timeout);

    const done = new Promise<ExecutionResult>((resolve) => {
      proc.on("close", (exitCode) => {
        clearTimeout(timer);
        this.runningProcesses.delete(id);
        const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
        log(
          id,
          `Process exited (code: ${exitCode}, ${elapsed}s)${killed ? " [killed]" : ""}`
        );
        resolve({ stdout, stderr, exitCode, killed });
      });

      proc.on("error", (err) => {
        clearTimeout(timer);
        this.runningProcesses.delete(id);
        log(id, `Process error: ${err.message}`);
        resolve({
          stdout,
          stderr: stderr || err.message,
          exitCode: 1,
          killed: false,
        });
      });
    });

    return {
      id,
      kill: () => {
        killed = true;
        proc.kill("SIGTERM");
      },
      done,
    };
  }

  /**
   * Build common CLI args from config
   */
  buildArgs(base: string[], options?: { needsApiKey?: boolean }): string[] {
    const args = [...base];

    if (options?.needsApiKey && this.config.apiKey) {
      args.push("--api-key", this.config.apiKey);
    }

    if (this.config.apiBase) {
      args.push("--api-url", this.config.apiBase);
    }

    if (this.config.workspaceId) {
      args.push("--workspace", this.config.workspaceId);
    }

    if (this.config.provider) {
      args.push("--provider", this.config.provider);
    }

    if (this.config.model) {
      args.push("--model", this.config.model);
    }

    args.push("--dir", this.config.projectPath);

    return args;
  }

  /**
   * Stop all running processes
   */
  stopAll(): number {
    let count = 0;
    for (const [id, entry] of this.runningProcesses.entries()) {
      if (!entry.process.killed) {
        entry.process.kill("SIGTERM");
        count++;
      }
      this.runningProcesses.delete(id);
    }
    return count;
  }

  /**
   * Get info about running processes
   */
  getRunning(): { id: string; command: string; startedAt: Date }[] {
    return Array.from(this.runningProcesses.entries()).map(([id, entry]) => ({
      id,
      command: entry.command,
      startedAt: entry.startedAt,
    }));
  }
}
