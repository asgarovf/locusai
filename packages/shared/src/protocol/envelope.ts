import { z } from "zod";

// ============================================================================
// Protocol Version
// ============================================================================

/** Current protocol version. Increment on breaking changes. */
export const PROTOCOL_VERSION = 1 as const;

export const ProtocolVersionSchema = z.literal(PROTOCOL_VERSION);

// ============================================================================
// Protocol Envelope
// ============================================================================

/**
 * Base envelope wrapping all host↔webview messages.
 * Every message includes `protocol` for forward compatibility.
 */
export const ProtocolEnvelopeSchema = z.object({
  protocol: ProtocolVersionSchema,
  type: z.string(),
});

export type ProtocolEnvelope = z.infer<typeof ProtocolEnvelopeSchema>;
