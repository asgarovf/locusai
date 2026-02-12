import {
  ForbiddenException,
  Injectable,
  OnModuleDestroy,
  OnModuleInit,
} from "@nestjs/common";
import { SecurityAuditService } from "./security-audit.service";

interface IpTrackingEntry {
  failedAttempts: number;
  targetedEmails: Set<string>;
  firstAttemptAt: number;
  blockedUntil: number | null;
}

const DEFAULT_THRESHOLD = 50;
const DEFAULT_WINDOW_MS = 60 * 60 * 1000; // 1 hour
const DEFAULT_BLOCK_DURATION_MS = 60 * 60 * 1000; // 1 hour
const CLEANUP_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes

@Injectable()
export class IpReputationService implements OnModuleInit, OnModuleDestroy {
  private readonly ipTracking = new Map<string, IpTrackingEntry>();
  private cleanupTimer: ReturnType<typeof setInterval> | null = null;

  private readonly threshold: number;
  private readonly windowMs: number;
  private readonly blockDurationMs: number;

  constructor(private readonly securityAuditService: SecurityAuditService) {
    this.threshold =
      parseInt(process.env.IP_REPUTATION_THRESHOLD ?? "", 10) ||
      DEFAULT_THRESHOLD;
    this.windowMs =
      parseInt(process.env.IP_REPUTATION_WINDOW_MS ?? "", 10) ||
      DEFAULT_WINDOW_MS;
    this.blockDurationMs =
      parseInt(process.env.IP_REPUTATION_BLOCK_DURATION_MS ?? "", 10) ||
      DEFAULT_BLOCK_DURATION_MS;
  }

  onModuleInit(): void {
    this.cleanupTimer = setInterval(() => this.cleanup(), CLEANUP_INTERVAL_MS);
  }

  onModuleDestroy(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
  }

  isBlocked(ip: string): boolean {
    const entry = this.ipTracking.get(ip);
    if (!entry?.blockedUntil) {
      return false;
    }

    if (Date.now() >= entry.blockedUntil) {
      // Block has expired, remove it
      this.ipTracking.delete(ip);
      return false;
    }

    this.securityAuditService.logBlockedRequest({
      ip,
      blockedUntil: new Date(entry.blockedUntil),
      originalReason: `Exceeded ${this.threshold} failed auth attempts across ${entry.targetedEmails.size} email(s)`,
    });

    return true;
  }

  assertNotBlocked(ip: string): void {
    if (this.isBlocked(ip)) {
      throw new ForbiddenException(
        "Too many failed authentication attempts. Please try again later."
      );
    }
  }

  recordFailedAttempt(ip: string, email: string): void {
    const now = Date.now();
    let entry = this.ipTracking.get(ip);

    if (!entry || now - entry.firstAttemptAt >= this.windowMs) {
      // Start a new tracking window
      entry = {
        failedAttempts: 0,
        targetedEmails: new Set(),
        firstAttemptAt: now,
        blockedUntil: null,
      };
      this.ipTracking.set(ip, entry);
    }

    entry.failedAttempts++;
    entry.targetedEmails.add(email);

    this.securityAuditService.logFailedAuth({
      ip,
      email,
      reason: "Authentication failed",
    });

    if (entry.failedAttempts >= this.threshold && !entry.blockedUntil) {
      entry.blockedUntil = now + this.blockDurationMs;

      this.securityAuditService.logSuspiciousIp({
        ip,
        failedAttempts: entry.failedAttempts,
        targetedEmails: Array.from(entry.targetedEmails),
        windowMs: this.windowMs,
      });
    }
  }

  private cleanup(): void {
    const now = Date.now();

    for (const [ip, entry] of this.ipTracking) {
      const windowExpired = now - entry.firstAttemptAt >= this.windowMs;
      const blockExpired = entry.blockedUntil && now >= entry.blockedUntil;

      if (windowExpired && (!entry.blockedUntil || blockExpired)) {
        this.ipTracking.delete(ip);
      }
    }
  }
}
