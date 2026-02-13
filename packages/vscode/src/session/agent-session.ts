import { type ChildProcess, spawn } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { WebviewMessage } from "./message-handler";
import { parseStreamLine } from "./message-handler";

export interface AgentSessionOptions {
  projectPath: string;
  provider: "claude" | "codex";
  model?: string;
}

export interface ConversationMessage {
  role: "user" | "assistant";
  content: string;
  timestamp: number;
}

export interface SessionData {
  id: string;
  model: string;
  provider: string;
  messages: ConversationMessage[];
  createdAt: number;
  updatedAt: number;
}

type MessageCallback = (message: WebviewMessage) => void;

/**
 * Manages an agent session that spawns the Claude/Codex CLI process
 * and streams output for consumption by the webview.
 */
export class AgentSession {
  private process: ChildProcess | null = null;
  private projectPath: string;
  private provider: string;
  private model: string;
  private conversationHistory: ConversationMessage[] = [];
  private sessionId: string;
  private onMessage: MessageCallback | null = null;

  constructor(options: AgentSessionOptions) {
    this.projectPath = options.projectPath;
    this.provider = options.provider;
    this.model = options.model || this.getDefaultModel(options.provider);
    this.sessionId = this.generateSessionId();
  }

  /**
   * Set the callback for receiving parsed messages from the CLI stream.
   */
  setMessageCallback(callback: MessageCallback): void {
    this.onMessage = callback;
  }

  /**
   * Send a prompt to the CLI agent and stream the response.
   * Returns a promise that resolves when the CLI process finishes.
   */
  async sendPrompt(prompt: string): Promise<void> {
    if (this.process && !this.process.killed) {
      this.process.kill("SIGTERM");
      this.process = null;
    }

    const fullPrompt = this.buildPromptWithHistory(prompt);

    this.conversationHistory.push({
      role: "user",
      content: prompt,
      timestamp: Date.now(),
    });

    const args = this.buildCliArgs();
    const cliCommand = this.provider === "codex" ? "codex" : "claude";

    return new Promise<void>((resolve, reject) => {
      const proc = spawn(cliCommand, args, {
        cwd: this.projectPath,
        stdio: ["pipe", "pipe", "pipe"],
        env: {
          ...process.env,
          FORCE_COLOR: "0",
          TERM: "dumb",
        },
      });

      this.process = proc;

      let buffer = "";
      let responseContent = "";

      proc.stdout?.on("data", (data: Buffer) => {
        buffer += data.toString();
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          const msg = parseStreamLine(line);
          if (msg) {
            if (msg.type === "text_delta" && msg.content) {
              responseContent += msg.content;
            }
            this.onMessage?.(msg);
          }
        }
      });

      proc.stderr?.on("data", (data: Buffer) => {
        // Stderr is informational — we don't surface it unless it's a clear error
        const text = data.toString().trim();
        if (text && !this.isIgnorableLine(text)) {
          this.onMessage?.({
            type: "error",
            error: text,
          });
        }
      });

      proc.on("error", (err) => {
        this.process = null;
        this.onMessage?.({
          type: "error",
          error: `Failed to start ${cliCommand}: ${err.message}. Ensure it is installed and in your PATH.`,
        });
        reject(err);
      });

      proc.on("close", (code) => {
        this.process = null;

        // Process remaining buffer
        if (buffer.trim()) {
          const msg = parseStreamLine(buffer);
          if (msg) {
            if (msg.type === "text_delta" && msg.content) {
              responseContent += msg.content;
            }
            this.onMessage?.(msg);
          }
        }

        if (responseContent) {
          this.conversationHistory.push({
            role: "assistant",
            content: responseContent,
            timestamp: Date.now(),
          });
        }

        this.saveSession();

        if (code !== 0 && code !== null) {
          this.onMessage?.({
            type: "error",
            error: `Agent process exited with code ${code}`,
          });
        }

        this.onMessage?.({ type: "done" });
        resolve();
      });

      proc.stdin?.write(fullPrompt);
      proc.stdin?.end();
    });
  }

  /**
   * Abort the currently running process.
   */
  abort(): void {
    if (this.process && !this.process.killed) {
      this.process.kill("SIGTERM");
      this.process = null;
    }
  }

  /**
   * Reset conversation history and start a new session.
   */
  resetContext(): void {
    this.conversationHistory = [];
    this.sessionId = this.generateSessionId();
  }

  /**
   * Get the current session ID.
   */
  getSessionId(): string {
    return this.sessionId;
  }

  /**
   * Get conversation history.
   */
  getHistory(): ConversationMessage[] {
    return [...this.conversationHistory];
  }

  /**
   * Whether a process is currently running.
   */
  isRunning(): boolean {
    return this.process !== null && !this.process.killed;
  }

  /**
   * Load a saved session from disk.
   */
  loadSession(sessionId: string): boolean {
    const sessionsDir = join(this.projectPath, ".locus", "sessions");
    const sessionFile = join(sessionsDir, `${sessionId}.json`);

    if (!existsSync(sessionFile)) {
      return false;
    }

    try {
      const data: SessionData = JSON.parse(readFileSync(sessionFile, "utf-8"));
      this.sessionId = data.id;
      this.conversationHistory = data.messages;
      return true;
    } catch {
      return false;
    }
  }

  private buildCliArgs(): string[] {
    if (this.provider === "codex") {
      return ["--full-auto", "--model", this.model];
    }

    return [
      "--dangerously-skip-permissions",
      "--print",
      "--verbose",
      "--output-format",
      "stream-json",
      "--include-partial-messages",
      "--model",
      this.model,
    ];
  }

  private buildPromptWithHistory(userInput: string): string {
    if (this.conversationHistory.length === 0) {
      return userInput;
    }

    const recent = this.conversationHistory.slice(-10);
    const historySection = recent
      .map(
        (msg) => `${msg.role === "user" ? "User" : "Assistant"}: ${msg.content}`
      )
      .join("\n\n");

    return `## Previous Conversation\n${historySection}\n\n## Current Request\n${userInput}`;
  }

  private saveSession(): void {
    const sessionsDir = join(this.projectPath, ".locus", "sessions");
    if (!existsSync(sessionsDir)) {
      mkdirSync(sessionsDir, { recursive: true });
    }

    const data: SessionData = {
      id: this.sessionId,
      model: this.model,
      provider: this.provider,
      messages: this.conversationHistory,
      createdAt:
        this.conversationHistory.length > 0
          ? this.conversationHistory[0].timestamp
          : Date.now(),
      updatedAt: Date.now(),
    };

    const sessionFile = join(sessionsDir, `${this.sessionId}.json`);
    writeFileSync(sessionFile, JSON.stringify(data, null, 2), "utf-8");
  }

  private generateSessionId(): string {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).slice(2, 8);
    return `ses_${timestamp}_${random}`;
  }

  private getDefaultModel(provider: string): string {
    if (provider === "codex") {
      return "gpt-5.3-codex";
    }
    return "opus";
  }

  private isIgnorableLine(line: string): boolean {
    // Claude CLI info log pattern: [HH:mm:ss] [id] ℹ
    return /^\[\d{2}:\d{2}:\d{2}\]\s\[.*?\]\sℹ\s*$/.test(line.trim());
  }
}
