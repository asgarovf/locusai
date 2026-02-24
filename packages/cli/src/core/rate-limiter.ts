/**
 * GitHub API rate limit tracking & throttling.
 * Parses X-RateLimit-* headers, implements preemptive throttling,
 * and persists state between invocations.
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { bold, dim, red, yellow } from "../display/terminal.js";
import type { RateLimitState } from "../types.js";
import { getLogger } from "./logger.js";

// ─── Thresholds ──────────────────────────────────────────────────────────────

const WARN_THRESHOLD = 100;
const PAUSE_THRESHOLD = 20;

// ─── Rate Limiter ────────────────────────────────────────────────────────────

export class RateLimiter {
  private state: RateLimitState;
  private statePath: string | null;
  private totalCallsThisSession = 0;

  constructor(projectRoot?: string) {
    this.statePath = projectRoot
      ? join(projectRoot, ".locus", "rate-limit.json")
      : null;
    this.state = this.loadState();
  }

  /** Update rate limit state from gh command stderr/stdout headers. */
  updateFromHeaders(headers: Record<string, string>): void {
    const limit = headers["x-ratelimit-limit"];
    const remaining = headers["x-ratelimit-remaining"];
    const reset = headers["x-ratelimit-reset"];
    const used = headers["x-ratelimit-used"];

    if (remaining !== undefined) {
      this.state.remaining = Number.parseInt(remaining, 10);
    }
    if (limit !== undefined) {
      this.state.limit = Number.parseInt(limit, 10);
    }
    if (reset !== undefined) {
      this.state.reset = new Date(
        Number.parseInt(reset, 10) * 1000
      ).toISOString();
    }
    if (used !== undefined) {
      this.state.used = Number.parseInt(used, 10);
    }
    this.state.lastUpdated = new Date().toISOString();
    this.totalCallsThisSession++;

    this.persistState();
  }

  /** Update rate limit from a parsed JSON response that includes headers. */
  updateFromResponse(response: { headers?: Record<string, string> }): void {
    if (response.headers) {
      this.updateFromHeaders(response.headers);
    }
  }

  /** Check rate limit state before making a request. Returns wait time in ms, or 0 if OK. */
  async checkBeforeRequest(): Promise<void> {
    const log = getLogger();

    // Check if we're in a reset window from a previous invocation
    if (this.state.remaining <= 0 && this.state.reset) {
      const resetTime = new Date(this.state.reset).getTime();
      const now = Date.now();
      if (resetTime > now) {
        // We know we're rate limited — wait for reset
        await this.waitForReset(resetTime - now);
        return;
      }
      // Reset window has passed — clear state
      this.state.remaining = this.state.limit;
    }

    if (this.state.remaining > 0 && this.state.remaining <= PAUSE_THRESHOLD) {
      log.warn(
        `GitHub API rate limit critically low: ${this.state.remaining}/${this.state.limit} remaining`
      );
      const resetTime = new Date(this.state.reset).getTime();
      const now = Date.now();
      if (resetTime > now) {
        await this.waitForReset(resetTime - now);
      }
    } else if (
      this.state.remaining > 0 &&
      this.state.remaining <= WARN_THRESHOLD
    ) {
      log.warn(
        `GitHub API rate limit low: ${this.state.remaining}/${this.state.limit} remaining`
      );
    }
  }

  /** Handle a 403/429 rate limit response. Waits and returns true if should retry. */
  async handleRateLimitError(): Promise<boolean> {
    const resetTime = this.state.reset
      ? new Date(this.state.reset).getTime()
      : Date.now() + 60_000; // default: wait 60s
    const now = Date.now();
    const waitMs = Math.max(0, resetTime - now);

    if (waitMs > 0) {
      await this.waitForReset(waitMs);
      return true; // Should retry
    }

    return false;
  }

  /** Get current state for display purposes. */
  getState(): Readonly<RateLimitState> {
    return { ...this.state };
  }

  /** Get total API calls made in this session. */
  getSessionCallCount(): number {
    return this.totalCallsThisSession;
  }

  // ─── Internal ───────────────────────────────────────────────────────────

  private async waitForReset(waitMs: number): Promise<void> {
    const minutes = Math.ceil(waitMs / 60_000);
    const resetAt = new Date(Date.now() + waitMs).toLocaleTimeString();

    process.stderr.write(
      `\n${bold(yellow("⚠"))} ${red("GitHub API rate limit reached")} (${this.state.remaining}/${this.state.limit} remaining)\n`
    );
    process.stderr.write(
      `  Resets at: ${bold(resetAt)} (in ${minutes} minute${minutes === 1 ? "" : "s"})\n\n`
    );
    process.stderr.write(`  Options:\n`);
    process.stderr.write(
      `    ${dim("•")} Wait — execution will auto-resume when the limit resets\n`
    );
    process.stderr.write(
      `    ${dim("•")} Ctrl+C — stop now, resume later with ${bold("locus run --resume")}\n\n`
    );

    // Wait with countdown
    const startWait = Date.now();
    const endWait = startWait + waitMs;

    while (Date.now() < endWait) {
      const remaining = Math.ceil((endWait - Date.now()) / 1000);
      process.stderr.write(`\r  ${dim(`Waiting... ${remaining}s remaining`)}`);
      await sleep(1000);
    }
    process.stderr.write("\r  Rate limit reset. Resuming...              \n");
  }

  private loadState(): RateLimitState {
    if (this.statePath && existsSync(this.statePath)) {
      try {
        return JSON.parse(readFileSync(this.statePath, "utf-8"));
      } catch {
        // Corrupted state file — start fresh
      }
    }

    return {
      limit: 5000,
      remaining: 5000,
      reset: new Date(Date.now() + 3600_000).toISOString(),
      used: 0,
      lastUpdated: new Date().toISOString(),
    };
  }

  private persistState(): void {
    if (!this.statePath) return;

    try {
      const dir = dirname(this.statePath);
      if (!existsSync(dir)) {
        mkdirSync(dir, { recursive: true });
      }
      writeFileSync(this.statePath, `${JSON.stringify(this.state, null, 2)}\n`);
    } catch {
      // Silently ignore persist errors
    }
  }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ─── Singleton ───────────────────────────────────────────────────────────────

let globalRateLimiter: RateLimiter | null = null;

export function getRateLimiter(projectRoot?: string): RateLimiter {
  if (!globalRateLimiter) {
    globalRateLimiter = new RateLimiter(projectRoot);
  }
  return globalRateLimiter;
}

export function resetRateLimiter(): void {
  globalRateLimiter = null;
}
