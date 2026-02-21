import {
  type AutonomyRule,
  type JobConfig,
  JobStatus,
  type JobType,
} from "@locusai/shared";
import type { LocusClient } from "../index.js";
import type { JobContext, JobResult } from "./base-job.js";
import type { JobRegistry } from "./job-registry.js";

// ============================================================================
// Job Lifecycle Events
// ============================================================================

export enum JobEvent {
  JOB_STARTED = "JOB_STARTED",
  JOB_COMPLETED = "JOB_COMPLETED",
  JOB_FAILED = "JOB_FAILED",
}

export interface JobStartedPayload {
  jobType: JobType;
  jobRunId: string;
}

export interface JobCompletedPayload {
  jobType: JobType;
  jobRunId: string;
  result: JobResult;
}

export interface JobFailedPayload {
  jobType: JobType;
  jobRunId: string;
  error: string;
}

// ============================================================================
// Job Runner
// ============================================================================

export class JobRunner {
  constructor(
    private readonly registry: JobRegistry,
    private readonly client: LocusClient,
    private readonly projectPath: string,
    private readonly workspaceId: string
  ) {}

  async runJob(
    jobType: JobType,
    config: JobConfig,
    autonomyRules: AutonomyRule[]
  ): Promise<JobResult> {
    const job = this.registry.get(jobType);
    if (!job) {
      throw new Error(`No job handler registered for type: ${jobType}`);
    }

    // Create a job run record via API
    const jobRun = await this.client.jobs.create(this.workspaceId, {
      jobType,
      status: JobStatus.RUNNING,
      startedAt: new Date().toISOString(),
    });

    this.client.emitter.emit(JobEvent.JOB_STARTED, {
      jobType,
      jobRunId: jobRun.id,
    } satisfies JobStartedPayload);

    const context: JobContext = {
      workspaceId: this.workspaceId,
      projectPath: this.projectPath,
      config,
      autonomyRules,
      client: this.client,
    };

    try {
      const result = await job.run(context);

      // Update job run with completed status
      await this.client.jobs.update(this.workspaceId, jobRun.id, {
        status: JobStatus.COMPLETED,
        completedAt: new Date().toISOString(),
        result: {
          summary: result.summary,
          filesChanged: result.filesChanged,
          prUrl: result.prUrl,
          errors: result.errors,
        },
      });

      // Create suggestion records for each suggestion
      for (const suggestion of result.suggestions) {
        await this.client.suggestions.create(this.workspaceId, {
          type: suggestion.type,
          title: suggestion.title,
          description: suggestion.description,
          jobRunId: jobRun.id,
          metadata: suggestion.metadata,
        });
      }

      this.client.emitter.emit(JobEvent.JOB_COMPLETED, {
        jobType,
        jobRunId: jobRun.id,
        result,
      } satisfies JobCompletedPayload);

      return result;
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : String(err);

      // Update job run with failed status
      await this.client.jobs
        .update(this.workspaceId, jobRun.id, {
          status: JobStatus.FAILED,
          completedAt: new Date().toISOString(),
          error: errorMessage,
        })
        .catch(() => {
          // Swallow update errors — the original error is more important
        });

      this.client.emitter.emit(JobEvent.JOB_FAILED, {
        jobType,
        jobRunId: jobRun.id,
        error: errorMessage,
      } satisfies JobFailedPayload);

      throw err;
    }
  }

  async runAllEnabled(
    configs: JobConfig[],
    autonomyRules: AutonomyRule[]
  ): Promise<Map<JobType, JobResult>> {
    const results = new Map<JobType, JobResult>();

    const enabledConfigs = configs.filter(
      (c) => c.enabled && this.registry.has(c.type)
    );

    // Run sequentially to avoid resource contention
    for (const config of enabledConfigs) {
      try {
        const result = await this.runJob(config.type, config, autonomyRules);
        results.set(config.type, result);
      } catch {
        // Individual job failures don't stop the batch.
        // The error is already recorded in the API and emitted via events.
      }
    }

    return results;
  }
}
