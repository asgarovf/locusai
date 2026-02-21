import type { JobType } from "@locusai/shared";
import type { BaseJob } from "./base-job.js";

export class JobRegistry {
  private jobs = new Map<JobType, BaseJob>();

  register(job: BaseJob): void {
    this.jobs.set(job.type, job);
  }

  get(type: JobType): BaseJob | undefined {
    return this.jobs.get(type);
  }

  getAll(): BaseJob[] {
    return Array.from(this.jobs.values());
  }

  has(type: JobType): boolean {
    return this.jobs.has(type);
  }
}
