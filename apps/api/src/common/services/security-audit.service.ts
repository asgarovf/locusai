import { SecurityAuditEventType } from "@locusai/shared";
import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { SecurityAuditLog } from "@/entities/security-audit-log.entity";
import { AppLogger } from "../logger/logger.service";

export interface SecurityAuditData {
  eventType: SecurityAuditEventType;
  email?: string;
  userId?: string;
  ip?: string;
  userAgent?: string;
  requestId?: string;
  metadata?: Record<string, unknown>;
}

@Injectable()
export class SecurityAuditService {
  constructor(
    @InjectRepository(SecurityAuditLog)
    private readonly auditLogRepository: Repository<SecurityAuditLog>,
    private readonly logger: AppLogger
  ) {}

  async log(data: SecurityAuditData): Promise<void> {
    try {
      const entry = this.auditLogRepository.create({
        eventType: data.eventType,
        email: data.email ?? null,
        userId: data.userId ?? null,
        ip: data.ip ?? null,
        userAgent: data.userAgent ?? null,
        requestId: data.requestId ?? null,
        metadata: data.metadata ?? null,
      });
      await this.auditLogRepository.save(entry);
    } catch (error) {
      // Audit logging should never break the main flow
      this.logger.error(
        `Failed to log security audit event: ${data.eventType}`,
        error instanceof Error ? error.stack : undefined,
        "SecurityAudit"
      );
    }
  }
}
