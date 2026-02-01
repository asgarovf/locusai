import type { AiRunner } from "../ai/runner.js";
import {
  type Artifact,
  ContextTracker,
  type ContextTrackerState,
  type Task,
} from "./context-tracker.js";
import { ExecEventEmitter } from "./event-emitter.js";
import { ExecEventType } from "./events.js";
import {
  type ConversationMessage,
  type ConversationSession,
  HistoryManager,
} from "./history-manager.js";
import type { StreamChunk } from "./types.js";

/**
 * Configuration options for ExecSession.
 */
export interface ExecSessionConfig {
  /** The AI runner to use for execution */
  aiRunner: AiRunner;
  /** Project path for history storage */
  projectPath: string;
  /** Model name for session metadata */
  model: string;
  /** Provider name for session metadata */
  provider: string;
  /** Optional session ID to resume */
  sessionId?: string;
  /** Maximum messages to include in context (default: 10) */
  maxContextMessages?: number;
  /** Enable debug mode for event logging */
  debug?: boolean;
}

/**
 * Result returned after execution completes.
 */
export interface ExecResult {
  content: string;
  toolsUsed: string[];
  duration: number;
  success: boolean;
  error?: string;
}

const DEFAULT_MAX_CONTEXT_MESSAGES = 10;

/**
 * Manages AI execution with conversation history persistence.
 *
 * ExecSession wraps an AI runner and automatically:
 * - Maintains conversation history across prompts
 * - Persists history to disk between sessions
 * - Includes recent history in prompts for context
 * - Emits events for progress tracking
 * - Prunes old sessions to prevent unbounded growth
 *
 * @example
 * ```typescript
 * const session = new ExecSession({
 *   aiRunner: myRunner,
 *   projectPath: '/path/to/project',
 *   model: 'claude-sonnet-4-5',
 *   provider: 'claude',
 * });
 *
 * await session.initialize();
 *
 * // Stream execution with history
 * for await (const chunk of session.executeStreaming('Write a function')) {
 *   console.log(chunk);
 * }
 *
 * // Save session for later resume
 * session.save();
 * ```
 */
export class ExecSession {
  private aiRunner: AiRunner;
  private history: HistoryManager;
  private currentSession: ConversationSession | null = null;
  private eventEmitter: ExecEventEmitter;
  private contextTracker: ContextTracker;
  private maxContextMessages: number;
  private model: string;
  private provider: string;
  private sessionId?: string;
  /** Track tool start times for duration calculation */
  private toolStartTimes: Map<string, number> = new Map();

  constructor(config: ExecSessionConfig) {
    this.aiRunner = config.aiRunner;
    this.history = new HistoryManager(config.projectPath);
    this.eventEmitter = new ExecEventEmitter({ debug: config.debug });
    this.contextTracker = new ContextTracker();
    this.maxContextMessages =
      config.maxContextMessages ?? DEFAULT_MAX_CONTEXT_MESSAGES;
    this.model = config.model;
    this.provider = config.provider;
    this.sessionId = config.sessionId;
  }

  /**
   * Initialize the session, loading existing session or creating new one.
   */
  initialize(): void {
    if (this.sessionId) {
      // Resume existing session
      const loaded = this.history.loadSession(this.sessionId);
      if (loaded) {
        this.currentSession = loaded;

        // Restore context tracker state if available
        const metadata = loaded.metadata as Record<string, unknown>;
        if (metadata.contextTracker) {
          this.contextTracker.restore(
            metadata.contextTracker as ContextTrackerState
          );
        }
      } else {
        // Session not found, create new one
        this.currentSession = this.history.createNewSession(
          this.model,
          this.provider
        );
      }
    } else {
      // Create a new session
      this.currentSession = this.history.createNewSession(
        this.model,
        this.provider
      );
    }

    this.eventEmitter.emitSessionStarted({
      model: this.model,
      provider: this.provider,
    });
  }

  /**
   * Get the current session.
   */
  getSession(): ConversationSession | null {
    return this.currentSession;
  }

  /**
   * Get the session ID.
   */
  getSessionId(): string | null {
    return this.currentSession?.id ?? null;
  }

  /**
   * Get the event emitter for subscribing to execution events.
   */
  getEventEmitter(): ExecEventEmitter {
    return this.eventEmitter;
  }

