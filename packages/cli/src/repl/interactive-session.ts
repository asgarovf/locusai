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
import { parseCommand } from "./commands";

export interface InteractiveSessionOptions {
  projectPath: string;
  provider: AiProvider;
  model: string;
  /** Optional session ID to resume */
  sessionId?: string;
}

/**
 * Interactive REPL session for continuous AI interaction.
 * Allows users to submit multiple prompts while preserving conversation context.
 */
export class InteractiveSession {
  private readline: readline.Interface | null = null;
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
  private model: string;
  private provider: string;

  constructor(options: InteractiveSessionOptions) {
    this.aiRunner = createAiRunner(options.provider, {
      projectPath: options.projectPath,
      model: options.model,
    });
    this.promptBuilder = new PromptBuilder(options.projectPath);
    this.renderer = new ProgressRenderer({ animated: true });
    this.historyManager = new HistoryManager(options.projectPath);
    this.projectPath = options.projectPath;
    this.model = options.model;
    this.provider = options.provider;

    // Load existing session or create new one
    if (options.sessionId) {
      // Use partial ID matching to support short session IDs
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

  /**
   * Start the interactive session.
   */
  async start(): Promise<void> {
    this.printWelcome();

    this.readline = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
      terminal: true,
    });

    this.readline.setPrompt(c.cyan("> "));
    this.readline.prompt();

    this.readline.on("line", (input) => this.handleLine(input));
    this.readline.on("close", () => this.shutdown());

    // Handle CTRL+C gracefully
    process.on("SIGINT", () => {
      if (this.isProcessing) {
        this.renderer.stopThinkingAnimation();
        console.log(c.dim("\n[Interrupted]"));
        this.isProcessing = false;
        this.readline?.prompt();
      } else {
        this.shutdown();
      }
    });
  }

  private async handleLine(input: string): Promise<void> {
    const trimmed = input.trim();

    if (trimmed === "") {
      this.readline?.prompt();
      return;
    }

    // Check for special commands
    const command = parseCommand(trimmed);
    if (command) {
      await command.execute(this, trimmed.slice(command.name.length).trim());
      if (this.readline) this.readline.prompt();
      return;
    }

    await this.executePrompt(trimmed);
    this.readline?.prompt();
  }

  private async executePrompt(prompt: string): Promise<void> {
    this.isProcessing = true;
    const statsTracker = new ExecutionStatsTracker();

    try {
      const fullPrompt = await this.buildPromptWithHistory(prompt);
      const stream = this.aiRunner.runStream(fullPrompt);
      let responseContent = "";

      // Show initial thinking indicator
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
            // Final result - usually already shown via text_delta
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
        // Filter out completion marker before storing (handle potential edge cases)
        const cleanedContent = responseContent
          .replace(/<promise>COMPLETE<\/promise>/g, "")
          .trim();
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

    // Append conversation history to maintain context
    const historySection = this.conversationHistory
      .slice(-10) // Keep last 10 exchanges to avoid token limits
      .map(
        (msg) => `${msg.role === "user" ? "User" : "Assistant"}: ${msg.content}`
      )
      .join("\n\n");

    return `${basePrompt}\n\n## Previous Conversation\n${historySection}\n\n## Current Request\n${userInput}`;
  }

  /**
   * Reset the conversation context.
   */
  resetContext(): void {
    this.conversationHistory = [];
    this.currentSession = this.historyManager.createNewSession(
      this.model,
      this.provider
    );
    console.log(c.success("Context reset. Starting fresh conversation."));
  }

  /**
   * Get the current session ID.
   */
  getSessionId(): string {
    return this.currentSession.id;
  }

  /**
   * Get the history manager.
   */
  getHistoryManager(): HistoryManager {
    return this.historyManager;
  }

  /**
   * Save the current session to disk.
   */
  private saveSession(): void {
    this.historyManager.saveSession(this.currentSession);
    // Prune old sessions
    this.historyManager.pruneSessions();
  }

  /**
   * Shutdown the interactive session.
   */
  shutdown(): void {
    this.renderer.stopThinkingAnimation();
    console.log(c.dim("\nGoodbye!"));
    this.readline?.close();
    process.exit(0);
  }

  private printWelcome(): void {
    const messageCount = this.currentSession.messages.length;
    const sessionInfo =
      messageCount > 0
        ? `${c.dim("Session:")} ${c.cyan(this.currentSession.id)} ${c.dim(`(${messageCount} messages)`)}`
        : `${c.dim("Session:")} ${c.cyan(this.currentSession.id)} ${c.dim("(new)")}`;

    console.log(`
  ${c.primary("Locus Interactive Mode")}
  ${sessionInfo}
  ${c.dim("Type your prompt, or 'help' for commands")}
  ${c.dim("Use 'exit' or Ctrl+D to quit")}
`);
  }
}
