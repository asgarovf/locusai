import { spawn } from "node:child_process";
import type { AiRunner } from "./runner.js";

export class CodexRunner implements AiRunner {
  constructor(
    private projectPath: string,
    private model?: string
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
            `Codex CLI attempt ${attempt} failed: ${err.message}. Retrying in ${delay}ms...`
          );
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      }
    }

    throw lastError || new Error("Codex CLI failed after multiple attempts");
  }

  private executeRun(prompt: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const args: string[] = ["exec", "--full-auto"];

      if (this.model) {
        args.push("--model", this.model);
      }

      // Read prompt from stdin to avoid arg-length limits.
      args.push("-");

      const codex = spawn("codex", args, {
        cwd: this.projectPath,
        stdio: ["pipe", "pipe", "pipe"],
        env: process.env,
        shell: false,
      });

      let output = "";
      let errorOutput = "";

      codex.stdout.on("data", (data) => {
        output += data.toString();
      });
      codex.stderr.on("data", (data) => {
        errorOutput += data.toString();
      });

      codex.on("error", (err) =>
        reject(
          new Error(
            `Failed to start Codex CLI (shell: false): ${err.message}. Please ensure the 'codex' command is available in your PATH.`
          )
        )
      );
      codex.on("close", (code) => {
        if (code === 0) resolve(output);
        else {
          const detail = errorOutput.trim();
          const message = detail
            ? `Codex CLI error (exit code ${code}): ${detail}`
            : `Codex CLI exited with code ${code}. Please ensure the Codex CLI is installed and you are logged in (run 'codex' manually to check).`;
          reject(new Error(message));
        }
      });

      codex.stdin.write(prompt);
      codex.stdin.end();
    });
  }
}
