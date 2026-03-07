/**
 * ResultBatcher — combines cron job results firing within a time window
 * into a single message per route, preventing notification spam.
 *
 * The local adapter is excluded from batching and always receives results immediately.
 */

import type { CronJobResult, OutputAdapter } from "./types.js";

const DEFAULT_BATCH_WINDOW_MS = 60_000;

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

  constructor(batchWindowMs?: number) {
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
      try {
        await adapter.send(result);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        onError(adapter.name, msg);
      }
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
      try {
        await adapter.send(combined);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        onError(adapter.name, msg);
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
