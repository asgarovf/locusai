import { z } from "zod";

/**
 * Query parameters schema for searching audit logs.
 * All filters are optional to allow flexible querying.
 */
export const AuditLogsQuerySchema = z.object({
  /** Filter by user ID */
  userId: z.string().uuid().optional(),

  /** Filter by action type (e.g., USER_LOGIN, TASK_CREATE) */
  action: z.string().max(100).optional(),

  /** Filter by resource type (e.g., auth, task, workspace) */
  resource: z.string().max(100).optional(),

  /** Filter by specific resource ID */
  resourceId: z.string().uuid().optional(),

  /** Filter by IP address */
  ipAddress: z.string().max(45).optional(),

  /** Filter logs created after this date (ISO 8601 format) */
  startDate: z.coerce.date().optional(),

  /** Filter logs created before this date (ISO 8601 format) */
  endDate: z.coerce.date().optional(),

  /** Number of records to skip (for pagination) */
  skip: z.coerce.number().int().min(0).default(0),

  /** Number of records to return (max 100) */
  take: z.coerce.number().int().min(1).max(100).default(50),
});

export type AuditLogsQuery = z.infer<typeof AuditLogsQuerySchema>;
