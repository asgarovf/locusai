import { Injectable } from "@nestjs/common";
import { AppLogger } from "../logger/logger.service";

export type SecurityEvent =
  | "ACCOUNT_LOCKED"
  | "ACCOUNT_LOCKOUT_EXPIRED"
  | "FAILED_LOGIN_ATTEMPT"
  | "LOGIN_ATTEMPT_WHILE_LOCKED";

interface SecurityEventData {
  event: SecurityEvent;
  email: string;
  metadata?: Record<string, unknown>;
}

@Injectable()
export class SecurityAuditService {
  constructor(private readonly logger: AppLogger) {}

  log(data: SecurityEventData): void {
    this.logger.warn(
      `[SecurityAudit] ${data.event} | email=${data.email}${
        data.metadata ? ` | ${JSON.stringify(data.metadata)}` : ""
      }`,
      "SecurityAuditService"
    );
  }
}
