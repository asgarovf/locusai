import { PROTOCOL_VERSION } from "./envelope";
import { type ProtocolError, ProtocolErrorCode } from "./errors";
import {
  type ErrorEvent,
  type HostEvent,
  HostEventSchema,
  HostEventType,
} from "./host-events";
import {
  SESSION_TRANSITIONS,
  type SessionStatus,
  type SessionTransitionEvent,
  TERMINAL_STATUSES,
} from "./session";
import { type UIIntent, UIIntentSchema, UIIntentType } from "./ui-intents";

// ============================================================================
// Safe Parse Result Type
// ============================================================================

type SafeParseResult<T> =
  | { success: true; data: T }
  | { success: false; error: unknown };

// ============================================================================
// Message Validation
// ============================================================================

/**
 * Parse and validate an unknown message as a UIIntent.
 * Returns `{ success: true, data }` or `{ success: false, error }`.
 */
export function parseUIIntent(message: unknown): SafeParseResult<UIIntent> {
  return UIIntentSchema.safeParse(message) as SafeParseResult<UIIntent>;
}

/**
 * Parse and validate an unknown message as a HostEvent.
 * Returns `{ success: true, data }` or `{ success: false, error }`.
 */
export function parseHostEvent(message: unknown): SafeParseResult<HostEvent> {
  return HostEventSchema.safeParse(message) as SafeParseResult<HostEvent>;
}

// ============================================================================
// Type Guards
// ============================================================================

/** Check if a validated UIIntent is a specific type. */
export function isUIIntentType<T extends UIIntentType>(
  intent: UIIntent,
  type: T
): intent is Extract<UIIntent, { type: T }> {
  return intent.type === type;
}

/** Check if a validated HostEvent is a specific type. */
export function isHostEventType<T extends HostEventType>(
  event: HostEvent,
  type: T
): event is Extract<HostEvent, { type: T }> {
  return event.type === type;
}

// ============================================================================
// Session State Machine Helpers
// ============================================================================

/**
 * Check if a transition is valid according to the session state machine.
 */
export function isValidTransition(
  from: SessionStatus,
  event: SessionTransitionEvent
): boolean {
  return SESSION_TRANSITIONS.some((t) => t.from === from && t.event === event);
}

/**
 * Get the target state for a transition, or `null` if invalid.
 */
export function getNextStatus(
  from: SessionStatus,
  event: SessionTransitionEvent
): SessionStatus | null {
  const transition = SESSION_TRANSITIONS.find(
    (t) => t.from === from && t.event === event
  );
  return transition?.to ?? null;
}

/**
 * Check if a session status is a terminal state.
 */
export function isTerminalStatus(status: SessionStatus): boolean {
  return TERMINAL_STATUSES.has(status);
}

// ============================================================================
// Error Constructors
// ============================================================================

/**
 * Create a structured protocol error.
 */
export function createProtocolError(
  code: ProtocolErrorCode,
  message: string,
  options?: { details?: unknown; recoverable?: boolean }
): ProtocolError {
  return {
    code,
    message,
    details: options?.details,
    recoverable: options?.recoverable ?? false,
  };
}

/**
 * Create a host error event from an error code and message.
 */
export function createErrorEvent(
  code: ProtocolErrorCode,
  message: string,
  options?: {
    sessionId?: string;
    details?: unknown;
    recoverable?: boolean;
  }
): ErrorEvent {
  return {
    protocol: PROTOCOL_VERSION,
    type: HostEventType.ERROR,
    payload: {
      sessionId: options?.sessionId,
      error: createProtocolError(code, message, {
        details: options?.details,
        recoverable: options?.recoverable,
      }),
    },
  };
}
