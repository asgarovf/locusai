import { z } from "zod";
import { BaseEntitySchema } from "../common";

export const OrganizationSchema = BaseEntitySchema.extend({
  name: z.string().min(1, "Name is required").max(100),
  avatarUrl: z
    .string()
    .url("Invalid avatar URL")
    .nullable()
    .optional()
    .or(z.literal("")),
});

export type Organization = z.infer<typeof OrganizationSchema>;

export const CreateOrganizationSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  avatarUrl: z.string().url("Invalid avatar URL").optional().or(z.literal("")),
});

export type CreateOrganization = z.infer<typeof CreateOrganizationSchema>;

export const UpdateOrganizationSchema = OrganizationSchema.partial().omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type UpdateOrganization = z.infer<typeof UpdateOrganizationSchema>;

export const AddMemberSchema = z.object({
  userId: z.string().uuid("Invalid User ID"),
  role: z.enum(["ADMIN", "MEMBER"]).default("MEMBER"),
});

export type AddMember = z.infer<typeof AddMemberSchema>;

export const MembershipWithUserSchema = z.object({
  id: z.uuid(),
  userId: z.uuid(),
  orgId: z.uuid(),
  role: z.string(),
  createdAt: z.number(),
  user: z.object({
    id: z.uuid(),
    email: z.string().email(),
    name: z.string(),
    avatarUrl: z.string().url().nullable().optional(),
  }),
});

export type MembershipWithUser = z.infer<typeof MembershipWithUserSchema>;

// ============================================================================
// Parameter & Query Schemas
// ============================================================================

export const OrgIdParamSchema = z.object({
  orgId: z.string().uuid("Invalid Organization ID"),
});

export type OrgIdParam = z.infer<typeof OrgIdParamSchema>;

export const MembershipIdParamSchema = z.object({
  id: z.string().uuid("Invalid Membership ID"),
});

export type MembershipIdParam = z.infer<typeof MembershipIdParamSchema>;

// ============================================================================
// Response Schemas
// ============================================================================

export const OrganizationResponseSchema = z.object({
  organization: OrganizationSchema,
});

export type OrganizationResponse = z.infer<typeof OrganizationResponseSchema>;

export const OrganizationsResponseSchema = z.object({
  organizations: z.array(OrganizationSchema),
});

export type OrganizationsResponse = z.infer<typeof OrganizationsResponseSchema>;

export const MembersResponseSchema = z.object({
  members: z.array(MembershipWithUserSchema),
});

export type MembersResponse = z.infer<typeof MembersResponseSchema>;

export const MembershipResponseSchema = z.object({
  membership: MembershipWithUserSchema,
});

export type MembershipResponse = z.infer<typeof MembershipResponseSchema>;
