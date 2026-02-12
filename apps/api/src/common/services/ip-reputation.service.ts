import { Injectable } from "@nestjs/common";

interface IpEntry {
  failureCount: number;
  flagged: boolean;
  lastFailure: number;
}

@Injectable()
export class IpReputationService {
  private readonly store = new Map<string, IpEntry>();
  private readonly flagThreshold: number;
  private readonly ttlMs: number;

  constructor(flagThreshold = 10, ttlMs = 60 * 60 * 1000) {
    this.flagThreshold = flagThreshold;
    this.ttlMs = ttlMs;
  }

  recordFailure(ip: string): void {
    const entry = this.store.get(ip) || {
      failureCount: 0,
      flagged: false,
      lastFailure: 0,
    };
    entry.failureCount += 1;
    entry.lastFailure = Date.now();

    if (entry.failureCount >= this.flagThreshold) {
      entry.flagged = true;
    }

    this.store.set(ip, entry);
  }

  isFlagged(ip: string): boolean {
    const entry = this.store.get(ip);
    if (!entry) return false;

    // Check TTL
    if (Date.now() - entry.lastFailure > this.ttlMs) {
      this.store.delete(ip);
      return false;
    }

    return entry.flagged;
  }

  getFailureCount(ip: string): number {
    const entry = this.store.get(ip);
    if (!entry) return 0;

    // Check TTL
    if (Date.now() - entry.lastFailure > this.ttlMs) {
      this.store.delete(ip);
      return 0;
    }

    return entry.failureCount;
  }

  cleanup(): void {
    const now = Date.now();
    for (const [ip, entry] of this.store) {
      if (now - entry.lastFailure > this.ttlMs) {
        this.store.delete(ip);
      }
    }
  }
}
