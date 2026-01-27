import { z } from "zod";

// ============================================================================
// Base Entity
// ============================================================================

export const BaseEntitySchema = z.object({
  id: z.uuid(),
  createdAt: z.union([z.date(), z.number()]),
  updatedAt: z.union([z.date(), z.number()]),
});

export type BaseEntity = z.infer<typeof BaseEntitySchema>;

// ============================================================================
// Common API Response Schemas
// ============================================================================

export const PaginationMetaSchema = z.object({
  page: z.number(),
  limit: z.number(),
  total: z.number(),
  totalPages: z.number(),
});

export type PaginationMeta = z.infer<typeof PaginationMetaSchema>;

export const PaginationRequestSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export type PaginationRequest = z.infer<typeof PaginationRequestSchema>;

/**
 * Special type for cases where 'any' is absolutely necessary.
 * Use this sparingly and document why it's needed.
 */
// biome-ignore lint/suspicious/noExplicitAny: We need to use any for this type
export type $FixMe = any;

export const ApiResponseSchema = z.object({
  success: z.boolean(),
  data: z.unknown().optional(),
  error: z
    .object({
      code: z.string(),
      message: z.string(),
      details: z.unknown().optional(),
    })
    .optional(),
  meta: z
    .object({
      pagination: PaginationMetaSchema.optional(),
      timestamp: z.string(),
      path: z.string(),
    })
    .optional(),
});

export type ApiResponse<T = unknown> = {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
  meta?: {
    pagination?: PaginationMeta;
    timestamp: string;
    path: string;
  };
};

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
