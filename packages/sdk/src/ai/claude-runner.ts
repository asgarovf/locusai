import { type ChildProcess, spawn } from "node:child_process";
import { resolve } from "node:path";
import { DEFAULT_MODEL, PROVIDER } from "../core/config.js";
import type { ExecEventEmitter } from "../exec/event-emitter.js";
import type { StreamChunk } from "../exec/types.js";
import { getAugmentedEnv } from "../utils/resolve-bin.js";
import { ClaudeStreamParser } from "./claude-stream-parser.js";
import { LogFn } from "./factory.js";
import type { AiRunner } from "./runner.js";

/** Default timeout: 1 hour */
const DEFAULT_TIMEOUT_MS = 60 * 60 * 1000;

export class ClaudeRunner implements AiRunner {
  private projectPath: string;
  private eventEmitter?: ExecEventEmitter;
  private currentToolName?: string;
  private activeProcess: ChildProcess | null = null;
  private aborted = false;
  timeoutMs: number;

  constructor(
    projectPath: string,
    private model: string = DEFAULT_MODEL[PROVIDER.CLAUDE],
    private log?: LogFn,
    timeoutMs?: number
  ) {
    this.projectPath = resolve(projectPath);
    this.timeoutMs = timeoutMs ?? DEFAULT_TIMEOUT_MS;
  }

  /**
   * Set an event emitter to receive execution events.
   */
  setEventEmitter(emitter: ExecEventEmitter): void {
    this.eventEmitter = emitter;
  }

  /**
   * Abort the currently running Claude CLI process, if any.
   */
  abort(): void {
    if (this.activeProcess && !this.activeProcess.killed) {
      this.aborted = true;
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
        const err = error as Error;
        lastError = err;
        const isLastAttempt = attempt === maxRetries;

        // Don't retry timeouts — they indicate the task is too long, not a transient failure
        if (err.message.includes("timed out")) {
          throw err;
        }

        if (!isLastAttempt) {
          const delay = Math.pow(2, attempt) * 1000;
          this.log?.(
            `Claude CLI attempt ${attempt} failed: ${err.message}. Retrying in ${delay}ms...`,
            "warn"
          );
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      }
    }

    throw lastError || new Error("Claude CLI failed after multiple attempts");
  }

