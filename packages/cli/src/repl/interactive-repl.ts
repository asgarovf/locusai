import * as readline from "node:readline";
import {
  type AiProvider,
  type AiRunner,
  type ConversationSession,
  c,
  createAiRunner,
  HistoryManager,
  PromptBuilder,
} from "@locusai/sdk/node";
import { ExecutionStatsTracker } from "../display/execution-stats";
import { ProgressRenderer } from "../display/progress-renderer";
import type { LocusSettings } from "../settings-manager";
import { registry } from "./commands";

export interface InteractiveREPLOptions {
  projectPath: string;
  provider: AiProvider;
  model: string;
  settings: LocusSettings;
  /** Optional session ID to resume */
  sessionId?: string;
}

/**
 * Unified interactive REPL session for Locus.
 *
 * Uses the SlashCommandRegistry directly for command parsing,
 * exposes mutable provider/model for runtime switching, and
 * serves as the single entry point for all interactive usage.
 */
export class InteractiveREPL {
  private rl: readline.Interface | null = null;
  private aiRunner: AiRunner;
  private promptBuilder: PromptBuilder;
  private renderer: ProgressRenderer;
  private isProcessing = false;
  private conversationHistory: Array<{
    role: "user" | "assistant";
    content: string;
  }> = [];
  private historyManager: HistoryManager;
  private currentSession: ConversationSession;
  private projectPath: string;
  private _model: string;
  private _provider: AiProvider;
  private _settings: LocusSettings;

  // Multi-line paste support
  private inputBuffer: string[] = [];
  private inputDebounceTimer: ReturnType<typeof setTimeout> | null = null;
  private static readonly PASTE_DEBOUNCE_MS = 50;

  constructor(options: InteractiveREPLOptions) {
    this.projectPath = options.projectPath;
    this._model = options.model;
    this._provider = options.provider;
    this._settings = options.settings;

    this.aiRunner = createAiRunner(options.provider, {
      projectPath: options.projectPath,
      model: options.model,
    });
    this.promptBuilder = new PromptBuilder(options.projectPath);
    this.renderer = new ProgressRenderer({ animated: true });
    this.historyManager = new HistoryManager(options.projectPath);

    // Load existing session or create new one
    if (options.sessionId) {
      const loaded = this.historyManager.findSessionByPartialId(
        options.sessionId
      );
      if (loaded) {
        this.currentSession = loaded;
        // Restore conversation history from loaded session
        this.conversationHistory = loaded.messages.map((msg) => ({
          role: msg.role,
          content: msg.content,
        }));
      } else {
        console.log(
          c.warning(
            `Session '${options.sessionId}' not found. Creating new session.`
          )
        );
        this.currentSession = this.historyManager.createNewSession(
          options.model,
          options.provider
        );
      }
    } else {
      this.currentSession = this.historyManager.createNewSession(
        options.model,
        options.provider
      );
    }
  }

  // ── Accessors ────────────────────────────────────────────────

  getProjectPath(): string {
    return this.projectPath;
  }

  getProvider(): AiProvider {
    return this._provider;
  }

  getModel(): string {
    return this._model;
  }

  setProvider(provider: AiProvider): void {
    this._provider = provider;
    this.aiRunner = createAiRunner(provider, {
      projectPath: this.projectPath,
      model: this._model,
    });
  }

  setModel(model: string): void {
    this._model = model;
    this.aiRunner = createAiRunner(this._provider, {
      projectPath: this.projectPath,
      model,
    });
  }

  getSettings(): LocusSettings {
    return this._settings;
  }

  getSessionId(): string {
    return this.currentSession.id;
  }

  getHistoryManager(): HistoryManager {
    return this.historyManager;
  }

  // ── Lifecycle ────────────────────────────────────────────────

