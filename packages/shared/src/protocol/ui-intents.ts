import { z } from "zod";
import { ContextPayloadSchema } from "./context";
import { PROTOCOL_VERSION, ProtocolVersionSchema } from "./envelope";

// ============================================================================
// UI Intent Types (Webview → Host)
// ============================================================================

export const UIIntentType = {
  SUBMIT_PROMPT: "submit_prompt",
  STOP_SESSION: "stop_session",
  RESUME_SESSION: "resume_session",
  REQUEST_SESSIONS: "request_sessions",
  REQUEST_SESSION_DETAIL: "request_session_detail",
  CLEAR_SESSION: "clear_session",
  WEBVIEW_READY: "webview_ready",
} as const;

export type UIIntentType = (typeof UIIntentType)[keyof typeof UIIntentType];

export const UIIntentTypeSchema = z.enum(UIIntentType);

// ============================================================================
// Individual Intent Schemas
// ============================================================================

export const SubmitPromptIntentSchema = z.object({
  protocol: ProtocolVersionSchema,
  type: z.literal(UIIntentType.SUBMIT_PROMPT),
  payload: z.object({
    text: z.string().min(1),
    context: ContextPayloadSchema.optional(),
  }),
});

export type SubmitPromptIntent = z.infer<typeof SubmitPromptIntentSchema>;

export const StopSessionIntentSchema = z.object({
  protocol: ProtocolVersionSchema,
  type: z.literal(UIIntentType.STOP_SESSION),
  payload: z.object({
    sessionId: z.string(),
  }),
});

export type StopSessionIntent = z.infer<typeof StopSessionIntentSchema>;

export const ResumeSessionIntentSchema = z.object({
  protocol: ProtocolVersionSchema,
  type: z.literal(UIIntentType.RESUME_SESSION),
  payload: z.object({
    sessionId: z.string(),
  }),
});

export type ResumeSessionIntent = z.infer<typeof ResumeSessionIntentSchema>;

export const RequestSessionsIntentSchema = z.object({
  protocol: ProtocolVersionSchema,
  type: z.literal(UIIntentType.REQUEST_SESSIONS),
  payload: z.object({}).optional(),
});

export type RequestSessionsIntent = z.infer<typeof RequestSessionsIntentSchema>;

export const RequestSessionDetailIntentSchema = z.object({
  protocol: ProtocolVersionSchema,
  type: z.literal(UIIntentType.REQUEST_SESSION_DETAIL),
  payload: z.object({
    sessionId: z.string(),
  }),
});

export type RequestSessionDetailIntent = z.infer<
  typeof RequestSessionDetailIntentSchema
>;

export const ClearSessionIntentSchema = z.object({
  protocol: ProtocolVersionSchema,
  type: z.literal(UIIntentType.CLEAR_SESSION),
  payload: z.object({
    sessionId: z.string(),
  }),
});

export type ClearSessionIntent = z.infer<typeof ClearSessionIntentSchema>;

export const WebviewReadyIntentSchema = z.object({
  protocol: ProtocolVersionSchema,
  type: z.literal(UIIntentType.WEBVIEW_READY),
  payload: z.object({}).optional(),
});

export type WebviewReadyIntent = z.infer<typeof WebviewReadyIntentSchema>;

// ============================================================================
// Discriminated Union
// ============================================================================

export const UIIntentSchema = z.discriminatedUnion("type", [
  SubmitPromptIntentSchema,
  StopSessionIntentSchema,
  ResumeSessionIntentSchema,
  RequestSessionsIntentSchema,
  RequestSessionDetailIntentSchema,
  ClearSessionIntentSchema,
  WebviewReadyIntentSchema,
]);

export type UIIntent = z.infer<typeof UIIntentSchema>;

// ============================================================================
// Intent Constructor
// ============================================================================

type IntentPayloadMap = {
  [UIIntentType.SUBMIT_PROMPT]: SubmitPromptIntent["payload"];
  [UIIntentType.STOP_SESSION]: StopSessionIntent["payload"];
  [UIIntentType.RESUME_SESSION]: ResumeSessionIntent["payload"];
  [UIIntentType.REQUEST_SESSIONS]: RequestSessionsIntent["payload"];
  [UIIntentType.REQUEST_SESSION_DETAIL]: RequestSessionDetailIntent["payload"];
  [UIIntentType.CLEAR_SESSION]: ClearSessionIntent["payload"];
  [UIIntentType.WEBVIEW_READY]: WebviewReadyIntent["payload"];
};

/**
 * Create a validated UI intent message.
 */
export function createUIIntent<T extends UIIntentType>(
  type: T,
  payload: IntentPayloadMap[T]
): UIIntent {
  return UIIntentSchema.parse({
    protocol: PROTOCOL_VERSION,
    type,
    payload,
  });
}
