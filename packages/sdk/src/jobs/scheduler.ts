import type {
  AutonomyRule,
  JobConfig,
  JobType,
  Suggestion,
} from "@locusai/shared";
import { EventEmitter } from "events";
import cron, { type ScheduledTask } from "node-cron";
import type { LocusClient } from "../index.js";
import type { JobRunner } from "./job-runner.js";
import type { ProposalEngine } from "./proposals/proposal-engine.js";

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
  PROPOSALS_GENERATED = "PROPOSALS_GENERATED",
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

export interface ProposalsGeneratedPayload {
  suggestions: Suggestion[];
}

// ============================================================================
// Proposal Scheduler Config
// ============================================================================

export interface ProposalSchedulerConfig {
  engine: ProposalEngine;
  projectPath: string;
  client: LocusClient;
  workspaceId: string;
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
  private proposalRunning = false;
  private proposalDebounceTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(
    private readonly runner: JobRunner,
    private readonly configLoader: ConfigLoader,
    private readonly emitter: EventEmitter,
    private readonly proposalConfig?: ProposalSchedulerConfig
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
    if (this.proposalDebounceTimer) {
      clearTimeout(this.proposalDebounceTimer);
      this.proposalDebounceTimer = null;
    }
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
        this.scheduleProposalCycle();
      });
  }

  // ── Proposal Cycle ────────────────────────────────────────────────────

  /**
   * Debounced check: wait 30s after the last job completes. If no more
   * jobs are running, trigger the proposal engine.
   */
  private scheduleProposalCycle(): void {
    if (!this.proposalConfig) return;

    if (this.proposalDebounceTimer) {
      clearTimeout(this.proposalDebounceTimer);
    }

    this.proposalDebounceTimer = setTimeout(() => {
      this.proposalDebounceTimer = null;
      if (this.runningJobs.size === 0) {
        this.runProposalCycle();
      }
    }, 30_000);
  }

  private async runProposalCycle(): Promise<void> {
    if (!this.proposalConfig || this.proposalRunning) return;
    this.proposalRunning = true;

    const { engine, projectPath, client, workspaceId } = this.proposalConfig;

    try {
      const suggestions = await engine.runProposalCycle(
        projectPath,
        client,
        workspaceId
      );

      if (suggestions.length > 0) {
        this.emitter.emit(SchedulerEvent.PROPOSALS_GENERATED, {
          suggestions,
        } satisfies ProposalsGeneratedPayload);
      }
    } catch (err) {
      console.error("[scheduler] Proposal cycle failed:", err);
    } finally {
      this.proposalRunning = false;
    }
  }
}
