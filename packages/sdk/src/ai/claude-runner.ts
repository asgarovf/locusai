import { type ChildProcess, spawn } from "node:child_process";
import { resolve } from "node:path";
import { DEFAULT_MODEL, PROVIDER } from "../core/config.js";
import type { ExecEventEmitter } from "../exec/event-emitter.js";
import type { StreamChunk, ToolParams } from "../exec/types.js";
import { c } from "../utils/colors.js";
import { LogFn } from "./factory.js";
import type { AiRunner } from "./runner.js";

interface ClaudeStreamItem {
  type: string;
  result?: string;
  event?: {
    type: string;
    index?: number;
    delta?: {
      type: string;
      text?: string;
      partial_json?: string;
    };
    content_block?: {
      type: string;
      name?: string;
      id?: string;
    };
  };
}

/**
 * Tracks active tool executions including parameter accumulation.
 */
interface ActiveToolExecution {
  name: string;
  id?: string;
  index: number;
  parameterJson: string;
  startTime: number;
}

const SANDBOX_SETTINGS = JSON.stringify({
  sandbox: {
    enabled: true,
    autoAllow: true,
    allowUnsandboxedCommands: false,
  },
});

export class ClaudeRunner implements AiRunner {
  private projectPath: string;
  private eventEmitter?: ExecEventEmitter;
  private currentToolName?: string;
  private activeTools: Map<number, ActiveToolExecution> = new Map();
  private activeProcess: ChildProcess | null = null;

  constructor(
    projectPath: string,
    private model: string = DEFAULT_MODEL[PROVIDER.CLAUDE],
    private log?: LogFn
  ) {
    this.projectPath = resolve(projectPath);
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
      this.activeProcess.kill("SIGTERM");
      this.activeProcess = null;
    }
  }

  async run(prompt: string): Promise<string> {
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
          const delay = Math.pow(2, attempt) * 1000;
          console.warn(
            `Claude CLI attempt ${attempt} failed: ${err.message}. Retrying in ${delay}ms...`
          );
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      }
    }

    throw lastError || new Error("Claude CLI failed after multiple attempts");
  }

  async *runStream(prompt: string): AsyncGenerator<StreamChunk, void, unknown> {
    const args = [
      "--dangerously-skip-permissions",
      "--print",
      "--verbose",
      "--output-format",
      "stream-json",
      "--include-partial-messages",
      "--model",
      this.model,
      "--settings",
      SANDBOX_SETTINGS,
    ];

    const env = {
      ...process.env,
      FORCE_COLOR: "1",
      TERM: "xterm-256color",
    };

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
    let resolveChunk: ((chunk: StreamChunk | null) => void) | null = null;
    const chunkQueue: StreamChunk[] = [];
    let processEnded = false;
    let errorMessage = "";
    let finalContent = "";
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
        const chunk = this.parseStreamLineToChunk(line);
        if (chunk) {
          enqueueChunk(chunk);
        }
      }
    });

    claude.stderr.on("data", (data: Buffer) => {
      const chunk = data.toString();
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
      errorMessage = `Failed to start Claude CLI: ${err.message}. Please ensure the 'claude' command is available in your PATH.`;
      this.eventEmitter?.emitErrorOccurred(errorMessage, "SPAWN_ERROR");
      signalEnd();
    });

    claude.on("close", (code) => {
      this.activeProcess = null;

      if (stderrBuffer && !this.shouldSuppressLine(stderrBuffer)) {
        process.stderr.write(`${stderrBuffer}\n`);
      }

      if (code !== 0 && !errorMessage) {
        errorMessage = this.createExecutionError(code, stderrBuffer).message;
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

  private parseStreamLineToChunk(line: string): StreamChunk | null {
    if (!line.trim()) return null;

    try {
      const item = JSON.parse(line) as ClaudeStreamItem;
      return this.processStreamItemToChunk(item);
    } catch {
      return null;
    }
  }

  private processStreamItemToChunk(item: ClaudeStreamItem): StreamChunk | null {
    if (item.type === "result") {
      return { type: "result", content: item.result || "" };
    }

    if (item.type === "stream_event" && item.event) {
      return this.handleEventToChunk(item.event);
    }

    return null;
  }

  private handleEventToChunk(
    event: Required<ClaudeStreamItem>["event"]
  ): StreamChunk | null {
    const { type, delta, content_block, index } = event;

    // Handle text deltas
    if (type === "content_block_delta" && delta?.type === "text_delta") {
      return { type: "text_delta", content: delta.text || "" };
    }

    // Handle tool parameter deltas - accumulate JSON
    if (
      type === "content_block_delta" &&
      delta?.type === "input_json_delta" &&
      delta.partial_json !== undefined &&
      index !== undefined
    ) {
      const activeTool = this.activeTools.get(index);
      if (activeTool) {
        activeTool.parameterJson += delta.partial_json;
      }
      return null;
    }

    // Handle tool use start
    if (type === "content_block_start" && content_block) {
      if (content_block.type === "tool_use" && content_block.name) {
        // Track the tool execution with index
        if (index !== undefined) {
          this.activeTools.set(index, {
            name: content_block.name,
            id: content_block.id,
            index,
            parameterJson: "",
            startTime: Date.now(),
          });
        }
        // Return tool_use without parameters - will be updated on content_block_stop
        return {
          type: "tool_use",
          tool: content_block.name,
          id: content_block.id,
        };
      }
      if (content_block.type === "thinking") {
        return { type: "thinking" };
      }
    }

    // Handle content block stop - emit tool parameters chunk
    if (type === "content_block_stop" && index !== undefined) {
      const activeTool = this.activeTools.get(index);
      if (activeTool?.parameterJson) {
        try {
          const parameters = JSON.parse(activeTool.parameterJson) as ToolParams;
          // Return a tool_parameters chunk with the full parameters
          return {
            type: "tool_parameters" as const,
            tool: activeTool.name,
            id: activeTool.id,
            parameters,
          };
        } catch {
          // JSON parsing failed - params incomplete
        }
      }
      return null;
    }

    return null;
  }

  private executeRun(prompt: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const args = [
        "--dangerously-skip-permissions",
        "--print",
        "--verbose",
        "--output-format",
        "stream-json",
        "--include-partial-messages",
        "--model",
        this.model,
        "--settings",
        SANDBOX_SETTINGS,
      ];

      const env = {
        ...process.env,
        FORCE_COLOR: "1",
        TERM: "xterm-256color",
      };

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
          const result = this.handleStreamLine(line);
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
        if (code === 0) {
          resolve(finalResult);
        } else {
          reject(this.createExecutionError(code, errorOutput));
        }
      });

      claude.stdin.write(prompt);
      claude.stdin.end();
    });
  }

  private handleStreamLine(line: string): string | null {
    if (!line.trim()) return null;

    try {
      const item = JSON.parse(line) as ClaudeStreamItem;
      return this.processStreamItem(item);
    } catch {
      // Ignore partial or non-JSON lines
      return null;
    }
  }

  private processStreamItem(item: ClaudeStreamItem): string | null {
    if (item.type === "result") {
      return item.result || "";
    }

    if (item.type === "stream_event" && item.event) {
      this.handleEvent(item.event);
    }

    return null;
  }

  private handleEvent(event: Required<ClaudeStreamItem>["event"]) {
    const { type, content_block } = event;

    if (type === "content_block_start" && content_block) {
      if (content_block.type === "tool_use" && content_block.name) {
        this.log?.(
          `\n${c.primary("[Claude]")} ${c.bold(`Running ${content_block.name}...`)}\n`,
          "info"
        );
      }
    }
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
