import { z } from "zod";
import { BaseEntitySchema } from "../common";
import { AssigneeRole, TaskPriority, TaskStatus } from "../enums";
import { ArtifactSchema, CommentSchema, EventSchema } from "./activity";
import { DocSchema } from "./doc";

export const AcceptanceItemSchema = z.object({
  id: z.string(),
  text: z.string(),
  done: z.boolean(),
});

export type AcceptanceItem = z.infer<typeof AcceptanceItemSchema>;

export const TaskSchema = BaseEntitySchema.extend({
  workspaceId: z.string().uuid().nullable().optional(),
  title: z.string().min(1, "Title is required").max(200),
  description: z.string().default(""),
  status: z.nativeEnum(TaskStatus).default(TaskStatus.BACKLOG),
  priority: z.nativeEnum(TaskPriority).default(TaskPriority.MEDIUM),
  labels: z.array(z.string()).default([]),
  assigneeRole: z.nativeEnum(AssigneeRole).nullable().optional(),
  assignedTo: z.string().uuid().nullable().optional(),
  sprintId: z.string().uuid().nullable().optional(),
  parentId: z.string().uuid().nullable().optional(),
  dueDate: z.union([z.date(), z.number()]).nullable().optional(),
  lockedBy: z.string().nullable().optional(),
  lockExpiresAt: z.union([z.date(), z.number()]).nullable().optional(),
  acceptanceChecklist: z.array(AcceptanceItemSchema).default([]),
  comments: z.array(CommentSchema).default([]),
  artifacts: z.array(ArtifactSchema).default([]),
  activityLog: z.array(EventSchema).default([]),
  docs: z.array(DocSchema).default([]),
});

export type Task = z.infer<typeof TaskSchema>;

export const CreateTaskSchema = z.object({
  title: z.string().min(1, "Title is required").max(200),
  description: z.string().optional().default(""),
  status: z.nativeEnum(TaskStatus).optional().default(TaskStatus.BACKLOG),
  priority: z.nativeEnum(TaskPriority).optional().default(TaskPriority.MEDIUM),
  labels: z.array(z.string()).optional().default([]),
  assigneeRole: z.nativeEnum(AssigneeRole).optional(),
  parentId: z.string().uuid().nullable().optional(),
  sprintId: z.string().uuid().nullable().optional(),
  acceptanceChecklist: z.array(AcceptanceItemSchema).optional(),
  docIds: z.array(z.string().uuid()).optional(),
});

export type CreateTask = z.infer<typeof CreateTaskSchema>;

export const UpdateTaskSchema = TaskSchema.partial()
  .omit({
    id: true,
    workspaceId: true,
    createdAt: true,
    updatedAt: true,
  })
  .extend({
    title: z.string().min(1).max(200).optional(),
    acceptanceChecklist: z.array(AcceptanceItemSchema).optional(),
    docIds: z.array(z.string().uuid()).optional(),
  });

export type UpdateTask = z.infer<typeof UpdateTaskSchema>;

export const AddCommentSchema = z.object({
  author: z.string().min(1, "Author is required"),
  text: z.string().min(1, "Comment text is required"),
});

export type AddComment = z.infer<typeof AddCommentSchema>;

export const DispatchTaskSchema = z.object({
  workerId: z.string().optional(),
  sprintId: z.string().uuid(),
});

export type DispatchTask = z.infer<typeof DispatchTaskSchema>;

export const LockTaskSchema = z.object({
  agentId: z.string().min(1),
  ttlSeconds: z.number().int().positive().default(3600),
});

export type LockTask = z.infer<typeof LockTaskSchema>;

export const UnlockTaskSchema = z.object({
  agentId: z.string().min(1),
});

export type UnlockTask = z.infer<typeof UnlockTaskSchema>;

// ============================================================================
// Parameter & Query Schemas
// ============================================================================

export const TaskIdParamSchema = z.object({
  id: z.string().uuid("Invalid Task ID"),
});

export type TaskIdParam = z.infer<typeof TaskIdParamSchema>;

export const TaskQuerySchema = z.object({});

export type TaskQuery = z.infer<typeof TaskQuerySchema>;

// ============================================================================
// Response Schemas
// ============================================================================

export const TaskResponseSchema = z.object({
  task: TaskSchema,
});

export type TaskResponse = z.infer<typeof TaskResponseSchema>;

export const TasksResponseSchema = z.object({
  tasks: z.array(TaskSchema),
});

export type TasksResponse = z.infer<typeof TasksResponseSchema>;
