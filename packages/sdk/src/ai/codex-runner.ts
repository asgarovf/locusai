import { type ChildProcess, spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import { existsSync, readFileSync, unlinkSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { DEFAULT_MODEL, PROVIDER } from "../core/config.js";
import type { ExecEventEmitter } from "../exec/event-emitter.js";
import type { StreamChunk } from "../exec/types.js";
import { getAugmentedEnv } from "../utils/resolve-bin.js";
import type { LogFn } from "./factory.js";
import type { AiRunner } from "./runner.js";

/** Default timeout: 1 hour */
const DEFAULT_TIMEOUT_MS = 60 * 60 * 1000;

export class CodexRunner implements AiRunner {
  private activeProcess: ChildProcess | null = null;
  private eventEmitter?: ExecEventEmitter;
  private currentToolName?: string;
  timeoutMs: number;

  constructor(
    private projectPath: string,
    private model: string = DEFAULT_MODEL[PROVIDER.CODEX],
    private log?: LogFn,
    private reasoningEffort?: string,
    timeoutMs?: number
  ) {
    this.timeoutMs = timeoutMs ?? DEFAULT_TIMEOUT_MS;
  }

  setEventEmitter(emitter: ExecEventEmitter): void {
    this.eventEmitter = emitter;
  }

  /**
   * Abort the currently running Codex CLI process, if any.
   */
  abort(): void {
    if (this.activeProcess && !this.activeProcess.killed) {
      this.activeProcess.kill("SIGTERM");
      this.activeProcess = null;
    }
  }

  async run(prompt: string): Promise<string> {
    const maxRetries = 3;
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await this.withTimeout(this.executeRun(prompt));
      } catch (error) {
        lastError = error as Error;

        // Don't retry timeouts — they indicate the task is too long, not a transient failure
        if (lastError.message.includes("timed out")) {
          throw lastError;
        }

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

  private withTimeout<T>(promise: Promise<T>): Promise<T> {
    if (this.timeoutMs <= 0) return promise;

    return new Promise<T>((resolve, reject) => {
      const timer = setTimeout(() => {
        this.abort();
        reject(
          new Error(
            `Codex CLI execution timed out after ${Math.round(this.timeoutMs / 60000)} minutes`
          )
        );
      }, this.timeoutMs);

      promise.then(
        (value) => {
          clearTimeout(timer);
          resolve(value);
        },
        (err) => {
          clearTimeout(timer);
          reject(err);
        }
      );
    });
  }

  async *runStream(prompt: string): AsyncGenerator<StreamChunk, void, unknown> {
    const outputPath = join(tmpdir(), `locus-codex-${randomUUID()}.txt`);
    const args = this.buildArgs(outputPath);

    this.eventEmitter?.emitSessionStarted({
      model: this.model,
      provider: "codex",
    });
    this.eventEmitter?.emitPromptSubmitted(prompt, prompt.length > 500);

    const codex = spawn("codex", args, {
      cwd: this.projectPath,
      stdio: ["pipe", "pipe", "pipe"],
      env: getAugmentedEnv(),
      shell: false,
    });

    this.activeProcess = codex;

    let resolveChunk: ((chunk: StreamChunk | null) => void) | null = null;
    const chunkQueue: StreamChunk[] = [];
    let processEnded = false;
    let errorMessage = "";
    let finalOutput = "";
    let finalContent = "";
    let isThinking = false;

    const enqueueChunk = (chunk: StreamChunk) => {
      this.emitEventForChunk(chunk, isThinking);

      if (chunk.type === "thinking") {
        isThinking = true;
      } else if (chunk.type === "text_delta" || chunk.type === "tool_use") {
        if (isThinking) {
          this.eventEmitter?.emitThinkingStoped();
          isThinking = false;
        }
      }

      if (chunk.type === "text_delta") {
        finalContent += chunk.content;
      }

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
        // Skip noisy intermediate output — final result is read from output file
      }
    };

    codex.stdout.on("data", processOutput);
    // Only capture stderr for error detection, don't process as stream output
    codex.stderr.on("data", (data: Buffer) => {
      finalOutput += data.toString();
    });

    codex.on("error", (err) => {
      errorMessage = `Failed to start Codex CLI: ${err.message}. Ensure 'codex' is installed and available in PATH.`;
      this.eventEmitter?.emitErrorOccurred(errorMessage, "SPAWN_ERROR");
      signalEnd();
    });

    codex.on("close", (code) => {
      this.activeProcess = null;

      if (code === 0) {
        const result = this.readOutput(outputPath, finalOutput);
        this.cleanupTempFile(outputPath);
        // Codex commonly writes the assistant response only to --output-last-message.
        // Emit it as text_delta when no incremental text was streamed so interactive
        // mode still displays assistant output.
        if (result && finalContent.trim().length === 0) {
          enqueueChunk({ type: "text_delta", content: result });
        }
        enqueueChunk({ type: "result", content: result });
      } else {
        this.cleanupTempFile(outputPath);
        if (!errorMessage) {
          errorMessage = this.createErrorFromOutput(code, finalOutput).message;
          this.eventEmitter?.emitErrorOccurred(errorMessage, `EXIT_${code}`);
        }
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
          this.eventEmitter?.emitSessionEnded(false);
        } else {
          if (finalContent) {
            this.eventEmitter?.emitResponseCompleted(finalContent);
          }
          this.eventEmitter?.emitSessionEnded(true);
        }
        break;
      } else {
        const chunk = await new Promise<StreamChunk | null>((resolve) => {
          resolveChunk = resolve;
        });
        if (chunk === null) {
          if (errorMessage) {
            yield { type: "error", error: errorMessage };
            this.eventEmitter?.emitSessionEnded(false);
          } else {
            if (finalContent) {
              this.eventEmitter?.emitResponseCompleted(finalContent);
            }
            this.eventEmitter?.emitSessionEnded(true);
          }
          break;
        }
        yield chunk;
      }
    }
  }

  private emitEventForChunk(chunk: StreamChunk, isThinking: boolean): void {
    if (!this.eventEmitter) return;

    switch (chunk.type) {
      case "text_delta":
        this.eventEmitter.emitTextDelta(chunk.content);
        break;
      case "tool_use":
        if (this.currentToolName) {
          this.eventEmitter.emitToolCompleted(this.currentToolName);
        }
        this.currentToolName = chunk.tool;
        this.eventEmitter.emitToolStarted(chunk.tool);
        break;
      case "thinking":
        if (!isThinking) {
          this.eventEmitter.emitThinkingStarted(chunk.content);
        }
        break;
      case "result":
        if (this.currentToolName) {
          this.eventEmitter.emitToolCompleted(this.currentToolName);
          this.currentToolName = undefined;
        }
        break;
      case "error":
        this.eventEmitter.emitErrorOccurred(chunk.error);
        break;
    }
  }

  private executeRun(prompt: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const outputPath = join(tmpdir(), `locus-codex-${randomUUID()}.txt`);
      const args = this.buildArgs(outputPath);

      const codex = spawn("codex", args, {
        cwd: this.projectPath,
        stdio: ["pipe", "pipe", "pipe"],
        env: getAugmentedEnv(),
        shell: false,
      });

      this.activeProcess = codex;

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
        this.activeProcess = null;

        if (code === 0) {
          const result = this.readOutput(outputPath, output);
          this.cleanupTempFile(outputPath);
          resolve(result);
        } else {
          this.cleanupTempFile(outputPath);
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

    if (this.reasoningEffort) {
      args.push("-c", `model_reasoning_effort=${this.reasoningEffort}`);
    }

    args.push("-"); // Read prompt from stdin
    return args;
  }

  /**
   * Streams filtered output to console.
   * Only displays high-level status changes to reduce terminal noise.
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
    // Only show plan-level updates, not individual tool calls or text output
    return /^Plan update\b/.test(line);
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
