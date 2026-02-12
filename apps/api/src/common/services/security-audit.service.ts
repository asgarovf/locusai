import { Injectable } from "@nestjs/common";
import { AppLogger } from "../logger";

export type SecurityEventType =
  | "AUTH_SUCCESS"
  | "AUTH_FAILURE"
  | "ACCOUNT_LOCKED"
  | "API_KEY_INVALID"
  | "API_KEY_EXPIRED"
  | "OTP_BRUTE_FORCE"
  | "IP_FLAGGED"
  | "SUSPICIOUS_REQUEST";

export interface SecurityEvent {
  type: SecurityEventType;
  message: string;
  ip?: string;
  email?: string;
  metadata?: Record<string, unknown>;
}

@Injectable()
export class SecurityAuditService {
  constructor(private readonly logger: AppLogger) {}

  log(event: SecurityEvent): void {
    const structured = {
      securityEvent: event.type,
      message: event.message,
      ip: event.ip,
      email: event.email,
      ...event.metadata,
      timestamp: new Date().toISOString(),
    };

    const logMessage = JSON.stringify(structured);

    switch (event.type) {
      case "AUTH_SUCCESS":
        this.logger.log(logMessage, "SecurityAudit");
        break;
      case "AUTH_FAILURE":
      case "API_KEY_INVALID":
      case "API_KEY_EXPIRED":
        this.logger.warn(logMessage, "SecurityAudit");
        break;
      case "ACCOUNT_LOCKED":
      case "OTP_BRUTE_FORCE":
      case "IP_FLAGGED":
      case "SUSPICIOUS_REQUEST":
        this.logger.error(logMessage, undefined, "SecurityAudit");
        break;
    }
  }
}
