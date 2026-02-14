import { z } from "zod";

// ============================================================================
// Session State
// ============================================================================

export const SessionStatus = {
  IDLE: "idle",
  STARTING: "starting",
  RUNNING: "running",
  STREAMING: "streaming",
  COMPLETED: "completed",
  CANCELED: "canceled",
  INTERRUPTED: "interrupted",
  FAILED: "failed",
  RESUMING: "resuming",
} as const;

export type SessionStatus = (typeof SessionStatus)[keyof typeof SessionStatus];

export const SessionStatusSchema = z.enum(SessionStatus);

// ============================================================================
// Session Lifecycle Transitions
// ============================================================================

export const SessionTransitionEvent = {
  CREATE_SESSION: "create_session",
  CLI_SPAWNED: "cli_spawned",
  FIRST_TEXT_DELTA: "first_text_delta",
  RESULT_RECEIVED: "result_received",
  USER_STOP: "user_stop",
  PROCESS_LOST: "process_lost",
  RESUME: "resume",
  ERROR: "error",
} as const;

export type SessionTransitionEvent =
  (typeof SessionTransitionEvent)[keyof typeof SessionTransitionEvent];

export const SessionTransitionEventSchema = z.enum(SessionTransitionEvent);

/**
 * Valid state transitions for the session state machine.
 * Maps `from → event → to`.
 */
export const SESSION_TRANSITIONS: ReadonlyArray<{
  from: SessionStatus;
  event: SessionTransitionEvent;
  to: SessionStatus;
}> = [
  {
    from: SessionStatus.IDLE,
    event: SessionTransitionEvent.CREATE_SESSION,
    to: SessionStatus.STARTING,
  },
  {
    from: SessionStatus.STARTING,
    event: SessionTransitionEvent.CLI_SPAWNED,
    to: SessionStatus.RUNNING,
  },
  {
    from: SessionStatus.STARTING,
    event: SessionTransitionEvent.ERROR,
    to: SessionStatus.FAILED,
  },
  {
    from: SessionStatus.RUNNING,
    event: SessionTransitionEvent.FIRST_TEXT_DELTA,
    to: SessionStatus.STREAMING,
  },
  {
    from: SessionStatus.RUNNING,
    event: SessionTransitionEvent.USER_STOP,
    to: SessionStatus.CANCELED,
  },
  {
    from: SessionStatus.RUNNING,
    event: SessionTransitionEvent.PROCESS_LOST,
    to: SessionStatus.INTERRUPTED,
  },
  {
    from: SessionStatus.RUNNING,
    event: SessionTransitionEvent.ERROR,
    to: SessionStatus.FAILED,
  },
  {
    from: SessionStatus.STREAMING,
    event: SessionTransitionEvent.RESULT_RECEIVED,
    to: SessionStatus.COMPLETED,
  },
  {
    from: SessionStatus.STREAMING,
    event: SessionTransitionEvent.USER_STOP,
    to: SessionStatus.CANCELED,
  },
  {
    from: SessionStatus.STREAMING,
    event: SessionTransitionEvent.PROCESS_LOST,
    to: SessionStatus.INTERRUPTED,
  },
  {
    from: SessionStatus.STREAMING,
    event: SessionTransitionEvent.ERROR,
    to: SessionStatus.FAILED,
  },
  {
    from: SessionStatus.INTERRUPTED,
    event: SessionTransitionEvent.RESUME,
    to: SessionStatus.RESUMING,
  },
  {
    from: SessionStatus.RESUMING,
    event: SessionTransitionEvent.CLI_SPAWNED,
    to: SessionStatus.RUNNING,
  },
  {
    from: SessionStatus.RESUMING,
    event: SessionTransitionEvent.ERROR,
    to: SessionStatus.FAILED,
  },
  {
    from: SessionStatus.COMPLETED,
    event: SessionTransitionEvent.CREATE_SESSION,
    to: SessionStatus.STARTING,
  },
  {
    from: SessionStatus.CANCELED,
    event: SessionTransitionEvent.CREATE_SESSION,
    to: SessionStatus.STARTING,
  },
  {
    from: SessionStatus.FAILED,
    event: SessionTransitionEvent.CREATE_SESSION,
    to: SessionStatus.STARTING,
  },
] as const;

/** Terminal states — no transitions out except new session creation. */
export const TERMINAL_STATUSES: ReadonlySet<SessionStatus> = new Set([
  SessionStatus.COMPLETED,
  SessionStatus.CANCELED,
  SessionStatus.FAILED,
]);

// ============================================================================
// Session Metadata
// ============================================================================

export const SessionMetadataSchema = z.object({
  sessionId: z.string(),
  status: SessionStatusSchema,
  model: z.string().optional(),
  createdAt: z.number(),
  updatedAt: z.number(),
  title: z.string().optional(),
});

export type SessionMetadata = z.infer<typeof SessionMetadataSchema>;

// ============================================================================
// Session Summary (used in session lists)
// ============================================================================

export const SessionSummarySchema = z.object({
  sessionId: z.string(),
  status: SessionStatusSchema,
  model: z.string().optional(),
  title: z.string().optional(),
  createdAt: z.number(),
  updatedAt: z.number(),
  messageCount: z.number(),
  toolCount: z.number(),
});

export type SessionSummary = z.infer<typeof SessionSummarySchema>;
