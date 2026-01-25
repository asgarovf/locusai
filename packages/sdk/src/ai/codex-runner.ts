import { spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import { existsSync, readFileSync, unlinkSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { DEFAULT_MODEL, PROVIDERS } from "../core/config.js";
import type { LogFn } from "./factory.js";
import type { AiRunner } from "./runner.js";

export class CodexRunner implements AiRunner {
  constructor(
    private projectPath: string,
    private model: string = DEFAULT_MODEL[PROVIDERS.CODEX],
    private log: LogFn
  ) {}

  async run(prompt: string): Promise<string> {
    const maxRetries = 3;
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await this.executeRun(prompt);
      } catch (error) {
        lastError = error as Error;

        if (attempt < maxRetries) {
          const delay = Math.pow(2, attempt) * 1000;
          console.warn(
            `Codex CLI attempt ${attempt} failed: ${lastError.message}. Retrying in ${delay}ms...`
          );
          await this.sleep(delay);
        }
      }
    }

    throw lastError || new Error("Codex CLI failed after multiple attempts");
  }

  private executeRun(prompt: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const outputPath = join(tmpdir(), `locus-codex-${randomUUID()}.txt`);
      const args = this.buildArgs(outputPath);

      const codex = spawn("codex", args, {
        cwd: this.projectPath,
        stdio: ["pipe", "pipe", "pipe"],
        env: process.env,
        shell: false,
      });

      let output = "";
      let errorOutput = "";

      const handleOutput = (data: Buffer) => {
        const msg = data.toString();
        output += msg;
        this.streamToConsole(msg);
      };

      codex.stdout.on("data", handleOutput);
      codex.stderr.on("data", (data: Buffer) => {
        const msg = data.toString();
        errorOutput += msg;
        this.streamToConsole(msg);
      });

      codex.on("error", (err) => {
        reject(
          new Error(
            `Failed to start Codex CLI: ${err.message}. ` +
              `Ensure 'codex' is installed and available in PATH.`
          )
        );
      });

      codex.on("close", (code) => {
        this.cleanupTempFile(outputPath);

        if (code === 0) {
          resolve(this.readOutput(outputPath, output));
        } else {
          reject(this.createErrorFromOutput(code, errorOutput));
        }
      });

      codex.stdin.write(prompt);
      codex.stdin.end();
    });
  }

  private buildArgs(outputPath: string): string[] {
    const args = ["exec", "--full-auto", "--output-last-message", outputPath];

    if (this.model) {
      args.push("--model", this.model);
    }

    args.push("-"); // Read prompt from stdin
    return args;
  }

  /**
   * Streams filtered output to console.
   * Only displays thinking status, descriptions, and plan updates.
   */
  private streamToConsole(chunk: string): void {
    for (const rawLine of chunk.split("\n")) {
      const line = rawLine.trim();
      if (line && this.shouldDisplay(line)) {
        const formattedLine = "[Codex]: ".concat(line.replace(/\*/g, ""));

        this.log(formattedLine, "info");
      }
    }
  }

  private shouldDisplay(line: string): boolean {
    return [
      /^thinking\b/, // Thinking status
      /^\*\*/, // Description headers
      /^Plan update\b/, // Plan updates
      /^[→•✓]/, // Plan bullets and checkmarks
    ].some((pattern) => pattern.test(line));
  }

  private readOutput(outputPath: string, fallback: string): string {
    if (existsSync(outputPath)) {
      try {
        const text = readFileSync(outputPath, "utf-8").trim();
        if (text) return text;
      } catch {
        // Fall through to fallback
      }
    }
    return fallback.trim();
  }

  private createErrorFromOutput(
    code: number | null,
    errorOutput: string
  ): Error {
    const detail = errorOutput.trim();
    const message = detail
      ? `Codex CLI error (exit code ${code}): ${detail}`
      : `Codex CLI exited with code ${code}. ` +
        `Ensure Codex CLI is installed and you are logged in.`;
    return new Error(message);
  }

  private cleanupTempFile(path: string): void {
    try {
      if (existsSync(path)) unlinkSync(path);
    } catch {
      // Ignore cleanup errors
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
