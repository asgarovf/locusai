import { z } from "zod";
import {
  AssigneeRole,
  MembershipRole,
  TaskPriority,
  TaskStatus,
  UserRole,
} from "./types";

// ============================================================================
// Multi-tenancy Schemas
// ============================================================================

export const OrganizationSchema = z.object({
  name: z.string().min(1).max(100),
  slug: z
    .string()
    .min(1)
    .max(50)
    .regex(/^[a-z0-9-]+$/),
});

export const OrganizationUpdateSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  avatarUrl: z.string().url().optional().nullable(),
});

export const ProjectSchema = z.object({
  orgId: z.string().uuid(),
  name: z.string().min(1).max(100),
  slug: z
    .string()
    .min(1)
    .max(50)
    .regex(/^[a-z0-9-]+$/),
  description: z.string().max(500).optional(),
  repoUrl: z.string().url().optional(),
});

export const ProjectUpdateSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional().nullable(),
  repoUrl: z.string().url().optional().nullable(),
});

export const UserSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1).max(100),
  avatarUrl: z.string().url().optional(),
  role: z.nativeEnum(UserRole).optional().default(UserRole.USER),
});

export const MembershipSchema = z.object({
  userId: z.string().uuid(),
  orgId: z.string().uuid(),
  role: z.nativeEnum(MembershipRole).default(MembershipRole.MEMBER),
});

export const APIKeySchema = z.object({
  projectId: z.string().uuid(),
  name: z.string().min(1).max(100),
  expiresAt: z.number().optional(),
});

export const DocumentSchema = z.object({
  projectId: z.string().uuid(),
  path: z.string().min(1).max(500),
  title: z.string().min(1).max(200),
  content: z.string(),
});

export const DocumentUpdateSchema = z.object({
  path: z.string().min(1).max(500).optional(),
  title: z.string().min(1).max(200).optional(),
  content: z.string().optional(),
});

// ============================================================================
// Task & Sprint Schemas
// ============================================================================

export const TaskSchema = z.object({
  projectId: z.string().uuid().optional(), // Optional for local mode
  title: z.string().min(1),
  description: z.string().optional().default(""),
  status: z.nativeEnum(TaskStatus).optional().default(TaskStatus.BACKLOG),
  priority: z.nativeEnum(TaskPriority).optional().default(TaskPriority.MEDIUM),
  labels: z.array(z.string()).optional().default([]),
  assigneeRole: z.nativeEnum(AssigneeRole).optional(),
  parentId: z.number().optional().nullable(),
  sprintId: z.number().optional().nullable(),
});

export const TaskUpdateSchema = z.object({
  title: z.string().optional(),
  description: z.string().optional(),
  labels: z.array(z.string()).optional(),
  status: z.nativeEnum(TaskStatus).optional(),
  priority: z.nativeEnum(TaskPriority).optional(),
  assigneeRole: z.nativeEnum(AssigneeRole).optional(),
  parentId: z.number().optional().nullable(),
  acceptanceChecklist: z
    .array(
      z.object({
        id: z.string(),
        text: z.string(),
        done: z.boolean(),
      })
    )
    .optional(),
});

export const SprintSchema = z.object({
  projectId: z.string().uuid().optional(), // Optional for local mode
  name: z.string().min(1).max(100),
  startDate: z.number().optional(),
  endDate: z.number().optional(),
});

// ============================================================================
// Other Schemas
// ============================================================================

export const CommentSchema = z.object({
  author: z.string().min(1),
  text: z.string().min(1),
});

export const LockSchema = z.object({
  agentId: z.string().min(1),
  ttlSeconds: z.number().positive(),
});

export const UnlockSchema = z.object({
  agentId: z.string().min(1),
});

export const ArtifactSchema = z.object({
  type: z.string().min(1),
  title: z.string().min(1),
  contentText: z.string().optional(),
  fileBase64: z.string().optional(),
  fileName: z.string().optional(),
  createdBy: z.string().min(1),
});

export const CiRunSchema = z.object({
  taskId: z.number(),
  preset: z.string().min(1),
});

export const DocWriteSchema = z.object({
  path: z.string().min(1),
  content: z.string(),
});

export const DocSearchSchema = z.object({
  query: z.string().min(1),
});
