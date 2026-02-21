import "reflect-metadata";
import "../../test-setup";

import { JobStatus, JobType } from "@locusai/shared";
import { NotFoundException } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { JobRun } from "@/entities/job-run.entity";
import { JobsService } from "../jobs.service";

describe("JobsService", () => {
  let service: JobsService;
  let repository: jest.Mocked<Repository<JobRun>>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JobsService,
        {
          provide: getRepositoryToken(JobRun),
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
            find: jest.fn(),
            findOne: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<JobsService>(JobsService);
    repository = module.get(getRepositoryToken(JobRun));
  });

  describe("create", () => {
    it("creates a job run with RUNNING status by default", async () => {
      const jobRun = {
        id: "run-1",
        workspaceId: "ws-1",
        jobType: JobType.LINT_SCAN,
        status: JobStatus.RUNNING,
        startedAt: new Date(),
      };
      repository.create.mockReturnValue(jobRun as any);
      repository.save.mockResolvedValue(jobRun as any);

      const result = await service.create("ws-1", {
        jobType: JobType.LINT_SCAN,
      });

      expect(repository.create).toHaveBeenCalledWith({
        workspaceId: "ws-1",
        jobType: JobType.LINT_SCAN,
        status: JobStatus.RUNNING,
        startedAt: expect.any(Date),
        error: null,
        result: null,
      });
      expect(result).toEqual(jobRun);
    });

    it("uses provided status when specified", async () => {
      const jobRun = {
        id: "run-1",
        status: JobStatus.IDLE,
      };
      repository.create.mockReturnValue(jobRun as any);
      repository.save.mockResolvedValue(jobRun as any);

      await service.create("ws-1", {
        jobType: JobType.LINT_SCAN,
        status: JobStatus.IDLE,
      });

      expect(repository.create).toHaveBeenCalledWith(
        expect.objectContaining({ status: JobStatus.IDLE })
      );
    });

    it("uses provided startedAt date", async () => {
      const startedAt = "2026-01-15T10:00:00Z";
      const jobRun = { id: "run-1" };
      repository.create.mockReturnValue(jobRun as any);
      repository.save.mockResolvedValue(jobRun as any);

      await service.create("ws-1", {
        jobType: JobType.LINT_SCAN,
        startedAt,
      });

      expect(repository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          startedAt: new Date(startedAt),
        })
      );
    });

    it("handles batch save response (array)", async () => {
      const jobRun = { id: "run-1" };
      repository.create.mockReturnValue(jobRun as any);
      repository.save.mockResolvedValue([jobRun] as any);

      const result = await service.create("ws-1", {
        jobType: JobType.LINT_SCAN,
      });

      expect(result).toEqual(jobRun);
    });
  });

  describe("findByWorkspace", () => {
    it("returns job runs for a workspace", async () => {
      const runs = [
        { id: "run-1", workspaceId: "ws-1" },
        { id: "run-2", workspaceId: "ws-1" },
      ];
      repository.find.mockResolvedValue(runs as any);

      const result = await service.findByWorkspace("ws-1");

      expect(repository.find).toHaveBeenCalledWith({
        where: { workspaceId: "ws-1" },
        order: { createdAt: "DESC" },
        take: 50,
      });
      expect(result).toEqual(runs);
    });

    it("applies type filter", async () => {
      repository.find.mockResolvedValue([]);

      await service.findByWorkspace("ws-1", { type: JobType.LINT_SCAN });

      expect(repository.find).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { workspaceId: "ws-1", jobType: JobType.LINT_SCAN },
        })
      );
    });

    it("applies status filter", async () => {
      repository.find.mockResolvedValue([]);

      await service.findByWorkspace("ws-1", { status: JobStatus.COMPLETED });

      expect(repository.find).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { workspaceId: "ws-1", status: JobStatus.COMPLETED },
        })
      );
    });

    it("applies limit filter", async () => {
      repository.find.mockResolvedValue([]);

      await service.findByWorkspace("ws-1", { limit: 10 });

      expect(repository.find).toHaveBeenCalledWith(
        expect.objectContaining({ take: 10 })
      );
    });
  });

  describe("findOne", () => {
    it("returns a job run by ID", async () => {
      const jobRun = { id: "run-1", jobType: JobType.LINT_SCAN };
      repository.findOne.mockResolvedValue(jobRun as any);

      const result = await service.findOne("run-1");

      expect(repository.findOne).toHaveBeenCalledWith({
        where: { id: "run-1" },
      });
      expect(result).toEqual(jobRun);
    });

    it("throws NotFoundException when job run not found", async () => {
      repository.findOne.mockResolvedValue(null);

      await expect(service.findOne("nonexistent")).rejects.toThrow(
        NotFoundException
      );
    });
  });

  describe("update", () => {
    it("updates job run status", async () => {
      const jobRun = {
        id: "run-1",
        status: JobStatus.RUNNING,
        result: null,
        error: null,
        completedAt: null,
      };
      repository.findOne.mockResolvedValue(jobRun as any);
      repository.save.mockResolvedValue({
        ...jobRun,
        status: JobStatus.COMPLETED,
      } as any);

      const result = await service.update("run-1", {
        status: JobStatus.COMPLETED,
      });

      expect(result.status).toBe(JobStatus.COMPLETED);
    });

    it("updates job run result", async () => {
      const jobRun = {
        id: "run-1",
        status: JobStatus.RUNNING,
        result: null,
        error: null,
      };
      repository.findOne.mockResolvedValue(jobRun as any);

      const resultData = {
        summary: "Fixed 3 issues",
        filesChanged: 2,
      };
      repository.save.mockResolvedValue({
        ...jobRun,
        result: resultData,
      } as any);

      await service.update("run-1", { result: resultData });

      expect(repository.save).toHaveBeenCalledWith(
        expect.objectContaining({ result: resultData })
      );
    });

    it("updates job run error message", async () => {
      const jobRun = {
        id: "run-1",
        status: JobStatus.RUNNING,
        result: null,
        error: null,
      };
      repository.findOne.mockResolvedValue(jobRun as any);
      repository.save.mockResolvedValue({
        ...jobRun,
        error: "Linter crashed",
      } as any);

      await service.update("run-1", { error: "Linter crashed" });

      expect(repository.save).toHaveBeenCalledWith(
        expect.objectContaining({ error: "Linter crashed" })
      );
    });

    it("updates completedAt timestamp", async () => {
      const jobRun = {
        id: "run-1",
        status: JobStatus.RUNNING,
        result: null,
        error: null,
        completedAt: null,
      };
      repository.findOne.mockResolvedValue(jobRun as any);

      const completedAt = "2026-01-15T12:00:00Z";
      repository.save.mockResolvedValue({
        ...jobRun,
        completedAt: new Date(completedAt),
      } as any);

      await service.update("run-1", { completedAt });

      expect(repository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          completedAt: new Date(completedAt),
        })
      );
    });

    it("throws NotFoundException when job run not found", async () => {
      repository.findOne.mockResolvedValue(null);

      await expect(
        service.update("nonexistent", { status: JobStatus.COMPLETED })
      ).rejects.toThrow(NotFoundException);
    });

    it("handles batch save response (array)", async () => {
      const jobRun = { id: "run-1", status: JobStatus.RUNNING };
      repository.findOne.mockResolvedValue(jobRun as any);
      repository.save.mockResolvedValue([
        { ...jobRun, status: JobStatus.COMPLETED },
      ] as any);

      const result = await service.update("run-1", {
        status: JobStatus.COMPLETED,
      });

      expect(result.status).toBe(JobStatus.COMPLETED);
    });
  });
});
