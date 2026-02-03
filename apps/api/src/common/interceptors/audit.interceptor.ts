import { $FixMe, AuthenticatedUser, getAuthUserId } from "@locusai/shared";
import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { Request } from "express";
import { Observable, catchError, tap, throwError } from "rxjs";
import { AuditLogService } from "@/audit-logs/audit-logs.service";
import { AUDIT_LOG_KEY, AuditLogOptions } from "../decorators/audit-log.decorator";

interface RequestWithUser extends Request {
  user?: AuthenticatedUser;
}

/**
 * Interceptor that automatically logs security-relevant actions to the audit log.
 * Works in conjunction with the @AuditLog decorator.
 *
 * Captures:
 * - User ID (from authenticated user)
 * - IP address (from request)
 * - User agent (from headers)
 * - Resource ID (from route params like :id, :taskId, etc.)
 * - Request metadata (method, path, status)
 *
 * Logs both successful and failed requests.
 */
@Injectable()
export class AuditLogInterceptor implements NestInterceptor {
  constructor(
    private readonly reflector: Reflector,
    private readonly auditLogService: AuditLogService
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<$FixMe> {
    const auditOptions = this.reflector.get<AuditLogOptions | undefined>(
      AUDIT_LOG_KEY,
      context.getHandler()
    );

    // If no @AuditLog decorator, skip audit logging
    if (!auditOptions) {
      return next.handle();
    }

    const request = context.switchToHttp().getRequest<RequestWithUser>();
    const { action, resource } = auditOptions;

    // Extract common audit data
    const userId = request.user ? getAuthUserId(request.user) : null;
    const ipAddress = this.getClientIp(request);
    const userAgent = request.headers["user-agent"] ?? null;
    const resourceId = this.extractResourceId(request);

    return next.handle().pipe(
      tap(() => {
        // Log successful action
        this.auditLogService.log(action, resource ?? null, userId, {
          status: "success",
          method: request.method,
          path: request.path,
        }, {
          ipAddress,
          userAgent: userAgent ?? undefined,
          resourceId: resourceId ?? undefined,
        });
      }),
      catchError((error) => {
        // Log failed action
        this.auditLogService.log(action, resource ?? null, userId, {
          status: "failure",
          method: request.method,
          path: request.path,
          errorMessage: error?.message ?? "Unknown error",
          errorName: error?.name ?? "Error",
        }, {
          ipAddress,
          userAgent: userAgent ?? undefined,
          resourceId: resourceId ?? undefined,
        });

        // Re-throw the error to let NestJS handle it
        return throwError(() => error);
      })
    );
  }

  /**
   * Extract client IP address from request, handling proxies.
   */
  private getClientIp(request: Request): string | undefined {
    // Check x-forwarded-for header (for reverse proxies)
    const forwardedFor = request.headers["x-forwarded-for"];
    if (forwardedFor) {
      // x-forwarded-for can be a comma-separated list; take the first IP
      const firstIp = Array.isArray(forwardedFor)
        ? forwardedFor[0]
        : forwardedFor.split(",")[0];
      return firstIp?.trim();
    }

    // Check x-real-ip header (nginx)
    const realIp = request.headers["x-real-ip"];
    if (realIp) {
      return Array.isArray(realIp) ? realIp[0] : realIp;
    }

    // Fall back to request.ip
    return request.ip ?? undefined;
  }

  /**
   * Extract resource ID from route parameters.
   * Looks for common param names: id, taskId, workspaceId, etc.
   */
  private extractResourceId(request: Request): string | undefined {
    const params = request.params;
    if (!params) return undefined;

    // Priority order for resource ID extraction
    const idFields = ["id", "taskId", "workspaceId", "organizationId", "orgId", "userId", "sprintId", "docId", "keyId", "invitationId"];

    for (const field of idFields) {
      const value = params[field];
      if (value) {
        return Array.isArray(value) ? value[0] : value;
      }
    }

    return undefined;
  }
}