  /**
   * Get the history manager.
   */
  getHistoryManager(): HistoryManager {
    return this.history;
  }

  /**
   * Get the context tracker for managing artifacts and tasks.
   */
  getContextTracker(): ContextTracker {
    return this.contextTracker;
  }

  /**
   * Create and track an artifact in the session.
   */
  createArtifact(
    params: Omit<Artifact, "id" | "createdAt" | "updatedAt">
  ): Artifact {
    return this.contextTracker.createArtifact(params);
  }

  /**
   * Create and track a task in the session.
   */
  createTask(params: Omit<Task, "id" | "createdAt" | "updatedAt">): Task {
    return this.contextTracker.createTask(params);
  }

  /**
   * Resolve a natural language reference to an artifact.
   */
  resolveArtifactReference(reference: string): Artifact | null {
    return this.contextTracker.getReferencedArtifact(reference);
  }

  /**
   * Resolve a natural language reference to a task.
   */
  resolveTaskReference(reference: string): Task | null {
    return this.contextTracker.getReferencedTask(reference);
  }

  /**
   * Get conversation messages from the current session.
   */
  getMessages(): ConversationMessage[] {
    return this.currentSession?.messages ?? [];
  }

  /**
   * Add a message to the current session.
   */
  addMessage(message: Omit<ConversationMessage, "timestamp">): void {
    if (!this.currentSession) {
      throw new Error("Session not initialized. Call initialize() first.");
    }

    this.currentSession.messages.push({
      ...message,
      timestamp: Date.now(),
    });
  }

  /**
   * Execute a prompt with streaming output and history context.
   */
  async *executeStreaming(
    userPrompt: string
  ): AsyncGenerator<StreamChunk, void, unknown> {
    if (!this.currentSession) {
      throw new Error("Session not initialized. Call initialize() first.");
    }

    const startTime = Date.now();
    this.eventEmitter.emitPromptSubmitted(userPrompt, userPrompt.length > 500);

    // Add user message to history
    this.currentSession.messages.push({
      role: "user",
      content: userPrompt,
      timestamp: Date.now(),
    });

    // Build prompt with history context
    const fullPrompt = this.buildPromptWithHistory(userPrompt);

    // Prepare assistant message tracking
    const assistantMessage: ConversationMessage = {
      role: "assistant",
      content: "",
      timestamp: Date.now(),
      metadata: { toolsUsed: [], duration: 0 },
    };

    let hasError = false;
    let errorMessage = "";

    try {
      // Stream execution
      const stream = this.aiRunner.runStream(fullPrompt);

      for await (const chunk of stream) {
        // Track content and tools
        switch (chunk.type) {
          case "text_delta":
            assistantMessage.content += chunk.content;
            this.eventEmitter.emitTextDelta(chunk.content);
            break;

          case "tool_use": {
            assistantMessage.metadata?.toolsUsed?.push(chunk.tool);
            // Track start time for duration calculation
            const toolKey = chunk.id ?? `${chunk.tool}-${Date.now()}`;
            this.toolStartTimes.set(toolKey, Date.now());
            this.eventEmitter.emitToolStarted(chunk.tool, chunk.id);
            break;
          }

          case "thinking":
            this.eventEmitter.emitThinkingStarted(chunk.content);
            break;

          case "tool_result": {
            // Calculate duration from start time
            const resultKey = chunk.id ?? chunk.tool;
            const startTime = this.toolStartTimes.get(resultKey);
            const duration = startTime ? Date.now() - startTime : undefined;

            if (chunk.success) {
              this.eventEmitter.emitToolCompleted(
                chunk.tool,
                chunk.id,
                undefined,
                duration
              );
            } else {
              this.eventEmitter.emitToolFailed(
                chunk.tool,
                chunk.error ?? "Unknown error",
                chunk.id
              );
            }

            // Clean up start time
            if (resultKey) {
              this.toolStartTimes.delete(resultKey);
            }
            break;
          }

          case "result":
            this.eventEmitter.emitResponseCompleted(chunk.content);
            break;

          case "error":
            hasError = true;
            errorMessage = chunk.error;
            this.eventEmitter.emitErrorOccurred(chunk.error);
            break;
        }

        yield chunk;
      }
    } catch (error) {
      hasError = true;
      errorMessage = error instanceof Error ? error.message : String(error);
      this.eventEmitter.emitErrorOccurred(errorMessage);

      yield {
        type: "error",
        error: errorMessage,
      };
    }

    // Calculate duration and finalize assistant message
    const duration = Date.now() - startTime;
    if (assistantMessage.metadata) {
      assistantMessage.metadata.duration = duration;
    }

    // Only add assistant message if we got some content
    if (assistantMessage.content || hasError) {
      if (hasError && !assistantMessage.content) {
        assistantMessage.content = `Error: ${errorMessage}`;
      }
      this.currentSession.messages.push(assistantMessage);
    }

    // Update session timestamp
    this.currentSession.updatedAt = Date.now();
  }

