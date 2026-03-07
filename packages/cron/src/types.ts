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
}

/** Cron package configuration stored under `packages.cron` in `.locus/config.json`. */
export interface CronConfig {
  /** Whether the cron scheduler is active. Defaults to `false`. */
  enabled: boolean;
  /** User-defined cron jobs. */
  crons: CronJobConfig[];
}

/** Runtime state for a single active cron job. */
export interface ActiveCron {
  /** Cron config. */
  config: CronJobConfig;
  /** The interval timer handle. */
  timer: ReturnType<typeof setInterval>;
  /** Interval in milliseconds. */
  intervalMs: number;
  /** Timestamp of last execution, or null if never run. */
  lastRun: Date | null;
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
