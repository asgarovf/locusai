import { z } from "zod";

// ============================================================================
// Enums
// ============================================================================

export enum JobType {
  LINT_SCAN = "LINT_SCAN",
  DEPENDENCY_CHECK = "DEPENDENCY_CHECK",
  TODO_CLEANUP = "TODO_CLEANUP",
  FLAKY_TEST_DETECTION = "FLAKY_TEST_DETECTION",
  CUSTOM = "CUSTOM",
}

export enum JobStatus {
  IDLE = "IDLE",
  RUNNING = "RUNNING",
  COMPLETED = "COMPLETED",
  FAILED = "FAILED",
  CANCELLED = "CANCELLED",
}

export enum JobSeverity {
  AUTO_EXECUTE = "AUTO_EXECUTE",
  REQUIRE_APPROVAL = "REQUIRE_APPROVAL",
}

// ============================================================================
// Schemas
// ============================================================================

export const JobScheduleSchema = z.object({
  cronExpression: z.string(),
  enabled: z.boolean(),
  lastRunAt: z.string().optional(),
  nextRunAt: z.string().optional(),
});

export type JobSchedule = z.infer<typeof JobScheduleSchema>;

export const JobConfigSchema = z.object({
  type: z.enum(JobType),
  schedule: JobScheduleSchema,
  severity: z.enum(JobSeverity),
  enabled: z.boolean(),
  options: z.record(z.string(), z.any()),
});

export type JobConfig = z.infer<typeof JobConfigSchema>;

export const JobRunResultSchema = z.object({
  summary: z.string(),
  filesChanged: z.number(),
  prUrl: z.string().optional(),
  errors: z.array(z.string()).optional(),
});

export type JobRunResult = z.infer<typeof JobRunResultSchema>;

export const JobRunSchema = z.object({
  id: z.string(),
  jobType: z.enum(JobType),
  status: z.enum(JobStatus),
  startedAt: z.string(),
  completedAt: z.string().optional(),
  result: JobRunResultSchema.optional(),
  workspaceId: z.string(),
});

export type JobRun = z.infer<typeof JobRunSchema>;

// ============================================================================
// Create / Update Schemas
// ============================================================================

export const CreateJobRunSchema = z.object({
  jobType: z.enum(JobType),
  status: z.enum(JobStatus).optional().default(JobStatus.RUNNING),
  startedAt: z.string().optional(),
  error: z.string().optional(),
  result: JobRunResultSchema.optional(),
});

export type CreateJobRun = z.infer<typeof CreateJobRunSchema>;

export const UpdateJobRunSchema = z.object({
  status: z.enum(JobStatus).optional(),
  result: JobRunResultSchema.optional(),
  error: z.string().nullable().optional(),
  completedAt: z.string().optional(),
});

export type UpdateJobRun = z.infer<typeof UpdateJobRunSchema>;