  private withTimeout<T>(promise: Promise<T>): Promise<T> {
    if (this.timeoutMs <= 0) return promise;

    return new Promise<T>((resolve, reject) => {
      const timer = setTimeout(() => {
        this.abort();
        reject(
          new Error(
            `Claude CLI execution timed out after ${Math.round(this.timeoutMs / 60000)} minutes`
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

  private buildCliArgs(): string[] {
    const args = [
      "--print",
      "--output-format",
      "stream-json",
      "--verbose",
      "--dangerously-skip-permissions",
      "--no-session-persistence",
      "--include-partial-messages",
      "--model",
      this.model,
    ];

    return args;
  }

  async *runStream(prompt: string): AsyncGenerator<StreamChunk, void, unknown> {
    this.aborted = false;
    const parser = new ClaudeStreamParser();
    const args = this.buildCliArgs();

    const env = getAugmentedEnv({
      FORCE_COLOR: "1",
      TERM: "xterm-256color",
    });

    // Emit session started event
    this.eventEmitter?.emitSessionStarted({
      model: this.model,
      provider: "claude",
    });

    // Emit prompt submitted event
    this.eventEmitter?.emitPromptSubmitted(prompt, prompt.length > 500);

    const claude = spawn("claude", args, {
      cwd: this.projectPath,
      stdio: ["pipe", "pipe", "pipe"],
      env,
    });

    this.activeProcess = claude;

    let buffer = "";
    let stderrBuffer = "";
    let stderrFull = "";
    let resolveChunk: ((chunk: StreamChunk | null) => void) | null = null;
    const chunkQueue: StreamChunk[] = [];
    let processEnded = false;
    let errorMessage = "";
    let finalContent = "";
    let lastResultContent = "";
    let isThinking = false;

    const enqueueChunk = (chunk: StreamChunk) => {
      // Emit events based on chunk type
      this.emitEventForChunk(chunk, isThinking);

      // Track thinking state
      if (chunk.type === "thinking") {
        isThinking = true;
      } else if (chunk.type === "text_delta" || chunk.type === "tool_use") {
        if (isThinking) {
          this.eventEmitter?.emitThinkingStoped();
          isThinking = false;
        }
      }

      // Track final content for response completed event
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

    claude.stdout.on("data", (data: Buffer) => {
      buffer += data.toString();
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";

      for (const line of lines) {
        const chunk = parser.parseLineToChunk(line);
        if (chunk) {
          // Track result content so we can use it for error reporting
          if (chunk.type === "result") {
            lastResultContent = chunk.content;
          }
          enqueueChunk(chunk);
        }
      }
    });

    claude.stderr.on("data", (data: Buffer) => {
      const chunk = data.toString();
      stderrBuffer += chunk;
      stderrFull += chunk;

      const lines = stderrBuffer.split("\n");
      stderrBuffer = lines.pop() || "";

      for (const line of lines) {
        if (!this.shouldSuppressLine(line)) {
          process.stderr.write(`${line}\n`);
        }
      }
    });

    claude.on("error", (err) => {
      errorMessage = `Failed to start Claude CLI: ${err.message}. Please ensure the 'claude' command is available in your PATH.`;
      this.eventEmitter?.emitErrorOccurred(errorMessage, "SPAWN_ERROR");
      signalEnd();
    });

    claude.on("close", (code) => {
      this.activeProcess = null;

      if (stderrBuffer && !this.shouldSuppressLine(stderrBuffer)) {
        process.stderr.write(`${stderrBuffer}\n`);
      }

      // Don't report error if the process was intentionally aborted
      if (code !== 0 && !errorMessage && !this.aborted) {
        // Use stderr if available, otherwise fall back to the last result
        // content from the JSON stream (Claude CLI reports errors there
        // when using --output-format stream-json)
        const detail = stderrFull.trim() || lastResultContent.trim();
        errorMessage = this.createExecutionError(code, detail).message;
        this.eventEmitter?.emitErrorOccurred(errorMessage, `EXIT_${code}`);
      }
      signalEnd();
    });

    claude.stdin.write(prompt);
    claude.stdin.end();

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
          // Emit response completed and session ended on success
          if (finalContent) {
            this.eventEmitter?.emitResponseCompleted(finalContent);
          }
          this.eventEmitter?.emitSessionEnded(true);
        }
        break;
      } else {
        // Wait for next chunk
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

  /**
   * Emit an event corresponding to a stream chunk.
   */
  private emitEventForChunk(chunk: StreamChunk, isThinking: boolean): void {
    if (!this.eventEmitter) return;

    switch (chunk.type) {
      case "text_delta":
        this.eventEmitter.emitTextDelta(chunk.content);
        break;
      case "tool_use":
        // Complete previous tool if any
        if (this.currentToolName) {
          this.eventEmitter.emitToolCompleted(this.currentToolName);
        }
        this.currentToolName = chunk.tool;
        this.eventEmitter.emitToolStarted(chunk.tool, chunk.id);
        break;
      case "thinking":
        if (!isThinking) {
          this.eventEmitter.emitThinkingStarted(chunk.content);
        }
        break;
      case "result":
        // Complete any pending tool
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
    this.aborted = false;
    const parser = new ClaudeStreamParser();

    return new Promise((resolve, reject) => {
      const args = this.buildCliArgs();

      const env = getAugmentedEnv({
        FORCE_COLOR: "1",
        TERM: "xterm-256color",
      });

      const claude = spawn("claude", args, {
        cwd: this.projectPath,
        stdio: ["pipe", "pipe", "pipe"],
        env,
      });

      this.activeProcess = claude;

      let finalResult = "";
      let errorOutput = "";
      let buffer = "";
      let stderrBuffer = "";

      claude.stdout.on("data", (data: Buffer) => {
        buffer += data.toString();
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          const result = parser.parseLine(line, this.log);
          if (result) finalResult = result;
        }
      });

      claude.stderr.on("data", (data: Buffer) => {
        const chunk = data.toString();
        errorOutput += chunk;
        stderrBuffer += chunk;

        const lines = stderrBuffer.split("\n");
        stderrBuffer = lines.pop() || "";

        for (const line of lines) {
          if (!this.shouldSuppressLine(line)) {
            process.stderr.write(`${line}\n`);
          }
        }
      });

      claude.on("error", (err) => {
        reject(
          new Error(
            `Failed to start Claude CLI: ${err.message}. Please ensure the 'claude' command is available in your PATH.`
          )
        );
      });

      claude.on("close", (code) => {
        this.activeProcess = null;

        if (stderrBuffer && !this.shouldSuppressLine(stderrBuffer)) {
          process.stderr.write(`${stderrBuffer}\n`);
        }

        process.stdout.write("\n");
        if (code === 0 || this.aborted) {
          resolve(finalResult);
        } else {
          // Use stderr if available, otherwise fall back to result content
          // from the JSON stream
          const detail = errorOutput.trim() || finalResult.trim();
          reject(this.createExecutionError(code, detail));
        }
      });

      claude.stdin.write(prompt);
      claude.stdin.end();
    });
  }

  private shouldSuppressLine(line: string): boolean {
    // Suppress lines that look like: [HH:mm:ss] [id] ℹ
    // Example: [23:36:04] [-pww3x9m] ℹ
    const infoLogRegex = /^\[\d{2}:\d{2}:\d{2}\]\s\[.*?\]\sℹ\s*$/;
    return infoLogRegex.test(line.trim());
  }

  private createExecutionError(code: number | null, detail: string): Error {
    const errorMsg = detail.trim();
    const message = errorMsg
      ? `Claude CLI error (exit code ${code}): ${errorMsg}`
      : `Claude CLI exited with code ${code}. Please ensure the Claude CLI is installed and you are logged in.`;
    return new Error(message);
  }
}
