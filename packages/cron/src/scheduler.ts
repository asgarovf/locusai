/**
 * CronScheduler — manages user-defined cron jobs.
 *
 * Each cron job executes a shell command on a human-readable interval
 * and writes output to a per-job log file in .locus/cron/<job-name>/.
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
  private cronBaseDir: string;

  constructor(
    private config: CronConfig,
    private cwd: string
  ) {
    this.cronBaseDir = join(cwd, ".locus", "cron");
  }

  /** Start all configured cron jobs. */
  start(): void {
    if (this.running) return;

    // Ensure base output directory exists
    if (!existsSync(this.cronBaseDir)) {
      mkdirSync(this.cronBaseDir, { recursive: true });
    }

    for (const cronConfig of this.config.crons) {
      const intervalMs = parseSchedule(cronConfig.schedule);
      if (!intervalMs) {
        this.logForJob(
          cronConfig.name,
          `[error] Invalid schedule: "${cronConfig.schedule}". Use formats like 30m, 1h, 1d.`
        );
        continue;
      }

      // Ensure per-job output directory exists
      const jobDir = join(this.cronBaseDir, cronConfig.name);
      if (!existsSync(jobDir)) {
        mkdirSync(jobDir, { recursive: true });
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
    this.logGlobal(
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
    this.logGlobal("[info] Cron scheduler stopped");
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
        this.logForJob(name, `[${timestamp}] ${output}`);
      }
    } catch (error: unknown) {
      const errMsg = error instanceof Error ? error.message : String(error);
      this.logForJob(name, `[${timestamp}] ERROR: ${errMsg}`);
    }
  }

  /** Append a line to a job-specific log file at .locus/cron/<name>/output.log. */
  private logForJob(name: string, message: string): void {
    const jobDir = join(this.cronBaseDir, name);
    if (!existsSync(jobDir)) {
      mkdirSync(jobDir, { recursive: true });
    }
    const logPath = join(jobDir, "output.log");
    try {
      appendFileSync(logPath, `${message}\n`);
    } catch {
      console.error(message);
    }
  }

  /** Append a line to the global scheduler log at .locus/cron/scheduler.log. */
  private logGlobal(message: string): void {
    const logPath = join(this.cronBaseDir, "scheduler.log");
    try {
      appendFileSync(logPath, `${message}\n`);
    } catch {
      console.error(message);
    }
  }
}
