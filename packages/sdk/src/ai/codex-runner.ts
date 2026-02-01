import { spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import { existsSync, readFileSync, unlinkSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { DEFAULT_MODEL, PROVIDER } from "../core/config.js";
import type { StreamChunk } from "../exec/types.js";
import type { LogFn } from "./factory.js";
import type { AiRunner } from "./runner.js";

export class CodexRunner implements AiRunner {
  constructor(
    private projectPath: string,
    private model: string = DEFAULT_MODEL[PROVIDER.CODEX],
    private log?: LogFn
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

  async *runStream(prompt: string): AsyncGenerator<StreamChunk, void, unknown> {
    const outputPath = join(tmpdir(), `locus-codex-${randomUUID()}.txt`);
    const args = this.buildArgs(outputPath);

    const codex = spawn("codex", args, {
      cwd: this.projectPath,
      stdio: ["pipe", "pipe", "pipe"],
      env: process.env,
      shell: false,
    });

    let resolveChunk: ((chunk: StreamChunk | null) => void) | null = null;
    const chunkQueue: StreamChunk[] = [];
    let processEnded = false;
    let errorMessage = "";
    let finalOutput = "";

    const enqueueChunk = (chunk: StreamChunk) => {
      if (resolveChunk) {
        const resolve = resolveChunk;
        resolveChunk = null;
        resolve(chunk);
      } else {
        chunkQueue.push(chunk);
      }
    };

    const signalEnd = () => {
      processEnded = true;
      if (resolveChunk) {
        resolveChunk(null);
        resolveChunk = null;
      }
    };

    const processOutput = (data: Buffer) => {
      const msg = data.toString();
      finalOutput += msg;

      for (const rawLine of msg.split("\n")) {
        const line = rawLine.trim();
        if (!line) continue;

        // Parse thinking status
        if (/^thinking\b/i.test(line)) {
          enqueueChunk({ type: "thinking", content: line });
        }
        // Parse tool/action indicators
        else if (/^[→•✓]/.test(line) || /^Plan update\b/.test(line)) {
          enqueueChunk({
            type: "tool_use",
            tool: line.replace(/^[→•✓]\s*/, ""),
          });
        }
        // All other content as text delta
        else if (this.shouldDisplay(line)) {
          enqueueChunk({ type: "text_delta", content: `${line}\n` });
        }
      }
    };

    codex.stdout.on("data", processOutput);
    codex.stderr.on("data", processOutput);

    codex.on("error", (err) => {
      errorMessage = `Failed to start Codex CLI: ${err.message}. Ensure 'codex' is installed and available in PATH.`;
      signalEnd();
    });

    codex.on("close", (code) => {
      this.cleanupTempFile(outputPath);

      if (code === 0) {
        const result = this.readOutput(outputPath, finalOutput);
        enqueueChunk({ type: "result", content: result });
      } else if (!errorMessage) {
        errorMessage = this.createErrorFromOutput(code, finalOutput).message;
      }
      signalEnd();
    });

    codex.stdin.write(prompt);
    codex.stdin.end();

    // Yield chunks as they arrive
    while (true) {
      if (chunkQueue.length > 0) {
        const chunk = chunkQueue.shift();
        if (chunk) yield chunk;
      } else if (processEnded) {
        if (errorMessage) {
          yield { type: "error", error: errorMessage };
        }
        break;
      } else {
        const chunk = await new Promise<StreamChunk | null>((resolve) => {
          resolveChunk = resolve;
        });
        if (chunk === null) {
          if (errorMessage) {
            yield { type: "error", error: errorMessage };
          }
          break;
        }
        yield chunk;
      }
    }
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
    const args = [
      "exec",
      "--full-auto",
      "--skip-git-repo-check",
      "--output-last-message",
      outputPath,
    ];

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

        this.log?.(formattedLine, "info");
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
