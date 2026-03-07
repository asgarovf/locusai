/**
 * ResultBatcher — combines cron job results firing within a time window
 * into a single message per route, preventing notification spam.
 *
 * The local adapter is excluded from batching and always receives results immediately.
 */

import { createLocalAdapter } from "./adapters/local.js";
import type { CronJobResult, OutputAdapter } from "./types.js";

const DEFAULT_BATCH_WINDOW_MS = 60_000;
const RETRY_DELAY_MS = 5_000;

interface PendingBatch {
  results: CronJobResult[];
  timer: ReturnType<typeof setTimeout>;
}

/**
 * Combines multiple CronJobResults into a single formatted result
 * suitable for sending as one message.
 */
function combineResults(results: CronJobResult[]): CronJobResult {
  if (results.length === 1) return results[0];

  const sections = results.map((r) => {
    const status = r.exitCode === 0 ? "OK" : `EXIT ${r.exitCode}`;
    return [
      `--- ${r.jobId} [${status}] ---`,
      `Command: ${r.command}`,
      `Schedule: ${r.schedule}`,
      `Time: ${r.timestamp.toISOString()}`,
      r.output.trim() ? r.output.trim() : "(no output)",
    ].join("\n");
  });

  return {
    jobId: `batch(${results.map((r) => r.jobId).join(", ")})`,
    command: results.map((r) => r.command).join("; "),
    output: sections.join("\n\n"),
    exitCode: results.some((r) => r.exitCode !== 0) ? 1 : 0,
    timestamp: results[results.length - 1].timestamp,
    schedule: results.map((r) => r.schedule).join(", "),
  };
}

export class ResultBatcher {
  private batches: Map<string, PendingBatch> = new Map();
  private batchWindowMs: number;
  private cwd: string;

  constructor(cwd: string, batchWindowMs?: number) {
    this.cwd = cwd;
    this.batchWindowMs = batchWindowMs ?? DEFAULT_BATCH_WINDOW_MS;
  }

  /**
   * Submit a result to be dispatched to the given adapters.
   * - Local adapters receive the result immediately (no batching).
   * - External adapters are batched per route key; the buffer flushes
   *   after `batchWindowMs` of inactivity for that route.
   */
  async submit(
    result: CronJobResult,
    adapters: OutputAdapter[],
    onError: (adapterName: string, error: string) => void
  ): Promise<void> {
    const localAdapters = adapters.filter((a) => a.name === "local");
    const externalAdapters = adapters.filter((a) => a.name !== "local");

    // Local adapters always receive results immediately
    for (const adapter of localAdapters) {
      await this.sendWithRetry(adapter, result, onError);
    }

    // External adapters are batched per route key
    if (externalAdapters.length === 0) return;

    const routeKey = externalAdapters
      .map((a) => a.name)
      .sort()
      .join(",");

    const existing = this.batches.get(routeKey);
    if (existing) {
      clearTimeout(existing.timer);
      existing.results.push(result);
    } else {
      this.batches.set(routeKey, {
        results: [result],
        timer: null as unknown as ReturnType<typeof setTimeout>,
      });
    }

    const batch = this.batches.get(routeKey)!;
    batch.timer = setTimeout(() => {
      this.flush(routeKey, externalAdapters, onError);
    }, this.batchWindowMs);
  }

  /**
   * Flush a pending batch — combines results and dispatches to adapters.
   */
  private async flush(
    routeKey: string,
    adapters: OutputAdapter[],
    onError: (adapterName: string, error: string) => void
  ): Promise<void> {
    const batch = this.batches.get(routeKey);
    if (!batch) return;

    this.batches.delete(routeKey);

    const combined = combineResults(batch.results);

    for (const adapter of adapters) {
      await this.sendWithRetry(adapter, combined, onError);
    }
  }

  /**
   * Attempt to send a result to an adapter. On failure, wait 5s and retry once.
   * If the retry also fails, log the failure and the original result to the
   * local adapter as a fallback. One adapter failing never blocks others.
   */
  private async sendWithRetry(
    adapter: OutputAdapter,
    result: CronJobResult,
    onError: (adapterName: string, error: string) => void
  ): Promise<void> {
    try {
      await adapter.send(result);
      return;
    } catch {
      // First attempt failed — retry after delay
    }

    await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS));

    try {
      await adapter.send(result);
      return;
    } catch (err: unknown) {
      // Retry also failed
      const msg = err instanceof Error ? err.message : String(err);
      onError(adapter.name, msg);

      // Fall back to local adapter for non-local adapters
      if (adapter.name !== "local") {
        const fallback = createLocalAdapter(this.cwd);
        const failureLine = `[${new Date().toISOString()}] ROUTE FAILED (${adapter.name}): ${msg}`;
        const fallbackResult: CronJobResult = {
          ...result,
          output: `${failureLine}\n${result.output}`,
        };
        try {
          await fallback.send(fallbackResult);
        } catch {
          // Nothing more we can do
        }
      }
    }
  }

  /** Stop all pending batch timers (used during shutdown). */
  dispose(): void {
    for (const batch of this.batches.values()) {
      clearTimeout(batch.timer);
    }
    this.batches.clear();
  }
}
