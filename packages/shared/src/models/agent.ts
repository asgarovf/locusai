import { z } from "zod";

export const LockSchema = z.object({
  agentId: z.string().min(1),
  ttlSeconds: z.number().positive(),
});

export const UnlockSchema = z.object({
  agentId: z.string().min(1),
});

export type Lock = z.infer<typeof LockSchema>;
export type Unlock = z.infer<typeof UnlockSchema>;

// ============================================================================
// Agent Heartbeat
// ============================================================================

export const AgentHeartbeatSchema = z.object({
  agentId: z.string().min(1),
  currentTaskId: z.string().uuid().nullable().optional(),
  status: z
    .enum(["IDLE", "WORKING", "COMPLETED", "FAILED"])
    .optional()
    .default("WORKING"),
});

export type AgentHeartbeat = z.infer<typeof AgentHeartbeatSchema>;

export const AgentRegistrationResponse = z.object({
  agentId: z.string(),
  workspaceId: z.string(),
  currentTaskId: z.string().nullable(),
  status: z.string(),
  lastHeartbeat: z.string(),
  createdAt: z.string(),
});

export type AgentRegistrationInfo = z.infer<typeof AgentRegistrationResponse>;

export const AgentsListResponse = z.object({
  agents: z.array(AgentRegistrationResponse),
});

export type AgentsList = z.infer<typeof AgentsListResponse>;
