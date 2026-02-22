import { CreateJobRun, JobRun, UpdateJobRun } from "@locusai/shared";
import { BaseModule } from "./base.js";

interface JobRunResponse {
  jobRun: JobRun;
}

interface JobRunsResponse {
  jobRuns: JobRun[];
}

export interface JobRunListOptions {
  type?: string;
  status?: string;
  limit?: number;
}

export class JobsModule extends BaseModule {
  async create(workspaceId: string, data: CreateJobRun): Promise<JobRun> {
    const { data: res } = await this.api.post<JobRunResponse>(
      `/workspaces/${workspaceId}/job-runs`,
      data
    );
    return res.jobRun;
  }

  async list(
    workspaceId: string,
    params?: JobRunListOptions
  ): Promise<JobRun[]> {
    const { data } = await this.api.get<JobRunsResponse>(
      `/workspaces/${workspaceId}/job-runs`,
      { params }
    );
    return data.jobRuns;
  }

  async get(workspaceId: string, id: string): Promise<JobRun> {
    const { data } = await this.api.get<JobRunResponse>(
      `/workspaces/${workspaceId}/job-runs/${id}`
    );
    return data.jobRun;
  }

  async update(
    workspaceId: string,
    id: string,
    data: UpdateJobRun
  ): Promise<JobRun> {
    const { data: res } = await this.api.patch<JobRunResponse>(
      `/workspaces/${workspaceId}/job-runs/${id}`,
      data
    );
    return res.jobRun;
  }
}
