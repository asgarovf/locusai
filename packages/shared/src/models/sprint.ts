import { z } from "zod";
import { BaseEntitySchema } from "../common";
import { SprintStatus } from "../enums";

export const SprintSchema = BaseEntitySchema.extend({
  workspaceId: z.uuid().nullable().optional(),
  name: z.string().min(1, "Name is required").max(100),
  status: z.enum(SprintStatus),
  startDate: z.union([z.date(), z.number()]).nullable().optional(),
  endDate: z.union([z.date(), z.number()]).nullable().optional(),
  mindmap: z.string().nullable().optional(),
  mindmapUpdatedAt: z.union([z.date(), z.number()]).nullable().optional(),
});

export type Sprint = z.infer<typeof SprintSchema>;

export const CreateSprintSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  startDate: z.union([z.string(), z.number()]).optional(),
  endDate: z.union([z.string(), z.number()]).optional(),
});

export type CreateSprint = z.infer<typeof CreateSprintSchema>;

export const UpdateSprintSchema = SprintSchema.partial()
  .omit({
    id: true,
    createdAt: true,
    updatedAt: true,
    startDate: true,
    endDate: true,
    mindmapUpdatedAt: true,
  })
  .extend({
    name: z.string().min(1).max(100).optional(),
    startDate: z.union([z.string(), z.number()]).optional().nullable(),
    endDate: z.union([z.string(), z.number()]).optional().nullable(),
    mindmapUpdatedAt: z.union([z.string(), z.number()]).optional().nullable(),
  });

export type UpdateSprint = z.infer<typeof UpdateSprintSchema>;

// ============================================================================
// Parameter & Query Schemas
// ============================================================================

export const SprintIdParamSchema = z.object({
  id: z.string().uuid("Invalid Sprint ID"),
});

export type SprintIdParam = z.infer<typeof SprintIdParamSchema>;

export const SprintQuerySchema = z.object({});

export type SprintQuery = z.infer<typeof SprintQuerySchema>;

// ============================================================================
// Response Schemas
// ============================================================================

export const SprintResponseSchema = z.object({
  sprint: SprintSchema,
});

export type SprintResponse = z.infer<typeof SprintResponseSchema>;

export const SprintsResponseSchema = z.object({
  sprints: z.array(SprintSchema),
});

export type SprintsResponse = z.infer<typeof SprintsResponseSchema>;
