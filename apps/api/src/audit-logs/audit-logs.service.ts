import { $FixMe } from "@locusai/shared";
import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { FindOptionsWhere, Repository } from "typeorm";
import { AuditLog } from "@/entities/audit-log.entity";

export interface AuditLogFilters {
  userId?: string;
  action?: string;
  resource?: string;
  resourceId?: string;
  ipAddress?: string;
  startDate?: Date;
  endDate?: Date;
  skip?: number;
  take?: number;
}

export interface PaginatedAuditLogs {
  logs: AuditLog[];
  total: number;
}

@Injectable()
export class AuditLogService {
  constructor(
    @InjectRepository(AuditLog)
    private readonly auditLogRepository: Repository<AuditLog>
  ) {}

  /**
   * Log an audit event asynchronously (non-blocking).
   * This method fires-and-forgets to ensure audit logging never blocks the main request flow.
   */
  log(
    action: string,
    resource: string | null,
    userId: string | null,
    metadata?: Record<string, $FixMe>,
    options?: { ipAddress?: string; userAgent?: string; resourceId?: string }
  ): void {
    const entity = this.auditLogRepository.create({
      action,
      resource,
      userId,
      metadata: metadata ?? null,
      ipAddress: options?.ipAddress ?? null,
      userAgent: options?.userAgent ?? null,
      resourceId: options?.resourceId ?? null,
    });

    this.auditLogRepository.save(entity).catch((err) => {
      console.error("[AuditLogService] Failed to log audit event:", err);
    });
  }

  /**
   * Get audit logs by user ID with pagination.
   */
  async getByUser(
    userId: string,
    pagination: { skip?: number; take?: number } = {}
  ): Promise<PaginatedAuditLogs> {
    const { skip = 0, take = 50 } = pagination;

    const [logs, total] = await this.auditLogRepository.findAndCount({
      where: { userId },
      order: { createdAt: "DESC" },
      skip,
      take,
      relations: ["user"],
    });

    return { logs, total };
  }

  /**
   * Get audit logs by resource ID, optionally filtered by resource type.
   */
  async getByResource(
    resourceId: string,
    resource?: string
  ): Promise<AuditLog[]> {
    const where: FindOptionsWhere<AuditLog> = { resourceId };
    if (resource) {
      where.resource = resource;
    }

    return this.auditLogRepository.find({
      where,
      order: { createdAt: "DESC" },
      relations: ["user"],
    });
  }

  /**
   * Search audit logs with advanced filters.
   */
  async search(filters: AuditLogFilters): Promise<PaginatedAuditLogs> {
    const { skip = 0, take = 50 } = filters;

    const qb = this.auditLogRepository
      .createQueryBuilder("log")
      .leftJoinAndSelect("log.user", "user")
      .orderBy("log.createdAt", "DESC");

    if (filters.userId) {
      qb.andWhere("log.userId = :userId", { userId: filters.userId });
    }

    if (filters.action) {
      qb.andWhere("log.action = :action", { action: filters.action });
    }

    if (filters.resource) {
      qb.andWhere("log.resource = :resource", { resource: filters.resource });
    }

    if (filters.resourceId) {
      qb.andWhere("log.resourceId = :resourceId", {
        resourceId: filters.resourceId,
      });
    }

    if (filters.ipAddress) {
      qb.andWhere("log.ipAddress = :ipAddress", {
        ipAddress: filters.ipAddress,
      });
    }

    if (filters.startDate) {
      qb.andWhere("log.createdAt >= :startDate", {
        startDate: filters.startDate,
      });
    }

    if (filters.endDate) {
      qb.andWhere("log.createdAt <= :endDate", { endDate: filters.endDate });
    }

    qb.skip(skip).take(take);

    const [logs, total] = await qb.getManyAndCount();

    return { logs, total };
  }
}
