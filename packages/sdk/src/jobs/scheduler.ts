import { EventEmitter } from "events";
import type { AutonomyRule, JobConfig, JobType } from "@locusai/shared";
import cron, { type ScheduledTask } from "node-cron";
import type { JobRunner } from "./job-runner.js";

// ============================================================================
// Scheduler Events
// ============================================================================

export enum SchedulerEvent {
  SCHEDULER_STARTED = "SCHEDULER_STARTED",
  SCHEDULER_STOPPED = "SCHEDULER_STOPPED",
  JOB_SCHEDULED = "JOB_SCHEDULED",
  JOB_TRIGGERED = "JOB_TRIGGERED",
  JOB_SKIPPED = "JOB_SKIPPED",
  CONFIG_RELOADED = "CONFIG_RELOADED",
}

export interface SchedulerStartedPayload {
  jobCount: number;
  jobs: Array<{ type: JobType; cronExpression: string }>;
}

export interface JobScheduledPayload {
  jobType: JobType;
  cronExpression: string;
}

export interface JobTriggeredPayload {
  jobType: JobType;
}

export interface JobSkippedPayload {
  jobType: JobType;
  reason: string;
}

export interface ConfigReloadedPayload {
  previousJobCount: number;
  newJobCount: number;
}

// ============================================================================
// Config Loader Function Type
// ============================================================================

export interface SchedulerConfig {
  jobConfigs: JobConfig[];
  autonomyRules: AutonomyRule[];
}

export type ConfigLoader = () => SchedulerConfig;

// ============================================================================
// Job Scheduler
// ============================================================================

export class JobScheduler {
  private tasks = new Map<JobType, ScheduledTask>();
  private runningJobs = new Set<JobType>();
  private currentConfigs: JobConfig[] = [];
  private currentAutonomyRules: AutonomyRule[] = [];

  constructor(
    private readonly runner: JobRunner,
    private readonly configLoader: ConfigLoader,
    private readonly emitter: EventEmitter
  ) {}

  start(): void {
    const { jobConfigs, autonomyRules } = this.configLoader();
    this.currentConfigs = jobConfigs;
    this.currentAutonomyRules = autonomyRules;

    const enabledConfigs = jobConfigs.filter(
      (c) => c.enabled && c.schedule.enabled
    );

    for (const config of enabledConfigs) {
      this.scheduleJob(config);
    }

    this.emitter.emit(SchedulerEvent.SCHEDULER_STARTED, {
      jobCount: enabledConfigs.length,
      jobs: enabledConfigs.map((c) => ({
        type: c.type,
        cronExpression: c.schedule.cronExpression,
      })),
    } satisfies SchedulerStartedPayload);
  }

  stop(): void {
    for (const [, task] of this.tasks) {
      task.stop();
    }
    this.tasks.clear();
    this.runningJobs.clear();
    this.emitter.emit(SchedulerEvent.SCHEDULER_STOPPED);
  }

  reload(): void {
    const previousJobCount = this.tasks.size;

    // Stop all existing tasks
    for (const [, task] of this.tasks) {
      task.stop();
    }
    this.tasks.clear();

    // Re-read config and reschedule
    const { jobConfigs, autonomyRules } = this.configLoader();
    this.currentConfigs = jobConfigs;
    this.currentAutonomyRules = autonomyRules;

    const enabledConfigs = jobConfigs.filter(
      (c) => c.enabled && c.schedule.enabled
    );

    for (const config of enabledConfigs) {
      this.scheduleJob(config);
    }

    this.emitter.emit(SchedulerEvent.CONFIG_RELOADED, {
      previousJobCount,
      newJobCount: enabledConfigs.length,
    } satisfies ConfigReloadedPayload);
  }

  getScheduledJobs(): Array<{ type: JobType; cronExpression: string }> {
    const result: Array<{ type: JobType; cronExpression: string }> = [];
    for (const config of this.currentConfigs) {
      if (this.tasks.has(config.type)) {
        result.push({
          type: config.type,
          cronExpression: config.schedule.cronExpression,
        });
      }
    }
    return result;
  }

  isRunning(jobType: JobType): boolean {
    return this.runningJobs.has(jobType);
  }

  private scheduleJob(config: JobConfig): void {
    const { type, schedule } = config;
    const { cronExpression } = schedule;

    if (!cron.validate(cronExpression)) {
      console.error(
        `Invalid cron expression for job ${type}: "${cronExpression}" — skipping`
      );
      return;
    }

    const task = cron.schedule(cronExpression, () => {
      this.triggerJob(type);
    });

    this.tasks.set(type, task);

    this.emitter.emit(SchedulerEvent.JOB_SCHEDULED, {
      jobType: type,
      cronExpression,
    } satisfies JobScheduledPayload);
  }

  private triggerJob(jobType: JobType): void {
    // Prevent overlapping runs
    if (this.runningJobs.has(jobType)) {
      this.emitter.emit(SchedulerEvent.JOB_SKIPPED, {
        jobType,
        reason: "Previous run still in progress",
      } satisfies JobSkippedPayload);
      return;
    }

    const config = this.currentConfigs.find((c) => c.type === jobType);
    if (!config) return;

    this.emitter.emit(SchedulerEvent.JOB_TRIGGERED, {
      jobType,
    } satisfies JobTriggeredPayload);

    this.runningJobs.add(jobType);

    this.runner
      .runJob(jobType, config, this.currentAutonomyRules)
      .catch(() => {
        // Errors are already handled and emitted by JobRunner
      })
      .finally(() => {
        this.runningJobs.delete(jobType);
      });
  }
}
