/**
 * Project Schemas
 */

import { z } from "zod";

export const CreateProjectRequestSchema = z.object({
  orgId: z.string().uuid("Invalid Organization ID"),
  name: z.string().min(1, "Name is required").max(100),
  slug: z
    .string()
    .min(1, "Slug is required")
    .regex(/^[a-z0-9-]+$/, "Slug must be lowercase alphanumeric with hyphens"),
  description: z.string().optional(),
  repoUrl: z
    .string()
    .url("Invalid repository URL")
    .optional()
    .or(z.literal("")),
});

export const UpdateProjectRequestSchema =
  CreateProjectRequestSchema.partial().omit({ orgId: true });

export type CreateProjectRequest = z.infer<typeof CreateProjectRequestSchema>;
export type UpdateProjectRequest = z.infer<typeof UpdateProjectRequestSchema>;
