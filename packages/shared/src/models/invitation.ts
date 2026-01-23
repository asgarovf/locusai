import { z } from "zod";
import { BaseEntitySchema } from "../common.js";
import { MembershipRole } from "../enums.js";

export const InvitationSchema = BaseEntitySchema.extend({
  orgId: z.string().uuid("Invalid Organization ID"),
  email: z.string().email("Invalid email address"),
  role: z.nativeEnum(MembershipRole),
  token: z.string(),
  expiresAt: z.number(),
  acceptedAt: z.number().nullable().optional(),
  invitedBy: z.string().uuid(),
});

export type Invitation = z.infer<typeof InvitationSchema>;

export const CreateInvitationSchema = z.object({
  orgId: z.string().uuid("Invalid Organization ID"),
  email: z.string().email("Invalid email address"),
  role: z.nativeEnum(MembershipRole).default(MembershipRole.MEMBER),
});

export type CreateInvitation = z.infer<typeof CreateInvitationSchema>;

export const AcceptInvitationSchema = z.object({
  token: z.string().min(1, "Invitation token is required"),
  name: z.string().min(1, "Name is required").optional(),
});

export type AcceptInvitation = z.infer<typeof AcceptInvitationSchema>;

// ============================================================================
// Parameter & Query Schemas
// ============================================================================

export const InvitationIdParamSchema = z.object({
  id: z.string().uuid("Invalid Invitation ID"),
});

export type InvitationIdParam = z.infer<typeof InvitationIdParamSchema>;

export const InvitationVerifyParamSchema = z.object({
  token: z.string().min(1, "Token required"),
});

export type InvitationVerifyParam = z.infer<typeof InvitationVerifyParamSchema>;

export const InvitationQuerySchema = z.object({
  orgId: z.string().uuid("Invalid Organization ID").optional(),
});

export type InvitationQuery = z.infer<typeof InvitationQuerySchema>;

// ============================================================================
// Response Schemas
// ============================================================================

export const InvitationResponseSchema = z.object({
  invitation: InvitationSchema,
  userExists: z.boolean().optional(),
});

export type InvitationResponse = z.infer<typeof InvitationResponseSchema>;

export const InvitationsResponseSchema = z.object({
  invitations: z.array(InvitationSchema),
});

export type InvitationsResponse = z.infer<typeof InvitationsResponseSchema>;

export const AcceptInvitationResponseSchema = z.object({
  membership: z.object({
    id: z.string().uuid(),
    userId: z.string().uuid(),
    orgId: z.string().uuid(),
    role: z.nativeEnum(MembershipRole),
    createdAt: z.number(),
  }),
});

export type AcceptInvitationResponse = z.infer<
  typeof AcceptInvitationResponseSchema
>;