  /**
   * Start the interactive REPL session.
   */
  async start(): Promise<void> {
    this.printWelcome();

    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
      terminal: true,
    });

    this.rl.setPrompt(c.cyan("> "));
    this.rl.prompt();

    this.rl.on("line", (input) => this.handleLine(input));
    this.rl.on("close", () => this.shutdown());

    // Handle CTRL+C gracefully
    process.on("SIGINT", () => {
      // Clear any pending input buffer on interrupt
      if (this.inputDebounceTimer) {
        clearTimeout(this.inputDebounceTimer);
        this.inputDebounceTimer = null;
      }
      this.inputBuffer = [];

      if (this.isProcessing) {
        this.renderer.stopThinkingAnimation();
        console.log(c.dim("\n[Interrupted]"));
        this.isProcessing = false;
        this.rl?.prompt();
      } else {
        this.shutdown();
      }
    });
  }

  /**
   * Reset the conversation context.
   */
  resetContext(): void {
    this.conversationHistory = [];
    this.currentSession = this.historyManager.createNewSession(
      this._model,
      this._provider
    );
    console.log(c.success("Context reset. Starting fresh conversation."));
  }

  /**
   * Shutdown the interactive session.
   */
  shutdown(): void {
    if (this.inputDebounceTimer) {
      clearTimeout(this.inputDebounceTimer);
      this.inputDebounceTimer = null;
    }
    this.renderer.stopThinkingAnimation();
    this.aiRunner.abort();
    console.log(c.dim("\nGoodbye!"));
    this.rl?.close();
    process.exit(0);
  }

  // ── Input handling ───────────────────────────────────────────

  private handleLine(input: string): void {
    this.inputBuffer.push(input);

    if (this.inputDebounceTimer) {
      clearTimeout(this.inputDebounceTimer);
    }

    this.inputDebounceTimer = setTimeout(() => {
      this.processBufferedInput();
    }, InteractiveREPL.PASTE_DEBOUNCE_MS);
  }

  private async processBufferedInput(): Promise<void> {
    const fullInput = this.inputBuffer.join("\n");
    this.inputBuffer = [];
    this.inputDebounceTimer = null;

    const trimmed = fullInput.trim();

    if (trimmed === "") {
      this.rl?.prompt();
      return;
    }

    // Check for slash commands (only on single-line input)
    if (!trimmed.includes("\n")) {
      const parsed = registry.parse(trimmed);
      if (parsed) {
        await parsed.command.execute(this, parsed.args);
        if (this.rl) this.rl.prompt();
        return;
      }
    }

    // Not a command — execute as AI prompt
    await this.executePrompt(trimmed);
    this.rl?.prompt();
  }

  // ── AI execution ─────────────────────────────────────────────

  private async executePrompt(prompt: string): Promise<void> {
    this.isProcessing = true;
    const statsTracker = new ExecutionStatsTracker();

    try {
      const fullPrompt = await this.buildPromptWithHistory(prompt);
      const stream = this.aiRunner.runStream(fullPrompt);
      let responseContent = "";

      this.renderer.showThinkingStarted();

      for await (const chunk of stream) {
        switch (chunk.type) {
          case "text_delta":
            this.renderer.showThinkingStopped();
            this.renderer.renderTextDelta(chunk.content);
            responseContent += chunk.content;
            break;

          case "tool_use":
            this.renderer.showThinkingStopped();
            statsTracker.toolStarted(chunk.tool, chunk.id);
            this.renderer.showToolStarted(chunk.tool, chunk.id);
            break;

          case "thinking":
            this.renderer.showThinkingStarted();
            break;

          case "tool_result":
            if (chunk.success) {
              statsTracker.toolCompleted(chunk.tool, chunk.id);
              this.renderer.showToolCompleted(chunk.tool, undefined, chunk.id);
            } else {
              statsTracker.toolFailed(
                chunk.tool,
                chunk.error ?? "Unknown error",
                chunk.id
              );
              this.renderer.showToolFailed(
                chunk.tool,
                chunk.error ?? "Unknown error",
                chunk.id
              );
            }
            break;

          case "result":
            break;

          case "error":
            this.renderer.showThinkingStopped();
            statsTracker.setError(chunk.error);
            this.renderer.renderError(chunk.error);
            this.renderer.finalize();
            break;
        }
      }

      this.renderer.finalize();

      // Store in history for context
      this.conversationHistory.push({ role: "user", content: prompt });
      this.currentSession.messages.push({
        role: "user",
        content: prompt,
        timestamp: Date.now(),
      });

      if (responseContent) {
        const cleanedContent = responseContent.trim();
        if (cleanedContent) {
          this.conversationHistory.push({
            role: "assistant",
            content: cleanedContent,
          });
          this.currentSession.messages.push({
            role: "assistant",
            content: cleanedContent,
            timestamp: Date.now(),
          });
        }
      }

      // Auto-save session after each exchange
      this.saveSession();
    } catch (error) {
      console.error(
        c.error(
          `Error: ${error instanceof Error ? error.message : String(error)}`
        )
      );
    } finally {
      this.isProcessing = false;
    }
  }

  private async buildPromptWithHistory(userInput: string): Promise<string> {
    const basePrompt = await this.promptBuilder.buildGenericPrompt(userInput);

    if (this.conversationHistory.length === 0) {
      return basePrompt;
    }

    const historySection = this.conversationHistory
      .slice(-10)
      .map(
        (msg) => `${msg.role === "user" ? "User" : "Assistant"}: ${msg.content}`
      )
      .join("\n\n");

    return `${basePrompt}\n\n## Previous Conversation\n${historySection}\n\n## Current Request\n${userInput}`;
  }

  private saveSession(): void {
    this.historyManager.saveSession(this.currentSession);
    this.historyManager.pruneSessions();
  }

  // ── Display ──────────────────────────────────────────────────

  private printWelcome(): void {
    const messageCount = this.currentSession.messages.length;
    const sessionStatus =
      messageCount > 0
        ? `${c.dim(`(${messageCount} messages)`)}`
        : c.dim("(new)");

    console.log(`
  ${c.primary("Locus Interactive Mode")}

  ${c.dim("Session:")}  ${c.cyan(this.currentSession.id)} ${sessionStatus}
  ${c.dim("Provider:")} ${c.bold(this._provider)}
  ${c.dim("Model:")}    ${c.bold(this._model)}

  ${c.dim("Type /help for available commands")}
`);
  }
}
