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
import {
  buildImageContext,
  detectImages,
  imageDisplayName,
  stripImagePaths,
} from "./image-detect";
import { InputHandler } from "./input-handler";

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
  private inputHandler: InputHandler | null = null;
  private aiRunner: AiRunner;
  private promptBuilder: PromptBuilder;
  private renderer: ProgressRenderer;
  private isProcessing = false;
  private interrupted = false;
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

    this.inputHandler = new InputHandler({
      prompt: c.cyan("> "),
      continuationPrompt: c.dim("\u2026 "),
      onSubmit: (input) => {
        this.handleSubmit(input).catch((err) => {
          console.error(
            c.error(
              `Error: ${err instanceof Error ? err.message : String(err)}`
            )
          );
          this.inputHandler?.showPrompt();
        });
      },
      onInterrupt: () => {
        if (this.isProcessing) {
          this.interrupted = true;
          this.renderer.stopThinkingAnimation();
          this.aiRunner.abort();
          console.log(c.dim("\n[Interrupted]"));
          this.isProcessing = false;
          this.inputHandler?.showPrompt();
        } else {
          this.shutdown();
        }
      },
      onClose: () => this.shutdown(),
    });

    this.inputHandler.start();
    this.inputHandler.showPrompt();
  }

  private async handleSubmit(input: string): Promise<void> {
    this.interrupted = false;
    const trimmed = input.trim();

    if (trimmed === "") {
      this.inputHandler?.showPrompt();
      return;
    }

    // Check for special commands (only if single line)
    if (!trimmed.includes("\n")) {
      const command = parseCommand(trimmed);
      if (command) {
        await command.execute(this, trimmed.slice(command.name.length).trim());
        this.inputHandler?.showPrompt();
        return;
      }
    }

    await this.executePrompt(trimmed);
    // Don't show prompt if already shown by interrupt handler
    if (!this.interrupted) {
      this.inputHandler?.showPrompt();
    }
  }

  private async executePrompt(prompt: string): Promise<void> {
    this.isProcessing = true;
    const statsTracker = new ExecutionStatsTracker();

    try {
      // Detect image file paths (e.g. pasted macOS screenshots)
      const images = detectImages(prompt);
      if (images.length > 0) {
        for (const img of images) {
          const status = img.exists ? c.success("attached") : c.warning("not found");
          process.stdout.write(
            `  ${c.cyan(`[Image: ${imageDisplayName(img.path)}]`)} ${status}\r\n`
          );
        }
      }

      // Strip image paths from the prompt and append Read instructions
      const cleanedPrompt = stripImagePaths(prompt, images);
      const effectivePrompt = cleanedPrompt + buildImageContext(images);
      const fullPrompt = await this.buildPromptWithHistory(effectivePrompt);
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
    this.aiRunner.abort();
    console.log(c.dim("\nGoodbye!"));
    this.inputHandler?.stop();
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
  ${c.dim("Enter to send, Shift+Enter for newline")}
  ${c.dim("Use 'exit' or Ctrl+D to quit")}
`);
  }
}
