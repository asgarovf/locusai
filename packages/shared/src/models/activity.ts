import { z } from "zod";
import { BaseEntitySchema } from "../common";
import { EventType, SprintStatus, TaskStatus } from "../enums";

export const CommentSchema = BaseEntitySchema.extend({
  taskId: z.uuid(),
  author: z.string().min(1),
  text: z.string().min(1),
});

export type Comment = z.infer<typeof CommentSchema>;

export const ArtifactSchema = BaseEntitySchema.extend({
  taskId: z.uuid(),
  type: z.string().min(1),
  title: z.string().min(1),
  contentText: z.string().optional(),
  filePath: z.string().optional(),
  url: z.string().optional(),
  size: z.string().optional(),
  createdBy: z.string().min(1),
});

export type Artifact = z.infer<typeof ArtifactSchema>;

// ============================================================================
// Event Payloads
// ============================================================================

export const TaskCreatedPayloadSchema = z.object({
  title: z.string(),
});

export const TaskDeletedPayloadSchema = z.object({
  title: z.string(),
});

export const StatusChangedPayloadSchema = z.object({
  title: z.string(),
  oldStatus: z.enum(TaskStatus),
  newStatus: z.enum(TaskStatus),
});

export const CommentAddedPayloadSchema = z.object({
  title: z.string(),
  author: z.string(),
  text: z.string(),
});

export const WorkspaceCreatedPayloadSchema = z.object({
  name: z.string(),
});

export const MemberAddedPayloadSchema = z.object({
  userId: z.string(),
  role: z.string(),
});

export const MemberInvitedPayloadSchema = z.object({
  email: z.string(),
});

export const SprintCreatedPayloadSchema = z.object({
  name: z.string(),
  sprintId: z.uuid(),
});

export const SprintStatusChangedPayloadSchema = z.object({
  name: z.string(),
  sprintId: z.uuid(),
  oldStatus: z.enum(SprintStatus),
  newStatus: z.enum(SprintStatus),
});

export const ChecklistInitializedPayloadSchema = z.object({
  itemCount: z.number(),
});

export const CiRanPayloadSchema = z.object({
  preset: z.string(),
  ok: z.boolean(),
  summary: z.string(),
  source: z.string(),
  deferred: z.boolean(),
  processed: z.boolean(),
  commands: z.array(z.object({ cmd: z.string(), exitCode: z.number() })),
});

export const EventPayloadSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal(EventType.TASK_CREATED),
    payload: TaskCreatedPayloadSchema,
  }),
  z.object({
    type: z.literal(EventType.TASK_DELETED),
    payload: TaskDeletedPayloadSchema,
  }),
  z.object({
    type: z.literal(EventType.STATUS_CHANGED),
    payload: StatusChangedPayloadSchema,
  }),
  z.object({
    type: z.literal(EventType.COMMENT_ADDED),
    payload: CommentAddedPayloadSchema,
  }),
  z.object({
    type: z.literal(EventType.WORKSPACE_CREATED),
    payload: WorkspaceCreatedPayloadSchema,
  }),
  z.object({
    type: z.literal(EventType.MEMBER_ADDED),
    payload: MemberAddedPayloadSchema,
  }),
  z.object({
    type: z.literal(EventType.MEMBER_INVITED),
    payload: MemberInvitedPayloadSchema,
  }),
  z.object({
    type: z.literal(EventType.SPRINT_CREATED),
    payload: SprintCreatedPayloadSchema,
  }),
  z.object({
    type: z.literal(EventType.SPRINT_STATUS_CHANGED),
    payload: SprintStatusChangedPayloadSchema,
  }),
  z.object({
    type: z.literal(EventType.CHECKLIST_INITIALIZED),
    payload: ChecklistInitializedPayloadSchema,
  }),
  z.object({
    type: z.literal(EventType.CI_RAN),
    payload: CiRanPayloadSchema,
  }),
]);

export type EventPayload = z.infer<typeof EventPayloadSchema>;

export const EventSchema = z.object({
  id: z.string(),
  workspaceId: z.string(),
  taskId: z.uuid().optional().nullable(),
  userId: z.string().optional().nullable(),
  type: z.enum(EventType),
  payload: z.record(z.string(), z.unknown()),
  createdAt: z.union([z.date(), z.number()]),
});

export type Event = z.infer<typeof EventSchema>;

// ============================================================================
// Parameter & Query Schemas
// ============================================================================

export const ArtifactParamSchema = z.object({
  taskId: z.string().uuid("Invalid Task ID"),
  type: z.string().min(1, "Artifact type required"),
  filename: z.string().min(1, "Filename required"),
});

export type ArtifactParam = z.infer<typeof ArtifactParamSchema>;

export const TaskIdOnlyParamSchema = z.object({
  taskId: z.string().uuid("Invalid Task ID"),
});

export type TaskIdOnlyParam = z.infer<typeof TaskIdOnlyParamSchema>;

export const EventQuerySchema = z.object({
  taskId: z.string().uuid("Invalid Task ID").optional(),
});

export type EventQuery = z.infer<typeof EventQuerySchema>;

export const EventResponseSchema = z.object({
  event: EventSchema,
});

export type EventResponse = z.infer<typeof EventResponseSchema>;

export const EventsResponseSchema = z.object({
  events: z.array(EventSchema),
});

export type EventsResponse = z.infer<typeof EventsResponseSchema>;

export const ActivityResponseSchema = z.object({
  activity: z.array(EventSchema),
});

export type ActivityResponse = z.infer<typeof ActivityResponseSchema>;

export const CommentResponseSchema = z.object({
  comment: CommentSchema,
});

export type CommentResponse = z.infer<typeof CommentResponseSchema>;

// ============================================================================
// Response Schemas
// ============================================================================

export const ArtifactResponseSchema = z.object({
  artifact: ArtifactSchema,
});

export type ArtifactResponse = z.infer<typeof ArtifactResponseSchema>;

export const ArtifactsResponseSchema = z.object({
  artifacts: z.array(ArtifactSchema),
});

export type ArtifactsResponse = z.infer<typeof ArtifactsResponseSchema>;

export const CreateArtifactSchema = z.object({
  taskId: z.uuid(),
  type: z.string().min(1),
  title: z.string().min(1),
  contentText: z.string().optional(),
});

export type CreateArtifact = z.infer<typeof CreateArtifactSchema>;

export const ReportCiResultSchema = z.object({
  workspaceId: z.uuid(),
  taskId: z.uuid().optional(),
  preset: z.string(),
  ok: z.boolean(),
  summary: z.string(),
  commands: z.array(
    z.object({
      cmd: z.string(),
      exitCode: z.number(),
    })
  ),
});

export type ReportCiResult = z.infer<typeof ReportCiResultSchema>;
