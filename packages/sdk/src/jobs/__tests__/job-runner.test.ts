import { beforeEach, describe, expect, it, mock } from "bun:test";
import {
  type AutonomyRule,
  ChangeCategory,
  type JobConfig,
  JobSeverity,
  JobStatus,
  JobType,
  RiskLevel,
  SuggestionType,
} from "@locusai/shared";
import { EventEmitter } from "events";
import type { BaseJob, JobResult } from "../base-job.js";
import { JobRegistry } from "../job-registry.js";
import { JobEvent, JobRunner } from "../job-runner.js";

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

const RULES: AutonomyRule[] = [
  {
    category: ChangeCategory.STYLE,
    riskLevel: RiskLevel.LOW,
    autoExecute: true,
  },
];

function createMockClient() {
  const emitter = new EventEmitter();
  return {
    emitter,
    jobs: {
      create: mock(() =>
        Promise.resolve({
          id: "run-1",
          jobType: JobType.LINT_SCAN,
          status: JobStatus.RUNNING,
        })
      ),
      update: mock(() => Promise.resolve({})),
    },
    suggestions: {
      create: mock(() => Promise.resolve({ id: "sug-1" })),
    },
  } as any;
}

function createMockJob(result?: JobResult): BaseJob {
  return {
    type: JobType.LINT_SCAN,
    name: "Linting Scan",
    run: mock(() =>
      Promise.resolve(
        result ?? {
          summary: "No issues found",
          suggestions: [],
          filesChanged: 0,
        }
      )
    ),
  } as any;
}

// ── Tests ──────────────────────────────────────────────────────────────

describe("JobRegistry", () => {
  it("registers and retrieves a job", () => {
    const registry = new JobRegistry();
    const job = createMockJob();
    registry.register(job);

    expect(registry.get(JobType.LINT_SCAN)).toBe(job);
  });

  it("returns undefined for unregistered job", () => {
    const registry = new JobRegistry();
    expect(registry.get(JobType.DEPENDENCY_CHECK)).toBeUndefined();
  });

  it("getAll returns all registered jobs", () => {
    const registry = new JobRegistry();
    const job1 = createMockJob();
    const job2 = { ...createMockJob(), type: JobType.DEPENDENCY_CHECK } as any;

    registry.register(job1);
    registry.register(job2);

    expect(registry.getAll()).toHaveLength(2);
  });

  it("has returns true for registered job types", () => {
    const registry = new JobRegistry();
    registry.register(createMockJob());

    expect(registry.has(JobType.LINT_SCAN)).toBe(true);
    expect(registry.has(JobType.DEPENDENCY_CHECK)).toBe(false);
  });
});

