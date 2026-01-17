import { z } from "zod";
import { AssigneeRole, TaskPriority, TaskStatus } from "./types";

export const TaskSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional().default(""),
  status: z.nativeEnum(TaskStatus).optional().default(TaskStatus.BACKLOG),
  priority: z.nativeEnum(TaskPriority).optional().default(TaskPriority.MEDIUM),
  labels: z.array(z.string()).optional().default([]),
  assigneeRole: z.nativeEnum(AssigneeRole).optional(),
  parentId: z.number().optional().nullable(),
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
