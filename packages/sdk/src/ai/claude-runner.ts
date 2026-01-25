import { spawn } from "node:child_process";
import { DEFAULT_MODEL, PROVIDERS } from "../core/config.js";
import type { AiRunner } from "./runner.js";

export class ClaudeRunner implements AiRunner {
  constructor(
    private projectPath: string,
    private model: string = DEFAULT_MODEL[PROVIDERS.CLAUDE]
  ) {}

  async run(prompt: string, _isPlanning = false): Promise<string> {
    const maxRetries = 3;
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await this.executeRun(prompt);
      } catch (error) {
        const err = error as Error;
        lastError = err;
        const isLastAttempt = attempt === maxRetries;

        if (!isLastAttempt) {
          const delay = Math.pow(2, attempt) * 1000; // 2s, 4s, 8s
          console.warn(
            `Claude CLI attempt ${attempt} failed: ${err.message}. Retrying in ${delay}ms...`
          );
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      }
    }

    throw lastError || new Error("Claude CLI failed after multiple attempts");
  }

  private executeRun(prompt: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const args = [
        "--dangerously-skip-permissions",
        "--print",
        "--model",
        this.model,
      ];

      const claude = spawn("claude", args, {
        cwd: this.projectPath,
        stdio: ["pipe", "pipe", "pipe"],
        env: process.env,
        shell: true,
      });

      let output = "";
      let errorOutput = "";

      claude.stdout.on("data", (data) => {
        output += data.toString();
        // Only write to stdout if we're not retrying or if logic dictates
        // process.stdout.write(data.toString());
      });
      claude.stderr.on("data", (data) => {
        errorOutput += data.toString();
        // process.stderr.write(data.toString());
      });

      claude.on("error", (err) =>
        reject(
          new Error(
            `Failed to start Claude CLI (shell: true): ${err.message}. Please ensure the 'claude' command is available in your PATH.`
          )
        )
      );
      claude.on("close", (code) => {
        if (code === 0) resolve(output);
        else {
          const detail = errorOutput.trim();
          const message = detail
            ? `Claude CLI error (exit code ${code}): ${detail}`
            : `Claude CLI exited with code ${code}. Please ensure the Claude CLI is installed and you are logged in (run 'claude' manually to check).`;
          reject(new Error(message));
        }
      });

      claude.stdin.write(prompt);
      claude.stdin.end();
    });
  }
}