  /**
   * Execute a prompt without streaming (returns complete result).
   */
  async execute(userPrompt: string): Promise<ExecResult> {
    const chunks: StreamChunk[] = [];
    let content = "";
    const toolsUsed: string[] = [];
    const startTime = Date.now();
    let hasError = false;
    let errorMessage = "";

    for await (const chunk of this.executeStreaming(userPrompt)) {
      chunks.push(chunk);

      if (chunk.type === "text_delta") {
        content += chunk.content;
      } else if (chunk.type === "tool_use") {
        toolsUsed.push(chunk.tool);
      } else if (chunk.type === "error") {
        hasError = true;
        errorMessage = chunk.error;
      }
    }

    return {
      content,
      toolsUsed,
      duration: Date.now() - startTime,
      success: !hasError,
      error: hasError ? errorMessage : undefined,
    };
  }

  /**
   * Build a prompt that includes conversation history and context for follow-ups.
   */
  private buildPromptWithHistory(currentPrompt: string): string {
    const sections: string[] = [];

    // Add context summary if there are tracked artifacts or tasks
    const contextSummary = this.contextTracker.buildContextSummary();
    if (contextSummary) {
      sections.push(contextSummary);
    }

    // Add conversation history if available
    if (this.currentSession && this.currentSession.messages.length > 1) {
      // Get recent messages for context (excluding the current message we just added)
      const recentMessages = this.currentSession.messages
        .slice(-(this.maxContextMessages + 1), -1)
        .map(
          (msg) =>
            `${msg.role === "user" ? "User" : "Assistant"}: ${msg.content}`
        )
        .join("\n\n");

      if (recentMessages) {
        sections.push(`## Conversation History\n${recentMessages}`);
      }
    }

    // If no context, just return the prompt
    if (sections.length === 0) {
      return currentPrompt;
    }

    // Add current request
    sections.push(`## Current Request\n${currentPrompt}`);

    return sections.join("\n\n");
  }

  /**
   * Save the current session to disk.
   */
  save(): void {
    if (!this.currentSession) {
      throw new Error("Session not initialized. Call initialize() first.");
    }

    // Store context tracker state in session metadata
    if (this.contextTracker.hasContent()) {
      (this.currentSession.metadata as Record<string, unknown>).contextTracker =
        this.contextTracker.toJSON();
    }

    this.history.saveSession(this.currentSession);

    // Prune old sessions after save
    this.history.pruneSessions();
  }

  /**
   * Reset the session (clear messages but keep the same session ID).
   */
  reset(): void {
    if (!this.currentSession) {
      throw new Error("Session not initialized. Call initialize() first.");
    }

    this.currentSession.messages = [];
    this.currentSession.updatedAt = Date.now();
    this.contextTracker.clear();
  }

  /**
   * Start a new session (discards current session if not saved).
   */
  startNewSession(): void {
    this.currentSession = this.history.createNewSession(
      this.model,
      this.provider
    );
    this.contextTracker.clear();

    this.eventEmitter.emitSessionStarted({
      model: this.model,
      provider: this.provider,
    });
  }

  /**
   * End the session and emit completion event.
   */
  end(success = true): void {
    this.eventEmitter.emitSessionEnded(success);
  }

  /**
   * Subscribe to execution events.
   */
  on<K extends ExecEventType>(
    eventType: K,
    listener: Parameters<ExecEventEmitter["on"]>[1]
  ): this {
    this.eventEmitter.on(eventType, listener);
    return this;
  }

  /**
   * Unsubscribe from execution events.
   */
  off<K extends ExecEventType>(
    eventType: K,
    listener: Parameters<ExecEventEmitter["off"]>[1]
  ): this {
    this.eventEmitter.off(eventType, listener);
    return this;
  }
}
