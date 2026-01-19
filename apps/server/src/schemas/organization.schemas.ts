/**
 * Organization Schemas
 */

import { z } from "zod";

export const CreateOrganizationRequestSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  slug: z
    .string()
    .min(1, "Slug is required")
    .regex(/^[a-z0-9-]+$/, "Slug must be lowercase alphanumeric with hyphens"),
  avatarUrl: z.string().url("Invalid avatar URL").optional().or(z.literal("")),
});

export const UpdateOrganizationRequestSchema =
  CreateOrganizationRequestSchema.partial();

export const AddMemberRequestSchema = z.object({
  userId: z.string().uuid("Invalid User ID"),
  role: z.enum(["ADMIN", "MEMBER"]).default("MEMBER"),
});

export type CreateOrganizationRequest = z.infer<
  typeof CreateOrganizationRequestSchema
>;
export type UpdateOrganizationRequest = z.infer<
  typeof UpdateOrganizationRequestSchema
>;
export type AddMemberRequest = z.infer<typeof AddMemberRequestSchema>;
