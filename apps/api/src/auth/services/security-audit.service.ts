import { Injectable } from "@nestjs/common";
import { AppLogger } from "@/common/logger";

interface SuspiciousIpDetails {
  ip: string;
  failedAttempts: number;
  targetedEmails: string[];
  windowMs: number;
}

interface BlockedRequestDetails {
  ip: string;
  blockedUntil: Date;
  originalReason: string;
}

interface FailedAuthDetails {
  ip: string;
  email: string;
  reason: string;
}

@Injectable()
export class SecurityAuditService {
  private static readonly CONTEXT = "SecurityAudit";

  constructor(private readonly logger: AppLogger) {}

  logSuspiciousIp(details: SuspiciousIpDetails): void {
    this.logger.warn(
      `SUSPICIOUS_IP: IP ${details.ip} exceeded threshold with ${details.failedAttempts} failed attempts ` +
        `across ${details.targetedEmails.length} email(s) within ${details.windowMs / 1000}s. ` +
        `Targeted emails: ${details.targetedEmails.join(", ")}`,
      SecurityAuditService.CONTEXT
    );
  }

  logBlockedRequest(details: BlockedRequestDetails): void {
    this.logger.warn(
      `BLOCKED_REQUEST: Blocked IP ${details.ip} attempted access. ` +
        `Blocked until ${details.blockedUntil.toISOString()}. ` +
        `Reason: ${details.originalReason}`,
      SecurityAuditService.CONTEXT
    );
  }

  logFailedAuth(details: FailedAuthDetails): void {
    this.logger.log(
      `FAILED_AUTH: IP ${details.ip} failed auth for ${details.email}. Reason: ${details.reason}`,
      SecurityAuditService.CONTEXT
    );
  }
}
