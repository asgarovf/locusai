import { Injectable } from "@nestjs/common";

interface LockoutEntry {
  failedAttempts: number;
  lockedUntil: Date | null;
}

@Injectable()
export class AccountLockoutService {
  private readonly store = new Map<string, LockoutEntry>();
  private readonly maxAttempts: number;
  private readonly lockoutDurationMs: number;

  constructor(maxAttempts = 5, lockoutDurationMs = 15 * 60 * 1000) {
    this.maxAttempts = maxAttempts;
    this.lockoutDurationMs = lockoutDurationMs;
  }

  isLocked(email: string): boolean {
    const entry = this.store.get(email);
    if (!entry || !entry.lockedUntil) return false;

    if (entry.lockedUntil > new Date()) {
      return true;
    }

    // Lock expired, clean up
    this.store.delete(email);
    return false;
  }

  recordFailedAttempt(email: string): {
    locked: boolean;
    attemptsRemaining: number;
  } {
    const entry = this.store.get(email) || {
      failedAttempts: 0,
      lockedUntil: null,
    };
    entry.failedAttempts += 1;

    if (entry.failedAttempts >= this.maxAttempts) {
      entry.lockedUntil = new Date(Date.now() + this.lockoutDurationMs);
      this.store.set(email, entry);
      return { locked: true, attemptsRemaining: 0 };
    }

    this.store.set(email, entry);
    return {
      locked: false,
      attemptsRemaining: this.maxAttempts - entry.failedAttempts,
    };
  }

  recordSuccess(email: string): void {
    this.store.delete(email);
  }

  getFailedAttempts(email: string): number {
    return this.store.get(email)?.failedAttempts ?? 0;
  }
}
