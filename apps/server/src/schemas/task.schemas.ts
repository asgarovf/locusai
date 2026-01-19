/**
 * Task Schemas
 */

import { AssigneeRole, TaskPriority, TaskStatus } from "@locusai/shared";
import { z } from "zod";

// ============================================================================
// Shared
// ============================================================================

export const AcceptanceItemSchema = z.object({
  id: z.string(),
  text: z.string(),
  done: z.boolean(),
});

// ============================================================================
// Request Schemas
// ============================================================================

export const CreateTaskRequestSchema = z.object({
  projectId: z.string().optional(),
  title: z.string().min(1, "Title is required").max(200),
  description: z.string().optional(),
  status: z.nativeEnum(TaskStatus).default(TaskStatus.BACKLOG),
  priority: z.nativeEnum(TaskPriority).default(TaskPriority.MEDIUM),
  labels: z.array(z.string()).default([]),
  assigneeRole: z.nativeEnum(AssigneeRole).optional().nullable(),
  parentId: z.number().optional().nullable(),
  sprintId: z.number().optional().nullable(),
  acceptanceChecklist: z.array(AcceptanceItemSchema).optional(),
});

export const UpdateTaskRequestSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().optional(),
  status: z.nativeEnum(TaskStatus).optional(),
  priority: z.nativeEnum(TaskPriority).optional(),
  labels: z.array(z.string()).optional(),
  assigneeRole: z.nativeEnum(AssigneeRole).optional().nullable(),
  parentId: z.number().optional().nullable(),
  sprintId: z.number().optional().nullable(),
  acceptanceChecklist: z.array(AcceptanceItemSchema).optional(),
});

export const AddCommentRequestSchema = z.object({
  author: z.string().min(1, "Author is required"),
  text: z.string().min(1, "Comment text is required"),
});

export const DispatchTaskRequestSchema = z.object({
  workerId: z.string().optional(),
  sprintId: z.coerce.number().int().min(1, "Invalid sprint ID"),
});

export const LockTaskRequestSchema = z.object({
  agentId: z.string().min(1),
  ttlSeconds: z.number().int().positive().default(3600),
});

export const UnlockTaskRequestSchema = z.object({
  agentId: z.string().min(1),
});

// ============================================================================
// Type Exports
// ============================================================================

export type CreateTaskRequest = z.infer<typeof CreateTaskRequestSchema>;
export type UpdateTaskRequest = z.infer<typeof UpdateTaskRequestSchema>;
export type AddCommentRequest = z.infer<typeof AddCommentRequestSchema>;
export type DispatchTaskRequest = z.infer<typeof DispatchTaskRequestSchema>;
export type LockTaskRequest = z.infer<typeof LockTaskRequestSchema>;
export type UnlockTaskRequest = z.infer<typeof UnlockTaskRequestSchema>;
