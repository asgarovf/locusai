import { Injectable } from "@nestjs/common";
import { AppLogger } from "../logger/logger.service";

export enum SecurityAuditEventType {
  LOGIN_SUCCESS = "LOGIN_SUCCESS",
  LOGIN_FAILURE = "LOGIN_FAILURE",
  OTP_REQUEST = "OTP_REQUEST",
  OTP_VERIFY_SUCCESS = "OTP_VERIFY_SUCCESS",
  OTP_VERIFY_FAILURE = "OTP_VERIFY_FAILURE",
  OTP_BRUTE_FORCE_LOCKOUT = "OTP_BRUTE_FORCE_LOCKOUT",
  API_KEY_CREATED = "API_KEY_CREATED",
  API_KEY_DELETED = "API_KEY_DELETED",
  AUTH_FAILURE = "AUTH_FAILURE",
  RATE_LIMIT_EXCEEDED = "RATE_LIMIT_EXCEEDED",
  ACCOUNT_LOCKED = "ACCOUNT_LOCKED",
}

export interface SecurityAuditLogEntry {
  timestamp: string;
  eventType: SecurityAuditEventType;
  requestId: string;
  actorId: string | null;
  actorEmail: string | null;
  ipAddress: string;
  userAgent: string;
  success: boolean;
  metadata: Record<string, unknown>;
}

export interface SecurityAuditRequestContext {
  requestId: string;
  ipAddress: string;
  userAgent: string;
}

export interface SecurityAuditEventParams {
  eventType: SecurityAuditEventType;
  requestContext: SecurityAuditRequestContext;
  actorId?: string | null;
  actorEmail?: string | null;
  success: boolean;
  metadata?: Record<string, unknown>;
}

const CONTEXT = "SecurityAudit";

@Injectable()
export class SecurityAuditService {
  constructor(private logger: AppLogger) {}

  logSecurityEvent(params: SecurityAuditEventParams): void {
    const entry: SecurityAuditLogEntry = {
      timestamp: new Date().toISOString(),
      eventType: params.eventType,
      requestId: params.requestContext.requestId,
      actorId: params.actorId ?? null,
      actorEmail: params.actorEmail ?? null,
      ipAddress: params.requestContext.ipAddress,
      userAgent: params.requestContext.userAgent,
      success: params.success,
      metadata: params.metadata ?? {},
    };

    if (params.success) {
      this.logger.log(JSON.stringify(entry), CONTEXT);
    } else {
      this.logger.warn(JSON.stringify(entry), CONTEXT);
    }
  }
}
