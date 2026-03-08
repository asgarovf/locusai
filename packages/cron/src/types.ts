/**
 * Cron scheduler types.
 */

/** Configuration for a single user-defined cron job. */
export interface CronJobConfig {
  /** Unique name for this cron job. */
  name: string;
  /** Human-readable interval (e.g. `"30m"`, `"1h"`, `"1d"`). */
  schedule: string;
  /** Shell command to execute when the cron fires. */
  command: string;
  /** Output routing targets (e.g. `["telegram", "local", "webhook:https://..."]`). */
  routes?: string[];
}

/** Cron package configuration stored under `packages.cron` in `.locus/config.json`. */
export interface CronConfig {
  /** Whether the cron scheduler is active. Defaults to `false`. */
  enabled: boolean;
  /** User-defined cron jobs. */
  crons: CronJobConfig[];
  /** Batch window in seconds for co-scheduled external notifications. Defaults to 60. */
  batchWindowSeconds?: number;
}

/** Runtime state for a single active cron job. */
export interface ActiveCron {
  /** Cron config. */
  config: CronJobConfig;
  /** The timer handle (setTimeout for deferred first run, then setInterval). */
  timer: ReturnType<typeof setInterval> | ReturnType<typeof setTimeout>;
  /** Interval in milliseconds. */
  intervalMs: number;
  /** Timestamp of last execution, or null if never run. */
  lastRun: Date | null;
}

/** Result of a completed cron job execution. */
export interface CronJobResult {
  /** The cron job identifier. */
  jobId: string;
  /** The shell command that was executed. */
  command: string;
  /** Captured stdout/stderr output. */
  output: string;
  /** Process exit code. */
  exitCode: number;
  /** When the job finished. */
  timestamp: Date;
  /** The schedule interval that triggered this run. */
  schedule: string;
}

/** Adapter for routing cron job results to an output destination. */
export interface OutputAdapter {
  /** Unique name for this adapter (e.g. `"telegram"`, `"local"`). */
  name: string;
  /** Send a cron job result to this adapter's destination. */
  send(result: CronJobResult): Promise<void>;
}

/** Status snapshot returned by getStatus(). */
export interface CronSchedulerStatus {
  /** Whether the scheduler is currently running. */
  running: boolean;
  /** Number of active cron jobs. */
  cronCount: number;
  /** Per-cron status details. */
  crons: {
    name: string;
    schedule: string;
    intervalMs: number;
    lastRun: Date | null;
  }[];
}
