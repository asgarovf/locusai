/**
 * Common Response Schemas
 *
 * Shared response structures used across the API.
 */

import { z } from "zod";

// ============================================================================
// Success Response
// ============================================================================

export const SuccessResponseSchema = z.object({
  success: z.literal(true),
  message: z.string().optional(),
});

// ============================================================================
// Error Response
// ============================================================================

export const ErrorResponseSchema = z.object({
  success: z.literal(false),
  error: z.object({
    code: z.string(),
    message: z.string(),
    details: z.record(z.unknown()).optional(),
  }),
});

// ============================================================================
// Pagination
// ============================================================================

export const PaginationRequestSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export const PaginationMetaSchema = z.object({
  page: z.number(),
  limit: z.number(),
  total: z.number(),
  totalPages: z.number(),
});

export function createPaginatedResponseSchema<T extends z.ZodTypeAny>(
  itemSchema: T
) {
  return z.object({
    success: z.literal(true),
    data: z.array(itemSchema),
    pagination: PaginationMetaSchema,
  });
}

// ============================================================================
// Type Exports
// ============================================================================

export type SuccessResponse = z.infer<typeof SuccessResponseSchema>;
export type ErrorResponse = z.infer<typeof ErrorResponseSchema>;
export type PaginationRequest = z.infer<typeof PaginationRequestSchema>;
export type PaginationMeta = z.infer<typeof PaginationMetaSchema>;
