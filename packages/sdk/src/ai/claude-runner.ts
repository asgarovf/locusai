import { spawn } from "node:child_process";
import { resolve } from "node:path";
import { DEFAULT_MODEL, PROVIDER } from "../core/config.js";
import { c } from "../utils/colors.js";
import { LogFn } from "./factory.js";
import type { AiRunner } from "./runner.js";

interface ClaudeStreamItem {
  type: string;
  result?: string;
  event?: {
    type: string;
    delta?: {
      type: string;
      text?: string;
      partial_json?: string;
    };
    content_block?: {
      type: string;
      name?: string;
    };
  };
}

export class ClaudeRunner implements AiRunner {
  private projectPath: string;

  constructor(
    projectPath: string,
    private model: string = DEFAULT_MODEL[PROVIDER.CLAUDE],
    private log?: LogFn
  ) {
    this.projectPath = resolve(projectPath);
  }

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
