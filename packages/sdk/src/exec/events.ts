/**
 * Event types emitted during AI execution for rich progress feedback.
 */
export enum ExecEventType {
  /** Session has been initialized and is ready to execute */
  SESSION_STARTED = "session:started",
  /** A prompt has been submitted to the AI */
  PROMPT_SUBMITTED = "prompt:submitted",
  /** AI has started thinking/reasoning */
  THINKING_STARTED = "thinking:started",
  /** AI has stopped thinking/reasoning */
  THINKING_STOPPED = "thinking:stopped",
  /** A tool has started execution */
  TOOL_STARTED = "tool:started",
  /** A tool has completed successfully */
  TOOL_COMPLETED = "tool:completed",
  /** A tool has failed */
  TOOL_FAILED = "tool:failed",
  /** Incremental text output from the AI */
  TEXT_DELTA = "text:delta",
  /** The AI response has completed */
  RESPONSE_COMPLETED = "response:completed",
  /** An error occurred during execution */
  ERROR_OCCURRED = "error:occurred",
  /** The session has ended */
  SESSION_ENDED = "session:ended",
}

/**
 * Base interface for all execution events.
 */
export interface ExecEventBase {
  type: ExecEventType;
  timestamp: number;
}

/**
 * Event payload for SESSION_STARTED
 */
export interface SessionStartedEvent extends ExecEventBase {
  type: ExecEventType.SESSION_STARTED;
  data: {
    sessionId: string;
    model?: string;
    provider?: string;
  };
}

/**
 * Event payload for PROMPT_SUBMITTED
 */
export interface PromptSubmittedEvent extends ExecEventBase {
  type: ExecEventType.PROMPT_SUBMITTED;
  data: {
    prompt: string;
    truncated?: boolean;
  };
}

/**
 * Event payload for THINKING_STARTED
 */
export interface ThinkingStartedEvent extends ExecEventBase {
  type: ExecEventType.THINKING_STARTED;
  data: {
    content?: string;
  };
}

/**
 * Event payload for THINKING_STOPPED
 */
export interface ThinkingStoppedEvent extends ExecEventBase {
  type: ExecEventType.THINKING_STOPPED;
  data: Record<string, never>;
}

/**
 * Event payload for TOOL_STARTED
 */
export interface ToolStartedEvent extends ExecEventBase {
  type: ExecEventType.TOOL_STARTED;
  data: {
    toolName: string;
    toolId?: string;
    parameters?: Record<string, unknown>;
  };
}

/**
 * Event payload for TOOL_COMPLETED
 */
export interface ToolCompletedEvent extends ExecEventBase {
  type: ExecEventType.TOOL_COMPLETED;
  data: {
    toolName: string;
    toolId?: string;
    parameters?: Record<string, unknown>;
    result?: unknown;
    /** Duration in milliseconds */
    duration?: number;
  };
}

/**
 * Event payload for TOOL_FAILED
 */
export interface ToolFailedEvent extends ExecEventBase {
  type: ExecEventType.TOOL_FAILED;
  data: {
    toolName: string;
    toolId?: string;
    parameters?: Record<string, unknown>;
    error: string;
  };
}

/**
 * Event payload for TEXT_DELTA
 */
export interface TextDeltaEvent extends ExecEventBase {
  type: ExecEventType.TEXT_DELTA;
  data: {
    content: string;
  };
}

/**
 * Event payload for RESPONSE_COMPLETED
 */
export interface ResponseCompletedEvent extends ExecEventBase {
  type: ExecEventType.RESPONSE_COMPLETED;
  data: {
    content: string;
  };
}

/**
 * Event payload for ERROR_OCCURRED
 */
export interface ErrorOccurredEvent extends ExecEventBase {
  type: ExecEventType.ERROR_OCCURRED;
  data: {
    error: string;
    code?: string;
  };
}

/**
 * Event payload for SESSION_ENDED
 */
export interface SessionEndedEvent extends ExecEventBase {
  type: ExecEventType.SESSION_ENDED;
  data: {
    sessionId: string;
    success: boolean;
  };
}

/**
 * Union type of all execution events.
 */
export type ExecEvent =
  | SessionStartedEvent
  | PromptSubmittedEvent
  | ThinkingStartedEvent
  | ThinkingStoppedEvent
  | ToolStartedEvent
  | ToolCompletedEvent
  | ToolFailedEvent
  | TextDeltaEvent
  | ResponseCompletedEvent
  | ErrorOccurredEvent
  | SessionEndedEvent;

/**
 * Event listener callback type.
 */
export type ExecEventListener<T extends ExecEvent = ExecEvent> = (
  event: T
) => void;

/**
 * Type-safe event map for ExecEventEmitter.
 */
export interface ExecEventMap {
  [ExecEventType.SESSION_STARTED]: SessionStartedEvent;
  [ExecEventType.PROMPT_SUBMITTED]: PromptSubmittedEvent;
  [ExecEventType.THINKING_STARTED]: ThinkingStartedEvent;
  [ExecEventType.THINKING_STOPPED]: ThinkingStoppedEvent;
  [ExecEventType.TOOL_STARTED]: ToolStartedEvent;
  [ExecEventType.TOOL_COMPLETED]: ToolCompletedEvent;
  [ExecEventType.TOOL_FAILED]: ToolFailedEvent;
  [ExecEventType.TEXT_DELTA]: TextDeltaEvent;
  [ExecEventType.RESPONSE_COMPLETED]: ResponseCompletedEvent;
  [ExecEventType.ERROR_OCCURRED]: ErrorOccurredEvent;
  [ExecEventType.SESSION_ENDED]: SessionEndedEvent;
}
