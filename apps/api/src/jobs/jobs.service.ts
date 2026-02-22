import {
  CreateJobRun,
  JobStatus,
  JobType,
  UpdateJobRun,
} from "@locusai/shared";
import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { JobRun } from "@/entities/job-run.entity";

@Injectable()
export class JobsService {
  constructor(
    @InjectRepository(JobRun)
    private readonly jobRunRepository: Repository<JobRun>
  ) {}

  async create(workspaceId: string, data: CreateJobRun): Promise<JobRun> {
    const jobRun = this.jobRunRepository.create({
      workspaceId,
      jobType: data.jobType,
      status: data.status ?? JobStatus.RUNNING,
      startedAt: data.startedAt ? new Date(data.startedAt) : new Date(),
      error: data.error ?? null,
      result: data.result ?? null,
    });

    const saved = await this.jobRunRepository.save(jobRun);
    return Array.isArray(saved) ? saved[0] : saved;
  }

  async findByWorkspace(
    workspaceId: string,
    filters?: { type?: JobType; status?: JobStatus; limit?: number }
  ): Promise<JobRun[]> {
    const where: Record<string, unknown> = { workspaceId };

    if (filters?.type) {
      where.jobType = filters.type;
    }
    if (filters?.status) {
      where.status = filters.status;
    }

    return this.jobRunRepository.find({
      where,
      order: { createdAt: "DESC" },
      take: filters?.limit ?? 50,
    });
  }

  async findOne(id: string): Promise<JobRun> {
    const jobRun = await this.jobRunRepository.findOne({ where: { id } });
    if (!jobRun) throw new NotFoundException("Job run not found");
    return jobRun;
  }

  async update(id: string, data: UpdateJobRun): Promise<JobRun> {
    const jobRun = await this.jobRunRepository.findOne({ where: { id } });
    if (!jobRun) throw new NotFoundException("Job run not found");

    if (data.status !== undefined) {
      jobRun.status = data.status;
    }
    if (data.result !== undefined) {
      jobRun.result = data.result;
    }
    if (data.error !== undefined) {
      jobRun.error = data.error;
    }
    if (data.completedAt !== undefined) {
      jobRun.completedAt = new Date(data.completedAt);
    }

    const saved = await this.jobRunRepository.save(jobRun);
    return Array.isArray(saved) ? saved[0] : saved;
  }
}
