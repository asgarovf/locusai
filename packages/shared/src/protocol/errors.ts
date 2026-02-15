import { z } from "zod";

// ============================================================================
// Error Codes
// ============================================================================

export const ProtocolErrorCode = {
  CLI_NOT_FOUND: "CLI_NOT_FOUND",
  AUTH_EXPIRED: "AUTH_EXPIRED",
  NETWORK_TIMEOUT: "NETWORK_TIMEOUT",
  CONTEXT_LIMIT: "CONTEXT_LIMIT",
  MALFORMED_EVENT: "MALFORMED_EVENT",
  PROCESS_CRASHED: "PROCESS_CRASHED",
  SESSION_NOT_FOUND: "SESSION_NOT_FOUND",
  UNKNOWN: "UNKNOWN",
} as const;

export type ProtocolErrorCode =
  (typeof ProtocolErrorCode)[keyof typeof ProtocolErrorCode];

export const ProtocolErrorCodeSchema = z.enum(ProtocolErrorCode);

// ============================================================================
// Structured Error Envelope
// ============================================================================

/**
 * Structured error payload for protocol error events.
 * Mirrors the pattern from common.ts ErrorResponseSchema but scoped
 * to host↔webview protocol.
 */
export const ProtocolErrorSchema = z.object({
  code: ProtocolErrorCodeSchema,
  message: z.string(),
  details: z.unknown().optional(),
  recoverable: z.boolean(),
});

export type ProtocolError = z.infer<typeof ProtocolErrorSchema>;
