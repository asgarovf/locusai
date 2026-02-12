import {
  HttpException,
  HttpStatus,
  Injectable,
  OnModuleDestroy,
} from "@nestjs/common";
import { SecurityAuditService } from "@/common/services/security-audit.service";
import { TypedConfigService } from "@/config/config.service";

interface LockoutEntry {
  failedAttempts: number[];
  lockedUntil: number | null;
}

@Injectable()
export class AccountLockoutService implements OnModuleDestroy {
  private readonly attempts = new Map<string, LockoutEntry>();
  private readonly cleanupInterval: ReturnType<typeof setInterval>;

  private readonly maxAttempts: number;
  private readonly windowMs: number;
  private readonly lockoutMs: number;

  constructor(
    private readonly configService: TypedConfigService,
    private readonly securityAuditService: SecurityAuditService
  ) {
    this.maxAttempts = this.configService.get("LOCKOUT_MAX_ATTEMPTS");
    this.windowMs =
      this.configService.get("LOCKOUT_WINDOW_MINUTES") * 60 * 1000;
    this.lockoutMs =
      this.configService.get("LOCKOUT_DURATION_MINUTES") * 60 * 1000;

    // Clean up stale entries every 5 minutes
    this.cleanupInterval = setInterval(() => this.cleanup(), 5 * 60 * 1000);
  }

  onModuleDestroy() {
    clearInterval(this.cleanupInterval);
  }

  /**
   * Check if the account is currently locked. Throws HTTP 423 if locked.
   */
  assertNotLocked(email: string): void {
    const entry = this.attempts.get(email);
    if (!entry?.lockedUntil) return;

    if (Date.now() < entry.lockedUntil) {
      const retryAfterSeconds = Math.ceil(
        (entry.lockedUntil - Date.now()) / 1000
      );
      const retryMinutes = Math.ceil(retryAfterSeconds / 60);

      this.securityAuditService.log({
        event: "LOGIN_ATTEMPT_WHILE_LOCKED",
        email,
        metadata: { retryAfterSeconds },
      });

      throw new HttpException(
        {
          statusCode: HttpStatus.LOCKED,
          message: `Account is temporarily locked due to too many failed login attempts. Please try again in ${retryMinutes} minute${retryMinutes === 1 ? "" : "s"}.`,
          retryAfterSeconds,
        },
        HttpStatus.LOCKED
      );
    }

    // Lock has expired — clear and allow
    this.attempts.delete(email);
    this.securityAuditService.log({
      event: "ACCOUNT_LOCKOUT_EXPIRED",
      email,
    });
  }

  /**
   * Record a failed login attempt. May trigger a lockout.
   */
  recordFailure(email: string): void {
    const now = Date.now();
    const windowStart = now - this.windowMs;
    let entry = this.attempts.get(email);

    if (!entry) {
      entry = { failedAttempts: [], lockedUntil: null };
      this.attempts.set(email, entry);
    }

    // Prune attempts outside the window
    entry.failedAttempts = entry.failedAttempts.filter((t) => t > windowStart);
    entry.failedAttempts.push(now);

    this.securityAuditService.log({
      event: "FAILED_LOGIN_ATTEMPT",
      email,
      metadata: { attemptCount: entry.failedAttempts.length },
    });

    if (entry.failedAttempts.length >= this.maxAttempts) {
      entry.lockedUntil = now + this.lockoutMs;

      this.securityAuditService.log({
        event: "ACCOUNT_LOCKED",
        email,
        metadata: {
          attemptCount: entry.failedAttempts.length,
          lockoutDurationMinutes: this.configService.get(
            "LOCKOUT_DURATION_MINUTES"
          ),
        },
      });
    }
  }

  /**
   * Reset the failure counter on successful login.
   */
  resetFailures(email: string): void {
    this.attempts.delete(email);
  }

  /**
   * Remove stale entries that are past both the window and any lockout.
   */
  private cleanup(): void {
    const now = Date.now();
    const windowStart = now - this.windowMs;

    for (const [email, entry] of this.attempts) {
      // If locked and not yet expired, keep
      if (entry.lockedUntil && now < entry.lockedUntil) continue;

      // Prune old attempts
      entry.failedAttempts = entry.failedAttempts.filter(
        (t) => t > windowStart
      );

      // If nothing left, remove the entry
      if (entry.failedAttempts.length === 0) {
        this.attempts.delete(email);
      }
    }
  }
}
