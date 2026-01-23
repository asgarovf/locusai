import { z } from "zod";
import { BaseEntitySchema } from "../common.js";

export const ChecklistItemSchema = z.object({
  id: z.string(),
  text: z.string(),
  done: z.boolean(),
});

export type ChecklistItem = z.infer<typeof ChecklistItemSchema>;

export const WorkspaceSchema = BaseEntitySchema.extend({
  orgId: z.string().uuid(),
  name: z.string().min(1, "Name is required").max(100),
  defaultChecklist: z.array(ChecklistItemSchema).nullable().optional(),
});

export type Workspace = z.infer<typeof WorkspaceSchema>;

export const CreateWorkspaceSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
});

export type CreateWorkspace = z.infer<typeof CreateWorkspaceSchema>;

export const UpdateWorkspaceSchema = WorkspaceSchema.partial().omit({
  id: true,
  orgId: true,
  createdAt: true,
  updatedAt: true,
});

export type UpdateWorkspace = z.infer<typeof UpdateWorkspaceSchema>;

export const AddWorkspaceMemberSchema = z.object({
  userId: z.string().uuid("Invalid User ID"),
  role: z.string().optional(),
});

export type AddWorkspaceMember = z.infer<typeof AddWorkspaceMemberSchema>;

// ============================================================================
// Parameter & Query Schemas
// ============================================================================

export const WorkspaceIdParamSchema = z.object({
  workspaceId: z.string().uuid("Invalid Workspace ID"),
});

export type WorkspaceIdParam = z.infer<typeof WorkspaceIdParamSchema>;

export const WorkspaceAndUserParamSchema = z.object({
  workspaceId: z.string().uuid("Invalid Workspace ID"),
  userId: z.string().uuid("Invalid User ID"),
});

export type WorkspaceAndUserParam = z.infer<typeof WorkspaceAndUserParamSchema>;

// ============================================================================
// Response Schemas
// ============================================================================

export const WorkspaceResponseSchema = z.object({
  workspace: WorkspaceSchema,
});

export type WorkspaceResponse = z.infer<typeof WorkspaceResponseSchema>;

export const WorkspacesResponseSchema = z.object({
  workspaces: z.array(WorkspaceSchema),
});

export type WorkspacesResponse = z.infer<typeof WorkspacesResponseSchema>;

export const WorkspaceStatsSchema = z.object({
  workspaceName: z.string(),
  taskCounts: z.record(z.string(), z.number()),
  memberCount: z.number(),
});

export type WorkspaceStats = z.infer<typeof WorkspaceStatsSchema>;

export const WorkspaceStatsResponseSchema = z.object({
  stats: WorkspaceStatsSchema,
});

export type WorkspaceStatsResponse = z.infer<
  typeof WorkspaceStatsResponseSchema
>;