describe("JobRunner", () => {
  let registry: JobRegistry;
  let client: ReturnType<typeof createMockClient>;
  let runner: JobRunner;

  beforeEach(() => {
    registry = new JobRegistry();
    client = createMockClient();
    runner = new JobRunner(registry, client, "/tmp/project", "ws-1");
  });

  describe("runJob", () => {
    it("throws when no handler is registered for the job type", async () => {
      await expect(
        runner.runJob(JobType.LINT_SCAN, makeConfig(), RULES)
      ).rejects.toThrow("No job handler registered for type: LINT_SCAN");
    });

    it("creates a job run record via the API", async () => {
      registry.register(createMockJob());

      await runner.runJob(JobType.LINT_SCAN, makeConfig(), RULES);

      expect(client.jobs.create).toHaveBeenCalledWith("ws-1", {
        jobType: JobType.LINT_SCAN,
        status: JobStatus.RUNNING,
        startedAt: expect.any(String),
      });
    });

    it("calls job.run() with correct context", async () => {
      const job = createMockJob();
      registry.register(job);

      const config = makeConfig();
      await runner.runJob(JobType.LINT_SCAN, config, RULES);

      expect(job.run).toHaveBeenCalledWith({
        workspaceId: "ws-1",
        projectPath: "/tmp/project",
        config,
        autonomyRules: RULES,
        client,
      });
    });

    it("updates job run on completion", async () => {
      registry.register(createMockJob());

      await runner.runJob(JobType.LINT_SCAN, makeConfig(), RULES);

      expect(client.jobs.update).toHaveBeenCalledWith("ws-1", "run-1", {
        status: JobStatus.COMPLETED,
        completedAt: expect.any(String),
        result: {
          summary: "No issues found",
          filesChanged: 0,
          prUrl: undefined,
          errors: undefined,
        },
      });
    });

    it("creates suggestions from job results", async () => {
      const result: JobResult = {
        summary: "Found 3 errors",
        suggestions: [
          {
            type: SuggestionType.CODE_FIX,
            title: "Fix lint errors",
            description: "Run linter --fix",
            metadata: { linter: "biome" },
          },
          {
            type: SuggestionType.CODE_FIX,
            title: "Fix warnings",
            description: "Review warnings",
          },
        ],
        filesChanged: 0,
      };

      registry.register(createMockJob(result));
      await runner.runJob(JobType.LINT_SCAN, makeConfig(), RULES);

      expect(client.suggestions.create).toHaveBeenCalledTimes(2);
      expect(client.suggestions.create).toHaveBeenCalledWith("ws-1", {
        type: SuggestionType.CODE_FIX,
        title: "Fix lint errors",
        description: "Run linter --fix",
        jobRunId: "run-1",
        metadata: { linter: "biome" },
      });
    });

    it("emits JOB_STARTED event", async () => {
      registry.register(createMockJob());

      const events: any[] = [];
      client.emitter.on(JobEvent.JOB_STARTED, (p: any) => events.push(p));

      await runner.runJob(JobType.LINT_SCAN, makeConfig(), RULES);

      expect(events).toHaveLength(1);
      expect(events[0]).toEqual({
        jobType: JobType.LINT_SCAN,
        jobRunId: "run-1",
      });
    });

    it("emits JOB_COMPLETED event on success", async () => {
      registry.register(createMockJob());

      const events: any[] = [];
      client.emitter.on(JobEvent.JOB_COMPLETED, (p: any) => events.push(p));

      await runner.runJob(JobType.LINT_SCAN, makeConfig(), RULES);

      expect(events).toHaveLength(1);
      expect(events[0].jobType).toBe(JobType.LINT_SCAN);
      expect(events[0].jobRunId).toBe("run-1");
      expect(events[0].result.summary).toBe("No issues found");
    });

    it("handles errors and marks job as FAILED", async () => {
      const failingJob = {
        type: JobType.LINT_SCAN,
        name: "Linting Scan",
        run: mock(() => Promise.reject(new Error("Linter crashed"))),
      } as any;
      registry.register(failingJob);

      await expect(
        runner.runJob(JobType.LINT_SCAN, makeConfig(), RULES)
      ).rejects.toThrow("Linter crashed");

      expect(client.jobs.update).toHaveBeenCalledWith("ws-1", "run-1", {
        status: JobStatus.FAILED,
        completedAt: expect.any(String),
        error: "Linter crashed",
      });
    });

    it("emits JOB_FAILED event on error", async () => {
      const failingJob = {
        type: JobType.LINT_SCAN,
        name: "Linting Scan",
        run: mock(() => Promise.reject(new Error("boom"))),
      } as any;
      registry.register(failingJob);

      const events: any[] = [];
      client.emitter.on(JobEvent.JOB_FAILED, (p: any) => events.push(p));

      try {
        await runner.runJob(JobType.LINT_SCAN, makeConfig(), RULES);
      } catch {
        /* expected error */
      }

      expect(events).toHaveLength(1);
      expect(events[0]).toEqual({
        jobType: JobType.LINT_SCAN,
        jobRunId: "run-1",
        error: "boom",
      });
    });

    it("swallows update failure on error path", async () => {
      const failingJob = {
        type: JobType.LINT_SCAN,
        name: "Linting Scan",
        run: mock(() => Promise.reject(new Error("original error"))),
      } as any;
      registry.register(failingJob);

      // Make the update call also fail
      client.jobs.update = mock(() => Promise.reject(new Error("API down")));

      // Should still throw the original error, not the update error
      await expect(
        runner.runJob(JobType.LINT_SCAN, makeConfig(), RULES)
      ).rejects.toThrow("original error");
    });
  });

  describe("runAllEnabled", () => {
    it("runs only enabled jobs", async () => {
      const lintJob = createMockJob();
      const depJob = {
        type: JobType.DEPENDENCY_CHECK,
        name: "Dependency Check",
        run: mock(() =>
          Promise.resolve({ summary: "ok", suggestions: [], filesChanged: 0 })
        ),
      } as any;

      registry.register(lintJob);
      registry.register(depJob);

      const configs = [
        makeConfig({ type: JobType.LINT_SCAN, enabled: true }),
        makeConfig({ type: JobType.DEPENDENCY_CHECK, enabled: false }),
      ];

      const results = await runner.runAllEnabled(configs, RULES);

      expect(results.size).toBe(1);
      expect(results.has(JobType.LINT_SCAN)).toBe(true);
      expect(results.has(JobType.DEPENDENCY_CHECK)).toBe(false);
    });

    it("skips jobs without registered handlers", async () => {
      registry.register(createMockJob());

      const configs = [
        makeConfig({ type: JobType.LINT_SCAN, enabled: true }),
        makeConfig({ type: JobType.DEPENDENCY_CHECK, enabled: true }),
      ];

      const results = await runner.runAllEnabled(configs, RULES);

      expect(results.size).toBe(1);
      expect(results.has(JobType.LINT_SCAN)).toBe(true);
    });

    it("continues running when individual jobs fail", async () => {
      const failJob = {
        type: JobType.LINT_SCAN,
        name: "Linting Scan",
        run: mock(() => Promise.reject(new Error("fail"))),
      } as any;
      const successJob = {
        type: JobType.DEPENDENCY_CHECK,
        name: "Dependency Check",
        run: mock(() =>
          Promise.resolve({ summary: "ok", suggestions: [], filesChanged: 0 })
        ),
      } as any;

      registry.register(failJob);
      registry.register(successJob);

      // Reset create mock to return different IDs
      let callCount = 0;
      client.jobs.create = mock(() => {
        callCount++;
        return Promise.resolve({ id: `run-${callCount}` });
      });

      const configs = [
        makeConfig({ type: JobType.LINT_SCAN, enabled: true }),
        makeConfig({ type: JobType.DEPENDENCY_CHECK, enabled: true }),
      ];

      const results = await runner.runAllEnabled(configs, RULES);

      // The failed job should not appear in results
      expect(results.has(JobType.LINT_SCAN)).toBe(false);
      // The successful job should be present
      expect(results.has(JobType.DEPENDENCY_CHECK)).toBe(true);
    });

    it("returns empty map when no jobs are enabled", async () => {
      const configs = [makeConfig({ type: JobType.LINT_SCAN, enabled: false })];

      const results = await runner.runAllEnabled(configs, RULES);
      expect(results.size).toBe(0);
    });
  });
});
