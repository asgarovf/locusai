import { EventEmitter } from "node:events";
import {
  type ExecEvent,
  type ExecEventListener,
  type ExecEventMap,
  ExecEventType,
} from "./events.js";

/**
 * Generates a unique session ID.
 */
function generateSessionId(): string {
  return `exec-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Type-safe event emitter for execution progress feedback.
 *
 * Provides methods to emit and listen to execution events with full type safety.
 *
 * @example
 * ```typescript
 * const emitter = new ExecEventEmitter();
 *
 * // Listen to events
 * emitter.on(ExecEventType.TOOL_STARTED, (event) => {
 *   console.log(`Tool started: ${event.data.toolName}`);
 * });
 *
 * // Emit events
 * emitter.emitToolStarted('Read');
 * ```
 */
export class ExecEventEmitter {
  private emitter: EventEmitter;
  private sessionId: string;
  private isSessionActive = false;
  private eventLog: ExecEvent[] = [];
  private debugMode = false;

  constructor(options?: { debug?: boolean }) {
    this.emitter = new EventEmitter();
    this.sessionId = generateSessionId();
    this.debugMode = options?.debug ?? false;
  }

  /**
   * Get the current session ID.
   */
  getSessionId(): string {
    return this.sessionId;
  }

  /**
   * Check if a session is currently active.
   */
  isActive(): boolean {
    return this.isSessionActive;
  }

  /**
   * Get the event log for debugging purposes.
   */
  getEventLog(): ExecEvent[] {
    return [...this.eventLog];
  }

  /**
   * Clear the event log.
   */
  clearEventLog(): void {
    this.eventLog = [];
  }

  /**
   * Subscribe to a specific event type.
   */
  on<K extends ExecEventType>(
    eventType: K,
    listener: ExecEventListener<ExecEventMap[K]>
  ): this {
    this.emitter.on(eventType, listener);
    return this;
  }

  /**
   * Subscribe to a specific event type for a single emission.
   */
  once<K extends ExecEventType>(
    eventType: K,
    listener: ExecEventListener<ExecEventMap[K]>
  ): this {
    this.emitter.once(eventType, listener);
    return this;
  }

  /**
   * Unsubscribe from a specific event type.
   */
  off<K extends ExecEventType>(
    eventType: K,
    listener: ExecEventListener<ExecEventMap[K]>
  ): this {
    this.emitter.off(eventType, listener);
    return this;
  }

  /**
   * Remove all listeners for a specific event type or all events.
   */
  removeAllListeners(eventType?: ExecEventType): this {
    if (eventType) {
      this.emitter.removeAllListeners(eventType);
    } else {
      this.emitter.removeAllListeners();
    }
    return this;
  }

  /**
   * Emit an event with the given payload.
   */
  private emit<K extends ExecEventType>(event: ExecEventMap[K]): void {
    if (this.debugMode) {
      this.eventLog.push(event);
    }
    this.emitter.emit(event.type, event);
  }

  /**
   * Create the base event structure with timestamp.
   */
  private createEventBase<T extends ExecEventType>(type: T) {
    return {
      type,
      timestamp: Date.now(),
    };
  }

  // ============================================================
  // Convenience methods for emitting specific events
  // ============================================================

  /**
   * Emit SESSION_STARTED event.
   */
  emitSessionStarted(options?: { model?: string; provider?: string }): void {
    this.isSessionActive = true;
    this.emit({
      ...this.createEventBase(ExecEventType.SESSION_STARTED),
      data: {
        sessionId: this.sessionId,
        model: options?.model,
        provider: options?.provider,
      },
    });
  }

  /**
   * Emit PROMPT_SUBMITTED event.
   */
  emitPromptSubmitted(prompt: string, truncated = false): void {
    this.emit({
      ...this.createEventBase(ExecEventType.PROMPT_SUBMITTED),
      data: {
        prompt: truncated ? `${prompt.substring(0, 500)}...` : prompt,
        truncated,
      },
    });
  }

  /**
   * Emit THINKING_STARTED event.
   */
  emitThinkingStarted(content?: string): void {
    this.emit({
      ...this.createEventBase(ExecEventType.THINKING_STARTED),
      data: {
        content,
      },
    });
  }

  /**
   * Emit THINKING_STOPPED event.
   */
  emitThinkingStoped(): void {
    this.emit({
      ...this.createEventBase(ExecEventType.THINKING_STOPPED),
      data: {},
    });
  }

  /**
   * Emit TOOL_STARTED event.
   */
  emitToolStarted(toolName: string, toolId?: string): void {
    this.emit({
      ...this.createEventBase(ExecEventType.TOOL_STARTED),
      data: {
        toolName,
        toolId,
      },
    });
  }

  /**
   * Emit TOOL_COMPLETED event.
   */
  emitToolCompleted(
    toolName: string,
    toolId?: string,
    result?: unknown,
    duration?: number
  ): void {
    this.emit({
      ...this.createEventBase(ExecEventType.TOOL_COMPLETED),
      data: {
        toolName,
        toolId,
        result,
        duration,
      },
    });
  }

  /**
   * Emit TOOL_FAILED event.
   */
  emitToolFailed(toolName: string, error: string, toolId?: string): void {
    this.emit({
      ...this.createEventBase(ExecEventType.TOOL_FAILED),
      data: {
        toolName,
        toolId,
        error,
      },
    });
  }

  /**
   * Emit TEXT_DELTA event.
   */
  emitTextDelta(content: string): void {
    this.emit({
      ...this.createEventBase(ExecEventType.TEXT_DELTA),
      data: {
        content,
      },
    });
  }

  /**
   * Emit RESPONSE_COMPLETED event.
   */
  emitResponseCompleted(content: string): void {
    this.emit({
      ...this.createEventBase(ExecEventType.RESPONSE_COMPLETED),
      data: {
        content,
      },
    });
  }

  /**
   * Emit ERROR_OCCURRED event.
   */
  emitErrorOccurred(error: string, code?: string): void {
    this.emit({
      ...this.createEventBase(ExecEventType.ERROR_OCCURRED),
      data: {
        error,
        code,
      },
    });
  }

  /**
   * Emit SESSION_ENDED event.
   */
  emitSessionEnded(success: boolean): void {
    this.isSessionActive = false;
    this.emit({
      ...this.createEventBase(ExecEventType.SESSION_ENDED),
      data: {
        sessionId: this.sessionId,
        success,
      },
    });
  }
}
