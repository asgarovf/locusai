import { SetMetadata } from "@nestjs/common";

export const AUDIT_LOG_KEY = "audit_log";

export interface AuditLogOptions {
  /** The action being performed (e.g., 'USER_LOGIN', 'TASK_CREATE') */
  action: string;
  /** The resource type being acted upon (e.g., 'auth', 'task', 'workspace') */
  resource?: string;
}

/**
 * Decorator to mark a route handler for audit logging.
 * When applied, the AuditLogInterceptor will automatically log the action
 * with user context, IP address, and user agent.
 *
 * @param action - The action being performed (e.g., 'USER_LOGIN', 'TASK_CREATE')
 * @param resource - Optional resource type (e.g., 'auth', 'task')
 *
 * @example
 * ```typescript
 * @Post()
 * @AuditLog('TASK_CREATE', 'task')
 * createTask(@Body() dto: CreateTaskDto) {
 *   return this.tasksService.create(dto);
 * }
 *
 * @Delete(':id')
 * @AuditLog('TASK_DELETE', 'task')
 * deleteTask(@Param('id') id: string) {
 *   return this.tasksService.delete(id);
 * }
 * ```
 */
export const AuditLog = (action: string, resource?: string) =>
  SetMetadata<string, AuditLogOptions>(AUDIT_LOG_KEY, { action, resource });
