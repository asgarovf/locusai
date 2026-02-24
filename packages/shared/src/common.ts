import { z } from "zod";

/**
 * Special type for cases where 'any' is absolutely necessary.
 * Use this sparingly and document why it's needed.
 */
// biome-ignore lint/suspicious/noExplicitAny: We need to use any for this type
export type $FixMe = any;

export const SuccessResponseSchema = z.object({
  success: z.literal(true),
  message: z.string().optional(),
});

export const ErrorResponseSchema = z.object({
  success: z.literal(false),
  error: z.object({
    code: z.string(),
    message: z.string(),
    details: z.unknown().optional(),
  }),
});

// ============================================================================
// Utility Types
// ============================================================================

export type SuccessResponse = z.infer<typeof SuccessResponseSchema>;
export type ErrorResponse = z.infer<typeof ErrorResponseSchema>;

/**
 * Generates a standard v4 UUID
 */
export function generateUUID(): string {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}
