import { z } from "zod";
import { BaseEntitySchema } from "../common";

// Forward declaration for circular reference
export const DocGroupSchemaForDoc = z.object({
  id: z.string().uuid(),
  name: z.string(),
});

export const DocSchema = BaseEntitySchema.extend({
  workspaceId: z.string().uuid(),
  groupId: z.string().uuid().nullable().optional(),
  title: z.string().min(1, "Title is required"),
  content: z.string().default(""),
  group: DocGroupSchemaForDoc.nullable().optional(),
});

export type Doc = z.infer<typeof DocSchema>;

export const CreateDocSchema = z.object({
  title: z.string().min(1, "Title is required"),
  content: z.string().optional(),
  groupId: z.string().uuid().optional(),
});

export type CreateDoc = z.infer<typeof CreateDocSchema>;

export const UpdateDocSchema = z.object({
  title: z.string().min(1).optional(),
  content: z.string().optional(),
  groupId: z.string().uuid().nullable().optional(),
});

export type UpdateDoc = z.infer<typeof UpdateDocSchema>;

// ============================================================================
// Response Schemas
// ============================================================================

export const DocResponseSchema = z.object({
  doc: DocSchema,
});

export type DocResponse = z.infer<typeof DocResponseSchema>;

export const DocsResponseSchema = z.object({
  docs: z.array(DocSchema),
});

export type DocsResponse = z.infer<typeof DocsResponseSchema>;

// ============================================================================
// Parameter & Query Schemas
// ============================================================================

export const DocIdParamSchema = z.object({
  id: z.string().uuid("Invalid Doc ID"),
});

export type DocIdParam = z.infer<typeof DocIdParamSchema>;

export const DocQuerySchema = z.object({
  workspaceId: z.string().uuid("Invalid Workspace ID").optional(),
});

export type DocQuery = z.infer<typeof DocQuerySchema>;
