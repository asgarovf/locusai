import { z } from "zod";
import { PROTOCOL_VERSION, ProtocolVersionSchema } from "./envelope";
import { ProtocolErrorSchema } from "./errors";
import {
  SessionMetadataSchema,
  SessionStatusSchema,
  SessionSummarySchema,
} from "./session";

// ============================================================================
// Host Event Types (Host → Webview)
// ============================================================================

export const HostEventType = {
  SESSION_STATE: "session_state",
  TEXT_DELTA: "text_delta",
  TOOL_STARTED: "tool_started",
  TOOL_COMPLETED: "tool_completed",
  THINKING: "thinking",
  ERROR: "error",
  SESSION_LIST: "session_list",
  SESSION_COMPLETED: "session_completed",
} as const;

export type HostEventType = (typeof HostEventType)[keyof typeof HostEventType];

export const HostEventTypeSchema = z.enum(HostEventType);

// ============================================================================
// Timeline Entry (used within session_state)
// ============================================================================

export const TimelineEntryKind = {
  MESSAGE: "message",
  TOOL_CALL: "tool_call",
  STATUS: "status",
  ERROR: "error",
  DONE: "done",
} as const;

export type TimelineEntryKind =
  (typeof TimelineEntryKind)[keyof typeof TimelineEntryKind];

export const TimelineEntryKindSchema = z.enum(TimelineEntryKind);

export const TimelineEntrySchema = z.object({
  id: z.string(),
  kind: TimelineEntryKindSchema,
  timestamp: z.number(),
  data: z.record(z.string(), z.unknown()),
});

export type TimelineEntry = z.infer<typeof TimelineEntrySchema>;

// ============================================================================
// Individual Host Event Schemas
// ============================================================================

export const SessionStateEventSchema = z.object({
  protocol: ProtocolVersionSchema,
  type: z.literal(HostEventType.SESSION_STATE),
  payload: z.object({
    sessionId: z.string(),
    status: SessionStatusSchema,
    metadata: SessionMetadataSchema.optional(),
    timeline: z.array(TimelineEntrySchema).optional(),
  }),
});

export type SessionStateEvent = z.infer<typeof SessionStateEventSchema>;

export const TextDeltaEventSchema = z.object({
  protocol: ProtocolVersionSchema,
  type: z.literal(HostEventType.TEXT_DELTA),
  payload: z.object({
    sessionId: z.string(),
    content: z.string(),
  }),
});

export type TextDeltaEvent = z.infer<typeof TextDeltaEventSchema>;

export const ToolStartedEventSchema = z.object({
  protocol: ProtocolVersionSchema,
  type: z.literal(HostEventType.TOOL_STARTED),
  payload: z.object({
    sessionId: z.string(),
    tool: z.string(),
    toolId: z.string().optional(),
    parameters: z.record(z.string(), z.unknown()).optional(),
  }),
});

export type ToolStartedEvent = z.infer<typeof ToolStartedEventSchema>;

export const ToolCompletedEventSchema = z.object({
  protocol: ProtocolVersionSchema,
  type: z.literal(HostEventType.TOOL_COMPLETED),
  payload: z.object({
    sessionId: z.string(),
    tool: z.string(),
    toolId: z.string().optional(),
    result: z.unknown().optional(),
    duration: z.number().optional(),
    success: z.boolean(),
    error: z.string().optional(),
  }),
});

export type ToolCompletedEvent = z.infer<typeof ToolCompletedEventSchema>;

export const ThinkingEventSchema = z.object({
  protocol: ProtocolVersionSchema,
  type: z.literal(HostEventType.THINKING),
  payload: z.object({
    sessionId: z.string(),
    content: z.string().optional(),
  }),
});

export type ThinkingEvent = z.infer<typeof ThinkingEventSchema>;

export const ErrorEventSchema = z.object({
  protocol: ProtocolVersionSchema,
  type: z.literal(HostEventType.ERROR),
  payload: z.object({
    sessionId: z.string().optional(),
    error: ProtocolErrorSchema,
  }),
});

export type ErrorEvent = z.infer<typeof ErrorEventSchema>;

export const SessionListEventSchema = z.object({
  protocol: ProtocolVersionSchema,
  type: z.literal(HostEventType.SESSION_LIST),
  payload: z.object({
    sessions: z.array(SessionSummarySchema),
  }),
});

export type SessionListEvent = z.infer<typeof SessionListEventSchema>;

export const SessionCompletedEventSchema = z.object({
  protocol: ProtocolVersionSchema,
  type: z.literal(HostEventType.SESSION_COMPLETED),
  payload: z.object({
    sessionId: z.string(),
    summary: z.string().optional(),
  }),
});

export type SessionCompletedEvent = z.infer<typeof SessionCompletedEventSchema>;

// ============================================================================
// Discriminated Union
// ============================================================================

export const HostEventSchema = z.discriminatedUnion("type", [
  SessionStateEventSchema,
  TextDeltaEventSchema,
  ToolStartedEventSchema,
  ToolCompletedEventSchema,
  ThinkingEventSchema,
  ErrorEventSchema,
  SessionListEventSchema,
  SessionCompletedEventSchema,
]);

export type HostEvent = z.infer<typeof HostEventSchema>;

// ============================================================================
// Host Event Constructor
// ============================================================================

type HostEventPayloadMap = {
  [HostEventType.SESSION_STATE]: SessionStateEvent["payload"];
  [HostEventType.TEXT_DELTA]: TextDeltaEvent["payload"];
  [HostEventType.TOOL_STARTED]: ToolStartedEvent["payload"];
  [HostEventType.TOOL_COMPLETED]: ToolCompletedEvent["payload"];
  [HostEventType.THINKING]: ThinkingEvent["payload"];
  [HostEventType.ERROR]: ErrorEvent["payload"];
  [HostEventType.SESSION_LIST]: SessionListEvent["payload"];
  [HostEventType.SESSION_COMPLETED]: SessionCompletedEvent["payload"];
};

/**
 * Create a validated host event message.
 */
export function createHostEvent<T extends HostEventType>(
  type: T,
  payload: HostEventPayloadMap[T]
): HostEvent {
  return HostEventSchema.parse({
    protocol: PROTOCOL_VERSION,
    type,
    payload,
  });
}
