import { z } from "zod";
import { PROTOCOL_VERSION, ProtocolVersionSchema } from "./envelope";
import { ProtocolErrorSchema } from "./errors";

// ============================================================================
// CLI Stream Event Types
// ============================================================================

/**
 * Event types emitted by the CLI in `--json-stream` mode.
 * Each event is a single JSON line (NDJSON) written to stdout.
 */
export const CliStreamEventType = {
  /** Session started — first event, always emitted */
  START: "start",
  /** Incremental AI response text */
  TEXT_DELTA: "text_delta",
  /** AI is thinking/reasoning */
  THINKING: "thinking",
  /** Tool invocation started */
  TOOL_STARTED: "tool_started",
  /** Tool invocation completed (success or failure) */
  TOOL_COMPLETED: "tool_completed",
  /** Session status change */
  STATUS: "status",
  /** Structured error */
  ERROR: "error",
  /** Session finished — terminal event, always emitted last */
  DONE: "done",
} as const;

export type CliStreamEventType =
  (typeof CliStreamEventType)[keyof typeof CliStreamEventType];

export const CliStreamEventTypeSchema = z.enum(CliStreamEventType);

// ============================================================================
// Base Fields (present on every event)
// ============================================================================

const CliStreamBaseSchema = z.object({
  protocol: ProtocolVersionSchema,
  sessionId: z.string(),
  timestamp: z.number(),
});

// ============================================================================
// Individual CLI Stream Event Schemas
// ============================================================================

export const CliStartEventSchema = CliStreamBaseSchema.extend({
  type: z.literal(CliStreamEventType.START),
  payload: z.object({
    command: z.string(),
    model: z.string().optional(),
    provider: z.string().optional(),
    cwd: z.string().optional(),
  }),
});

export type CliStartEvent = z.infer<typeof CliStartEventSchema>;

export const CliTextDeltaEventSchema = CliStreamBaseSchema.extend({
  type: z.literal(CliStreamEventType.TEXT_DELTA),
  payload: z.object({
    content: z.string(),
  }),
});

export type CliTextDeltaEvent = z.infer<typeof CliTextDeltaEventSchema>;

export const CliThinkingEventSchema = CliStreamBaseSchema.extend({
  type: z.literal(CliStreamEventType.THINKING),
  payload: z.object({
    content: z.string().optional(),
  }),
});

export type CliThinkingEvent = z.infer<typeof CliThinkingEventSchema>;

export const CliToolStartedEventSchema = CliStreamBaseSchema.extend({
  type: z.literal(CliStreamEventType.TOOL_STARTED),
  payload: z.object({
    tool: z.string(),
    toolId: z.string().optional(),
    parameters: z.record(z.string(), z.unknown()).optional(),
  }),
});

export type CliToolStartedEvent = z.infer<typeof CliToolStartedEventSchema>;

export const CliToolCompletedEventSchema = CliStreamBaseSchema.extend({
  type: z.literal(CliStreamEventType.TOOL_COMPLETED),
  payload: z.object({
    tool: z.string(),
    toolId: z.string().optional(),
    success: z.boolean(),
    duration: z.number().optional(),
    error: z.string().optional(),
  }),
});

export type CliToolCompletedEvent = z.infer<typeof CliToolCompletedEventSchema>;

export const CliStatusEventSchema = CliStreamBaseSchema.extend({
  type: z.literal(CliStreamEventType.STATUS),
  payload: z.object({
    status: z.string(),
    message: z.string().optional(),
  }),
});

export type CliStatusEvent = z.infer<typeof CliStatusEventSchema>;

export const CliErrorEventSchema = CliStreamBaseSchema.extend({
  type: z.literal(CliStreamEventType.ERROR),
  payload: z.object({
    error: ProtocolErrorSchema,
  }),
});

export type CliErrorEvent = z.infer<typeof CliErrorEventSchema>;

export const CliDoneEventSchema = CliStreamBaseSchema.extend({
  type: z.literal(CliStreamEventType.DONE),
  payload: z.object({
    exitCode: z.number().int(),
    duration: z.number(),
    toolsUsed: z.array(z.string()).optional(),
    tokensUsed: z.number().optional(),
    success: z.boolean(),
  }),
});

export type CliDoneEvent = z.infer<typeof CliDoneEventSchema>;

// ============================================================================
// Discriminated Union
// ============================================================================

export const CliStreamEventSchema = z.discriminatedUnion("type", [
  CliStartEventSchema,
  CliTextDeltaEventSchema,
  CliThinkingEventSchema,
  CliToolStartedEventSchema,
  CliToolCompletedEventSchema,
  CliStatusEventSchema,
  CliErrorEventSchema,
  CliDoneEventSchema,
]);

export type CliStreamEvent = z.infer<typeof CliStreamEventSchema>;

// ============================================================================
// CLI Stream Event Constructor
// ============================================================================

type CliStreamPayloadMap = {
  [CliStreamEventType.START]: CliStartEvent["payload"];
  [CliStreamEventType.TEXT_DELTA]: CliTextDeltaEvent["payload"];
  [CliStreamEventType.THINKING]: CliThinkingEvent["payload"];
  [CliStreamEventType.TOOL_STARTED]: CliToolStartedEvent["payload"];
  [CliStreamEventType.TOOL_COMPLETED]: CliToolCompletedEvent["payload"];
  [CliStreamEventType.STATUS]: CliStatusEvent["payload"];
  [CliStreamEventType.ERROR]: CliErrorEvent["payload"];
  [CliStreamEventType.DONE]: CliDoneEvent["payload"];
};

/**
 * Create a validated CLI stream event.
 * Validates the payload against the Zod schema before returning.
 */
export function createCliStreamEvent<T extends CliStreamEventType>(
  type: T,
  sessionId: string,
  payload: CliStreamPayloadMap[T]
): CliStreamEvent {
  return CliStreamEventSchema.parse({
    protocol: PROTOCOL_VERSION,
    type,
    sessionId,
    timestamp: Date.now(),
    payload,
  });
}

/**
 * Parse and validate an unknown value as a CliStreamEvent.
 * Returns `{ success: true, data }` or `{ success: false, error }`.
 */
export function parseCliStreamEvent(value: unknown): {
  success: boolean;
  data?: CliStreamEvent;
  error?: unknown;
} {
  const result = CliStreamEventSchema.safeParse(value);
  if (result.success) {
    return { success: true, data: result.data as CliStreamEvent };
  }
  return { success: false, error: result.error };
}
