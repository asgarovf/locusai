import { afterEach, beforeEach, describe, expect, it, mock } from "bun:test";
import {
  type AutonomyRule,
  ChangeCategory,
  type JobConfig,
  JobSeverity,
  JobType,
  RiskLevel,
} from "@locusai/shared";
import { EventEmitter } from "events";
import {
  type ConfigLoader,
  JobScheduler,
  SchedulerEvent,
} from "../scheduler.js";

// ── Helpers ────────────────────────────────────────────────────────────

function makeConfig(overrides: Partial<JobConfig> = {}): JobConfig {
  return {
    type: JobType.LINT_SCAN,
    schedule: { cronExpression: "0 2 * * *", enabled: true },
    severity: JobSeverity.AUTO_EXECUTE,
    enabled: true,
    options: {},
    ...overrides,
  };
}

const DEFAULT_RULES: AutonomyRule[] = [
  {
    category: ChangeCategory.STYLE,
    riskLevel: RiskLevel.LOW,
    autoExecute: true,
  },
];

function createMockRunner() {
  return {
    runJob: mock(() =>
      Promise.resolve({ summary: "ok", suggestions: [], filesChanged: 0 })
    ),
  } as any;
}

// ── Tests ──────────────────────────────────────────────────────────────

describe("JobScheduler", () => {
  let emitter: EventEmitter;
  let runner: ReturnType<typeof createMockRunner>;
  let scheduler: JobScheduler;
  let configs: JobConfig[];

  beforeEach(() => {
    emitter = new EventEmitter();
    runner = createMockRunner();
    configs = [
      makeConfig({ type: JobType.LINT_SCAN, enabled: true }),
      makeConfig({
        type: JobType.DEPENDENCY_CHECK,
        enabled: true,
        schedule: { cronExpression: "0 3 * * *", enabled: true },
      }),
    ];
  });

  afterEach(() => {
    scheduler?.stop();
  });

  describe("start", () => {
    it("creates cron tasks for enabled jobs", () => {
      const loader: ConfigLoader = () => ({
        jobConfigs: configs,
        autonomyRules: DEFAULT_RULES,
      });

      scheduler = new JobScheduler(runner, loader, emitter);

      const events: any[] = [];
      emitter.on(SchedulerEvent.JOB_SCHEDULED, (p: any) => events.push(p));

      scheduler.start();

      expect(events).toHaveLength(2);
      expect(events[0].jobType).toBe(JobType.LINT_SCAN);
      expect(events[1].jobType).toBe(JobType.DEPENDENCY_CHECK);
    });

    it("emits SCHEDULER_STARTED with correct job count", () => {
      const loader: ConfigLoader = () => ({
        jobConfigs: configs,
        autonomyRules: DEFAULT_RULES,
      });

      scheduler = new JobScheduler(runner, loader, emitter);

      let startedPayload: any;
      emitter.on(SchedulerEvent.SCHEDULER_STARTED, (p: any) => {
        startedPayload = p;
      });

      scheduler.start();

      expect(startedPayload.jobCount).toBe(2);
      expect(startedPayload.jobs).toHaveLength(2);
    });

    it("skips disabled jobs", () => {
      configs[1].enabled = false;

      const loader: ConfigLoader = () => ({
        jobConfigs: configs,
        autonomyRules: DEFAULT_RULES,
      });

      scheduler = new JobScheduler(runner, loader, emitter);

      let startedPayload: any;
      emitter.on(SchedulerEvent.SCHEDULER_STARTED, (p: any) => {
        startedPayload = p;
      });

      scheduler.start();

      expect(startedPayload.jobCount).toBe(1);
    });

    it("skips jobs with disabled schedules", () => {
      configs[0].schedule.enabled = false;

      const loader: ConfigLoader = () => ({
        jobConfigs: configs,
        autonomyRules: DEFAULT_RULES,
      });

      scheduler = new JobScheduler(runner, loader, emitter);

      let startedPayload: any;
      emitter.on(SchedulerEvent.SCHEDULER_STARTED, (p: any) => {
        startedPayload = p;
      });

      scheduler.start();

      expect(startedPayload.jobCount).toBe(1);
      expect(startedPayload.jobs[0].type).toBe(JobType.DEPENDENCY_CHECK);
    });
  });

  describe("stop", () => {
    it("emits SCHEDULER_STOPPED", () => {
      const loader: ConfigLoader = () => ({
        jobConfigs: configs,
        autonomyRules: DEFAULT_RULES,
      });

      scheduler = new JobScheduler(runner, loader, emitter);
      scheduler.start();

      let stopped = false;
      emitter.on(SchedulerEvent.SCHEDULER_STOPPED, () => {
        stopped = true;
      });

      scheduler.stop();

      expect(stopped).toBe(true);
    });

    it("clears all scheduled tasks", () => {
      const loader: ConfigLoader = () => ({
        jobConfigs: configs,
        autonomyRules: DEFAULT_RULES,
      });

      scheduler = new JobScheduler(runner, loader, emitter);
      scheduler.start();

      expect(scheduler.getScheduledJobs()).toHaveLength(2);

      scheduler.stop();

      expect(scheduler.getScheduledJobs()).toHaveLength(0);
    });
  });

  describe("reload", () => {
    it("emits CONFIG_RELOADED with previous and new counts", () => {
      let callCount = 0;
      const loader: ConfigLoader = () => {
        callCount++;
        if (callCount === 1) {
          return { jobConfigs: configs, autonomyRules: DEFAULT_RULES };
        }
        // Second call returns only one config
        return {
          jobConfigs: [configs[0]],
          autonomyRules: DEFAULT_RULES,
        };
      };

      scheduler = new JobScheduler(runner, loader, emitter);
      scheduler.start();

      let reloadPayload: any;
      emitter.on(SchedulerEvent.CONFIG_RELOADED, (p: any) => {
        reloadPayload = p;
      });

      scheduler.reload();

      expect(reloadPayload.previousJobCount).toBe(2);
      expect(reloadPayload.newJobCount).toBe(1);
    });

    it("reschedules jobs after reload", () => {
      const loader: ConfigLoader = () => {
        return { jobConfigs: configs, autonomyRules: DEFAULT_RULES };
      };

      scheduler = new JobScheduler(runner, loader, emitter);
      scheduler.start();
      scheduler.reload();

      expect(scheduler.getScheduledJobs()).toHaveLength(2);
    });
  });

  describe("getScheduledJobs", () => {
    it("returns scheduled job types and cron expressions", () => {
      const loader: ConfigLoader = () => ({
        jobConfigs: configs,
        autonomyRules: DEFAULT_RULES,
      });

      scheduler = new JobScheduler(runner, loader, emitter);
      scheduler.start();

      const jobs = scheduler.getScheduledJobs();

      expect(jobs).toEqual([
        { type: JobType.LINT_SCAN, cronExpression: "0 2 * * *" },
        { type: JobType.DEPENDENCY_CHECK, cronExpression: "0 3 * * *" },
      ]);
    });
  });

  describe("isRunning", () => {
    it("returns false when no job is executing", () => {
      const loader: ConfigLoader = () => ({
        jobConfigs: configs,
        autonomyRules: DEFAULT_RULES,
      });

      scheduler = new JobScheduler(runner, loader, emitter);
      scheduler.start();

      expect(scheduler.isRunning(JobType.LINT_SCAN)).toBe(false);
    });
  });

  describe("overlapping run prevention", () => {
    it("skips job trigger when previous run is still in progress", async () => {
      // Create a runner that takes a long time
      let resolveJob: (() => void) | undefined;
      const slowRunner = {
        runJob: mock(
          () =>
            new Promise<any>((resolve) => {
              resolveJob = () =>
                resolve({
                  summary: "ok",
                  suggestions: [],
                  filesChanged: 0,
                });
            })
        ),
      } as any;

      const loader: ConfigLoader = () => ({
        jobConfigs: [makeConfig({ type: JobType.LINT_SCAN })],
        autonomyRules: DEFAULT_RULES,
      });

      scheduler = new JobScheduler(slowRunner, loader, emitter);
      scheduler.start();

      const skippedEvents: any[] = [];
      emitter.on(SchedulerEvent.JOB_SKIPPED, (p: any) => skippedEvents.push(p));

      // Trigger the job manually via the private method
      (scheduler as any).triggerJob(JobType.LINT_SCAN);

      // Job should now be running
      expect(scheduler.isRunning(JobType.LINT_SCAN)).toBe(true);

      // Trigger again while running
      (scheduler as any).triggerJob(JobType.LINT_SCAN);

      expect(skippedEvents).toHaveLength(1);
      expect(skippedEvents[0].reason).toContain("still in progress");

      // Clean up
      resolveJob?.();
      // Wait for promise to settle
      await new Promise((r) => setTimeout(r, 10));
    });
  });

  describe("invalid cron expression", () => {
    it("skips job with invalid cron expression", () => {
      const invalidConfigs = [
        makeConfig({
          type: JobType.LINT_SCAN,
          schedule: { cronExpression: "invalid-cron", enabled: true },
        }),
      ];

      const loader: ConfigLoader = () => ({
        jobConfigs: invalidConfigs,
        autonomyRules: DEFAULT_RULES,
      });

      scheduler = new JobScheduler(runner, loader, emitter);

      // Should not throw
      scheduler.start();

      // The invalid job should be counted in enabled configs but not scheduled
      expect(scheduler.getScheduledJobs()).toHaveLength(0);
    });
  });
});
