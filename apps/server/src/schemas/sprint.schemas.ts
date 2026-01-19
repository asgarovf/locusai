/**
 * Sprint Schemas
 */

import { SprintStatus } from "@locusai/shared";
import { z } from "zod";

// ============================================================================
// Request Schemas
// ============================================================================

export const CreateSprintRequestSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  projectId: z.string().optional(),
});

export const UpdateSprintRequestSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  status: z.nativeEnum(SprintStatus).optional(),
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
});

// ============================================================================
// Type Exports
// ============================================================================

export type CreateSprintRequest = z.infer<typeof CreateSprintRequestSchema>;
export type UpdateSprintRequest = z.infer<typeof UpdateSprintRequestSchema>;
