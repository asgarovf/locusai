import { z } from "zod";
import { BaseEntitySchema } from "../common";
import { AwsRegion, InstanceStatus } from "../enums";

// ============================================================================
// Enums
// ============================================================================

export enum InstanceAction {
  START = "START",
  STOP = "STOP",
  TERMINATE = "TERMINATE",
}

// ============================================================================
// Schemas
// ============================================================================

export const AwsCredentialsSchema = z.object({
  accessKeyId: z.string().min(1),
  secretAccessKey: z.string().min(1),
  region: z.enum(AwsRegion).default(AwsRegion.US_EAST_1),
});

export type AwsCredentials = z.infer<typeof AwsCredentialsSchema>;

export const IntegrationSchema = z.object({
  name: z.string(),
  config: z.record(z.string(), z.string()),
});

export type Integration = z.infer<typeof IntegrationSchema>;

export const AwsInstanceSchema = BaseEntitySchema.extend({
  workspaceId: z.uuid(),
  instanceId: z.string(),
  status: z.enum(InstanceStatus),
  instanceType: z.enum(["t3.micro", "t3.small", "t3.medium"]),
  region: z.enum(AwsRegion).default(AwsRegion.US_EAST_1),
  publicIp: z.string().nullable().optional(),
  launchTime: z.union([z.date(), z.number()]).nullable().optional(),
  repoUrl: z.string().nullable().optional(),
  integrations: z.array(IntegrationSchema).default([]),
});

export type AwsInstance = z.infer<typeof AwsInstanceSchema>;

export const CreateAwsInstanceSchema = z.object({
  workspaceId: z.uuid(),
  instanceType: z
    .enum(["t3.micro", "t3.small", "t3.medium"])
    .default("t3.micro"),
  region: z.enum(AwsRegion).default(AwsRegion.US_EAST_1),
  repoUrl: z.string().optional(),
  integrations: z.array(IntegrationSchema).optional().default([]),
});

export type CreateAwsInstance = z.infer<typeof CreateAwsInstanceSchema>;

export const UpdateAwsInstanceSchema = z.object({
  status: z.enum(InstanceStatus).optional(),
  instanceType: z.enum(["t3.micro", "t3.small", "t3.medium"]).optional(),
  publicIp: z.string().nullable().optional(),
  launchTime: z.union([z.date(), z.number()]).nullable().optional(),
  repoUrl: z.string().nullable().optional(),
  integrations: z.array(IntegrationSchema).optional(),
});

export type UpdateAwsInstance = z.infer<typeof UpdateAwsInstanceSchema>;

export const SaveAwsCredentialsSchema = z.object({
  accessKeyId: z.string().min(16),
  secretAccessKey: z.string().min(1),
  region: z.string().default("us-east-1"),
});

export type SaveAwsCredentials = z.infer<typeof SaveAwsCredentialsSchema>;

// ============================================================================
// Provisioning & Actions
// ============================================================================

export const ProvisionAwsInstanceSchema = z.object({
  repoUrl: z.string().min(1),
  githubToken: z.string().min(1),
  instanceType: z
    .enum(["t3.micro", "t3.small", "t3.medium"])
    .default("t3.small"),
  integrations: z.array(IntegrationSchema).optional().default([]),
});

export type ProvisionAwsInstance = z.infer<typeof ProvisionAwsInstanceSchema>;

export const InstanceActionBodySchema = z.object({
  action: z.nativeEnum(InstanceAction),
});

export type InstanceActionBody = z.infer<typeof InstanceActionBodySchema>;

export const InstanceIdParamSchema = z.object({
  workspaceId: z.string().uuid("Invalid Workspace ID"),
  instanceId: z.string().uuid("Invalid Instance ID"),
});

export type InstanceIdParam = z.infer<typeof InstanceIdParamSchema>;

// ============================================================================
// Security
// ============================================================================

const CIDR_REGEX = /^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\/\d{1,2}$/;

export const UpdateSecurityRulesSchema = z.object({
  allowedIps: z.array(
    z.string().regex(CIDR_REGEX, "Invalid CIDR format (e.g. 1.2.3.4/32)")
  ),
});

export type UpdateSecurityRules = z.infer<typeof UpdateSecurityRulesSchema>;
