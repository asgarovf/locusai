import "reflect-metadata";
import "../../test-setup";

import {
  SuggestionStatus,
  SuggestionType,
  SUGGESTION_TTL_HOURS,
} from "@locusai/shared";
import { BadRequestException, NotFoundException } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Suggestion } from "@/entities/suggestion.entity";
import { SuggestionsService } from "../suggestions.service";

describe("SuggestionsService", () => {
  let service: SuggestionsService;
  let repository: jest.Mocked<Repository<Suggestion>>;
  let mockQueryBuilder: any;

  beforeEach(async () => {
    mockQueryBuilder = {
      update: jest.fn().mockReturnThis(),
      set: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      execute: jest.fn().mockResolvedValue({ affected: 0 }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SuggestionsService,
        {
          provide: getRepositoryToken(Suggestion),
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
            find: jest.fn(),
            findOne: jest.fn(),
            createQueryBuilder: jest.fn().mockReturnValue(mockQueryBuilder),
          },
        },
      ],
    }).compile();

    service = module.get<SuggestionsService>(SuggestionsService);
    repository = module.get(getRepositoryToken(Suggestion));
  });

  describe("create", () => {
    it("creates a suggestion with auto-calculated expiration", async () => {
      const suggestion = {
        id: "sug-1",
        workspaceId: "ws-1",
        type: SuggestionType.CODE_FIX,
        title: "Fix lint errors",
        description: "Run biome --fix",
        status: SuggestionStatus.NEW,
      };
      repository.create.mockReturnValue(suggestion as any);
      repository.save.mockResolvedValue(suggestion as any);

      const before = Date.now();
      const result = await service.create("ws-1", {
        type: SuggestionType.CODE_FIX,
        title: "Fix lint errors",
        description: "Run biome --fix",
      });
      const after = Date.now();

      expect(repository.create).toHaveBeenCalledWith({
        workspaceId: "ws-1",
        type: SuggestionType.CODE_FIX,
        title: "Fix lint errors",
        description: "Run biome --fix",
        jobRunId: null,
        metadata: null,
        expiresAt: expect.any(Date),
      });

      // Verify the expiration is approximately TTL hours from now
      const createCall = repository.create.mock.calls[0][0] as any;
      const expiresAtMs = createCall.expiresAt.getTime();
      const expectedMs = SUGGESTION_TTL_HOURS * 60 * 60 * 1000;
      expect(expiresAtMs).toBeGreaterThanOrEqual(before + expectedMs - 1000);
      expect(expiresAtMs).toBeLessThanOrEqual(after + expectedMs + 1000);

      expect(result).toEqual(suggestion);
    });

    it("uses provided expiresAt when specified", async () => {
      const expiresAt = "2026-03-01T00:00:00Z";
      const suggestion = { id: "sug-1" };
      repository.create.mockReturnValue(suggestion as any);
      repository.save.mockResolvedValue(suggestion as any);

      await service.create("ws-1", {
        type: SuggestionType.CODE_FIX,
        title: "Test",
        description: "desc",
        expiresAt,
      });

      expect(repository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          expiresAt: new Date(expiresAt),
        })
      );
    });

    it("sets jobRunId when provided", async () => {
      const suggestion = { id: "sug-1" };
      repository.create.mockReturnValue(suggestion as any);
      repository.save.mockResolvedValue(suggestion as any);

      await service.create("ws-1", {
        type: SuggestionType.CODE_FIX,
        title: "Fix",
        description: "desc",
        jobRunId: "run-42",
      });

      expect(repository.create).toHaveBeenCalledWith(
        expect.objectContaining({ jobRunId: "run-42" })
      );
    });

    it("sets metadata when provided", async () => {
      const metadata = { linter: "biome", errors: 5 };
      const suggestion = { id: "sug-1" };
      repository.create.mockReturnValue(suggestion as any);
      repository.save.mockResolvedValue(suggestion as any);

      await service.create("ws-1", {
        type: SuggestionType.CODE_FIX,
        title: "Fix",
        description: "desc",
        metadata,
      });

      expect(repository.create).toHaveBeenCalledWith(
        expect.objectContaining({ metadata })
      );
    });

    it("handles batch save response (array)", async () => {
      const suggestion = { id: "sug-1" };
      repository.create.mockReturnValue(suggestion as any);
      repository.save.mockResolvedValue([suggestion] as any);

      const result = await service.create("ws-1", {
        type: SuggestionType.CODE_FIX,
        title: "Fix",
        description: "desc",
      });

      expect(result).toEqual(suggestion);
    });
  });

  describe("findByWorkspace", () => {
    it("returns suggestions for a workspace", async () => {
      const suggestions = [
        { id: "sug-1", workspaceId: "ws-1" },
        { id: "sug-2", workspaceId: "ws-1" },
      ];
      repository.find.mockResolvedValue(suggestions as any);

      const result = await service.findByWorkspace("ws-1");

      expect(repository.find).toHaveBeenCalledWith({
        where: { workspaceId: "ws-1" },
        order: { createdAt: "DESC" },
      });
      expect(result).toEqual(suggestions);
    });

    it("applies status filter", async () => {
      repository.find.mockResolvedValue([]);

      await service.findByWorkspace("ws-1", {
        status: SuggestionStatus.NEW,
      });

      expect(repository.find).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { workspaceId: "ws-1", status: SuggestionStatus.NEW },
        })
      );
    });
  });

  describe("findOne", () => {
    it("returns a suggestion by ID", async () => {
      const suggestion = { id: "sug-1", title: "Fix lint" };
      repository.findOne.mockResolvedValue(suggestion as any);

      const result = await service.findOne("sug-1");

      expect(repository.findOne).toHaveBeenCalledWith({
        where: { id: "sug-1" },
      });
      expect(result).toEqual(suggestion);
    });

    it("throws NotFoundException when not found", async () => {
      repository.findOne.mockResolvedValue(null);

      await expect(service.findOne("nonexistent")).rejects.toThrow(
        NotFoundException
      );
    });
  });

  describe("updateStatus", () => {
    it("allows valid transition: NEW → NOTIFIED", async () => {
      const suggestion = {
        id: "sug-1",
        status: SuggestionStatus.NEW,
      };
      repository.findOne.mockResolvedValue(suggestion as any);
      repository.save.mockResolvedValue({
        ...suggestion,
        status: SuggestionStatus.NOTIFIED,
      } as any);

      const result = await service.updateStatus(
        "sug-1",
        SuggestionStatus.NOTIFIED
      );

      expect(result.status).toBe(SuggestionStatus.NOTIFIED);
    });

    it("allows valid transition: NEW → ACTED_ON", async () => {
      const suggestion = {
        id: "sug-1",
        status: SuggestionStatus.NEW,
      };
      repository.findOne.mockResolvedValue(suggestion as any);
      repository.save.mockResolvedValue({
        ...suggestion,
        status: SuggestionStatus.ACTED_ON,
      } as any);

      const result = await service.updateStatus(
        "sug-1",
        SuggestionStatus.ACTED_ON
      );

      expect(result.status).toBe(SuggestionStatus.ACTED_ON);
    });

    it("allows valid transition: NEW → SKIPPED", async () => {
      const suggestion = {
        id: "sug-1",
        status: SuggestionStatus.NEW,
      };
      repository.findOne.mockResolvedValue(suggestion as any);
      repository.save.mockResolvedValue({
        ...suggestion,
        status: SuggestionStatus.SKIPPED,
      } as any);

      const result = await service.updateStatus(
        "sug-1",
        SuggestionStatus.SKIPPED
      );

      expect(result.status).toBe(SuggestionStatus.SKIPPED);
    });

    it("allows valid transition: NEW → EXPIRED", async () => {
      const suggestion = {
        id: "sug-1",
        status: SuggestionStatus.NEW,
      };
      repository.findOne.mockResolvedValue(suggestion as any);
      repository.save.mockResolvedValue({
        ...suggestion,
        status: SuggestionStatus.EXPIRED,
      } as any);

      const result = await service.updateStatus(
        "sug-1",
        SuggestionStatus.EXPIRED
      );

      expect(result.status).toBe(SuggestionStatus.EXPIRED);
    });

    it("allows valid transition: NOTIFIED → ACTED_ON", async () => {
      const suggestion = {
        id: "sug-1",
        status: SuggestionStatus.NOTIFIED,
      };
      repository.findOne.mockResolvedValue(suggestion as any);
      repository.save.mockResolvedValue({
        ...suggestion,
        status: SuggestionStatus.ACTED_ON,
      } as any);

      const result = await service.updateStatus(
        "sug-1",
        SuggestionStatus.ACTED_ON
      );

      expect(result.status).toBe(SuggestionStatus.ACTED_ON);
    });

    it("rejects invalid transition: ACTED_ON → NEW", async () => {
      const suggestion = {
        id: "sug-1",
        status: SuggestionStatus.ACTED_ON,
      };
      repository.findOne.mockResolvedValue(suggestion as any);

      await expect(
        service.updateStatus("sug-1", SuggestionStatus.NEW)
      ).rejects.toThrow(BadRequestException);
    });

    it("rejects invalid transition: SKIPPED → NOTIFIED", async () => {
      const suggestion = {
        id: "sug-1",
        status: SuggestionStatus.SKIPPED,
      };
      repository.findOne.mockResolvedValue(suggestion as any);

      await expect(
        service.updateStatus("sug-1", SuggestionStatus.NOTIFIED)
      ).rejects.toThrow(BadRequestException);
    });

    it("rejects invalid transition: EXPIRED → ACTED_ON", async () => {
      const suggestion = {
        id: "sug-1",
        status: SuggestionStatus.EXPIRED,
      };
      repository.findOne.mockResolvedValue(suggestion as any);

      await expect(
        service.updateStatus("sug-1", SuggestionStatus.ACTED_ON)
      ).rejects.toThrow(BadRequestException);
    });

    it("includes transition details in error message", async () => {
      const suggestion = {
        id: "sug-1",
        status: SuggestionStatus.ACTED_ON,
      };
      repository.findOne.mockResolvedValue(suggestion as any);

      await expect(
        service.updateStatus("sug-1", SuggestionStatus.NEW)
      ).rejects.toThrow(/ACTED_ON.*NEW/);
    });

    it("throws NotFoundException when suggestion not found", async () => {
      repository.findOne.mockResolvedValue(null);

      await expect(
        service.updateStatus("nonexistent", SuggestionStatus.NOTIFIED)
      ).rejects.toThrow(NotFoundException);
    });

    it("handles batch save response (array)", async () => {
      const suggestion = {
        id: "sug-1",
        status: SuggestionStatus.NEW,
      };
      repository.findOne.mockResolvedValue(suggestion as any);
      repository.save.mockResolvedValue([
        { ...suggestion, status: SuggestionStatus.NOTIFIED },
      ] as any);

      const result = await service.updateStatus(
        "sug-1",
        SuggestionStatus.NOTIFIED
      );

      expect(result.status).toBe(SuggestionStatus.NOTIFIED);
    });
  });

  describe("markNotified", () => {
    it("transitions suggestion to NOTIFIED status", async () => {
      const suggestion = {
        id: "sug-1",
        status: SuggestionStatus.NEW,
      };
      repository.findOne.mockResolvedValue(suggestion as any);
      repository.save.mockResolvedValue({
        ...suggestion,
        status: SuggestionStatus.NOTIFIED,
      } as any);

      const result = await service.markNotified("sug-1");

      expect(result.status).toBe(SuggestionStatus.NOTIFIED);
    });
  });

  describe("expireStale", () => {
    it("marks stale NEW/NOTIFIED suggestions as EXPIRED", async () => {
      mockQueryBuilder.execute.mockResolvedValue({ affected: 3 });

      const result = await service.expireStale();

      expect(result).toBe(3);
      expect(repository.createQueryBuilder).toHaveBeenCalled();
      expect(mockQueryBuilder.update).toHaveBeenCalled();
      expect(mockQueryBuilder.set).toHaveBeenCalledWith({
        status: SuggestionStatus.EXPIRED,
      });
      expect(mockQueryBuilder.where).toHaveBeenCalledWith(
        "status IN (:...statuses)",
        {
          statuses: [SuggestionStatus.NEW, SuggestionStatus.NOTIFIED],
        }
      );
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        "expires_at < :now",
        { now: expect.any(Date) }
      );
    });

    it("returns 0 when no stale suggestions exist", async () => {
      mockQueryBuilder.execute.mockResolvedValue({ affected: 0 });

      const result = await service.expireStale();

      expect(result).toBe(0);
    });

    it("handles null affected count", async () => {
      mockQueryBuilder.execute.mockResolvedValue({ affected: null });

      const result = await service.expireStale();

      expect(result).toBe(0);
    });
  });
});
