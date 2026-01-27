import { z } from "zod";
import { BaseEntitySchema } from "../common";

export const DocGroupSchema = BaseEntitySchema.extend({
  workspaceId: z.uuid(),
  name: z.string().min(1, "Name is required"),
  order: z.number().default(0),
});

export type DocGroup = z.infer<typeof DocGroupSchema>;

export const CreateDocGroupSchema = z.object({
  name: z.string().min(1, "Name is required"),
  order: z.number().optional(),
});

export type CreateDocGroup = z.infer<typeof CreateDocGroupSchema>;

export const UpdateDocGroupSchema = z.object({
  name: z.string().min(1).optional(),
  order: z.number().optional(),
});

export type UpdateDocGroup = z.infer<typeof UpdateDocGroupSchema>;

export const DocGroupResponseSchema = z.object({
  group: DocGroupSchema,
});

export type DocGroupResponse = z.infer<typeof DocGroupResponseSchema>;

export const DocGroupsResponseSchema = z.object({
  groups: z.array(DocGroupSchema),
});

export type DocGroupsResponse = z.infer<typeof DocGroupsResponseSchema>;

export const DocGroupIdParamSchema = z.object({
  id: z.string().uuid("Invalid Group ID"),
});

export type DocGroupIdParam = z.infer<typeof DocGroupIdParamSchema>;
