/**
 * CronScheduler — manages user-defined cron jobs.
 *
 * Each cron job executes a shell command on a human-readable interval
 * and writes output to a log file in .locus/cron/.
 */

import { exec as execCb } from "node:child_process";
import { appendFileSync, existsSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { promisify } from "node:util";
import { parseSchedule } from "./parse-schedule.js";
import type { ActiveCron, CronConfig, CronSchedulerStatus } from "./types.js";

const exec = promisify(execCb);

export class CronScheduler {
  private activeCrons: Map<string, ActiveCron> = new Map();
  private running = false;
  private outputDir: string;

  constructor(
    private config: CronConfig,
    private cwd: string
  ) {
    this.outputDir = join(cwd, ".locus", "cron");
  }

  /** Start all configured cron jobs. */
  start(): void {
    if (this.running) return;

    // Ensure output directory exists
    if (!existsSync(this.outputDir)) {
      mkdirSync(this.outputDir, { recursive: true });
    }

    for (const cronConfig of this.config.crons) {
      const intervalMs = parseSchedule(cronConfig.schedule);
      if (!intervalMs) {
        this.log(
          `[error] Invalid schedule for "${cronConfig.name}": "${cronConfig.schedule}". Use formats like 30m, 1h, 1d.`
        );
        continue;
      }

      // Execute immediately on start, then on interval
      this.executeCron(cronConfig.name);

      const timer = setInterval(() => {
        this.executeCron(cronConfig.name);
      }, intervalMs);

      this.activeCrons.set(cronConfig.name, {
        config: cronConfig,
        timer,
        intervalMs,
        lastRun: null,
      });
    }

    this.running = true;
    this.log(
      `[info] Cron scheduler started with ${this.activeCrons.size} job(s)`
    );
  }

  /** Stop all cron jobs and clean up. */
  stop(): void {
    if (!this.running) return;

    for (const active of this.activeCrons.values()) {
      clearInterval(active.timer);
    }
    this.activeCrons.clear();
    this.running = false;
    this.log("[info] Cron scheduler stopped");
  }

  /** Get current scheduler status. */
  getStatus(): CronSchedulerStatus {
    const crons = Array.from(this.activeCrons.values()).map((active) => ({
      name: active.config.name,
      schedule: active.config.schedule,
      intervalMs: active.intervalMs,
      lastRun: active.lastRun,
    }));

    return {
      running: this.running,
      cronCount: this.activeCrons.size,
      crons,
    };
  }

  /** Execute a single cron job by name. */
  private async executeCron(name: string): Promise<void> {
    const active = this.activeCrons.get(name);
    if (!active) return;

    active.lastRun = new Date();
    const timestamp = active.lastRun.toISOString();

    try {
      const { stdout, stderr } = await exec(active.config.command, {
        timeout: 30_000,
        cwd: this.cwd,
      });

      const output = (stdout || stderr || "").trim();
      if (output) {
        this.log(`[${timestamp}] [${name}] ${output}`);
      }
    } catch (error: unknown) {
      const errMsg = error instanceof Error ? error.message : String(error);
      this.log(`[${timestamp}] [${name}] ERROR: ${errMsg}`);
    }
  }

  /** Append a line to the output log. */
  private log(message: string): void {
    const logPath = join(this.outputDir, "output.log");
    try {
      appendFileSync(logPath, `${message}\n`);
    } catch {
      // If we can't write to log, write to stderr as fallback
      console.error(message);
    }
  }
}
