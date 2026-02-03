import { Controller, Get, Query } from "@nestjs/common";
import { AdminOnly } from "@/common/decorators/admin.decorator";
import { AuditLog } from "@/common/decorators/audit-log.decorator";
import {
  CustomThrottle,
  byUserId,
} from "@/common/decorators/custom-throttle.decorator";
import { ZodValidationPipe } from "@/common/pipes/zod-validation.pipe";
import { AuditLogService, PaginatedAuditLogs } from "./audit-logs.service";
import {
  AuditLogsQuery,
  AuditLogsQuerySchema,
} from "./dto/audit-logs-query.dto";

@Controller("admin/audit-logs")
export class AuditLogsController {
  constructor(private readonly auditLogService: AuditLogService) {}

  /**
   * Search and filter audit logs.
   * Only accessible by system administrators.
   */
  @Get()
  @AdminOnly()
  @CustomThrottle({ limit: 100, ttl: 60000, keyGenerator: byUserId() })
  @AuditLog("ADMIN_AUDIT_LOGS_SEARCH", "audit")
  async search(
    @Query(new ZodValidationPipe(AuditLogsQuerySchema)) query: AuditLogsQuery
  ): Promise<PaginatedAuditLogs> {
    return this.auditLogService.search({
      userId: query.userId,
      action: query.action,
      resource: query.resource,
      resourceId: query.resourceId,
      ipAddress: query.ipAddress,
      startDate: query.startDate,
      endDate: query.endDate,
      skip: query.skip,
      take: query.take,
    });
  }
}
