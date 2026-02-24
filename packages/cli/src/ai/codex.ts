/**
 * Codex CLI subprocess runner.
 * Spawns `codex exec` in full-auto mode.
 */

import { type ChildProcess, execSync, spawn } from "node:child_process";
import { getLogger } from "../core/logger.js";
import type { AgentRunner, RunnerOptions, RunnerResult } from "../types.js";

export function buildCodexArgs(model?: string): string[] {
  const args = ["exec", "--full-auto", "--skip-git-repo-check"];

  if (model) {
    args.push("--model", model);
  }

  args.push("-"); // Read prompt from stdin
  return args;
}

export class CodexRunner implements AgentRunner {
  name = "codex";
  private process: ChildProcess | null = null;
  private aborted = false;

  async isAvailable(): Promise<boolean> {
    try {
      execSync("codex --version", {
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
      const output = execSync("codex --version", {
        encoding: "utf-8",
        stdio: ["pipe", "pipe", "pipe"],
      }).trim();
      return output.replace(/^codex\s*/i, "");
    } catch {
      return "unknown";
    }
  }

  async execute(options: RunnerOptions): Promise<RunnerResult> {
    const log = getLogger();
    this.aborted = false;

    const args = buildCodexArgs(options.model);

    log.debug("Spawning codex", { args: args.join(" "), cwd: options.cwd });

    return new Promise<RunnerResult>((resolve) => {
      let output = "";
      let errorOutput = "";

      this.process = spawn("codex", args, {
        cwd: options.cwd,
        stdio: ["pipe", "pipe", "pipe"],
        env: { ...process.env },
      });

      this.process.stdout?.on("data", (chunk: Buffer) => {
        const text = chunk.toString();
        output += text;
        options.onOutput?.(text);
      });

      this.process.stderr?.on("data", (chunk: Buffer) => {
        const text = chunk.toString();
        errorOutput += text;
        log.debug("codex stderr", { text: text.slice(0, 500) });
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
            error: errorOutput || `codex exited with code ${code}`,
            exitCode: code ?? 1,
          });
        }
      });

      this.process.on("error", (err) => {
        this.process = null;
        resolve({
          success: false,
          output,
          error: `Failed to spawn codex: ${err.message}`,
          exitCode: 1,
        });
      });

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
  }

  abort(): void {
    if (!this.process) return;

    this.aborted = true;
    const log = getLogger();
    log.debug("Aborting codex process");

    this.process.kill("SIGTERM");

    const forceKillTimer = setTimeout(() => {
      if (this.process) {
        log.debug("Force killing codex process");
        this.process.kill("SIGKILL");
      }
    }, 3000);

    if (forceKillTimer.unref) {
      forceKillTimer.unref();
    }
  }
}
