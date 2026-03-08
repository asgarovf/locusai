/**
 * Persistent state for cron job last-run timestamps.
 *
 * State is stored at `.locus/cron/state.json` and written atomically
 * (write to temp file, then rename) to avoid corruption on crash.
 */

import { existsSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { join } from "node:path";

export interface CronState {
  [jobName: string]: { lastRun: string };
}

export class CronStateManager {
  private statePath: string;
  private state: CronState;

  constructor(cronBaseDir: string) {
    this.statePath = join(cronBaseDir, "state.json");
    this.state = this.load();
  }

  /** Get the last run timestamp for a job, or null if never run. */
  getLastRun(jobName: string): Date | null {
    const entry = this.state[jobName];
    if (!entry) return null;
    const date = new Date(entry.lastRun);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  /** Record a job execution and persist to disk. */
  recordRun(jobName: string, timestamp: Date): void {
    this.state[jobName] = { lastRun: timestamp.toISOString() };
    this.save();
  }

  private load(): CronState {
    if (!existsSync(this.statePath)) return {};
    try {
      const raw = readFileSync(this.statePath, "utf-8");
      return JSON.parse(raw) as CronState;
    } catch {
      return {};
    }
  }

  private save(): void {
    const tmpPath = `${this.statePath}.tmp`;
    writeFileSync(tmpPath, JSON.stringify(this.state, null, 2), "utf-8");
    renameSync(tmpPath, this.statePath);
  }
}
