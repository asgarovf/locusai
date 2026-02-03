import "reflect-metadata";
import "../../test-setup";

import { Test, TestingModule } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { AuditLog } from "@/entities/audit-log.entity";
import { AuditLogService, AuditLogFilters } from "../audit-logs.service";

// Mock console.error to avoid noise in tests
const consoleErrorSpy = jest.spyOn(console, "error").mockImplementation();

describe("AuditLogService", () => {
  let service: AuditLogService;
  let mockRepository: {
    create: jest.Mock;
    save: jest.Mock;
    findAndCount: jest.Mock;
    find: jest.Mock;
    createQueryBuilder: jest.Mock;
  };
  let mockQueryBuilder: {
    leftJoinAndSelect: jest.Mock;
    orderBy: jest.Mock;
    andWhere: jest.Mock;
    skip: jest.Mock;
    take: jest.Mock;
    getManyAndCount: jest.Mock;
  };

  const createMockAuditLog = (overrides: Partial<AuditLog> = {}): AuditLog =>
    ({
      id: "audit-log-1",
      userId: "user-1",
      action: "TEST_ACTION",
      resource: "test",
      resourceId: "resource-1",
      ipAddress: "192.168.1.1",
      userAgent: "Test Browser",
      metadata: null,
      createdAt: new Date(),
      user: null,
      ...overrides,
    }) as AuditLog;

  beforeEach(async () => {
    mockQueryBuilder = {
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
    };

    mockRepository = {
      create: jest.fn((data) => ({ ...createMockAuditLog(), ...data })),
      save: jest.fn().mockResolvedValue(createMockAuditLog()),
      findAndCount: jest.fn().mockResolvedValue([[], 0]),
      find: jest.fn().mockResolvedValue([]),
      createQueryBuilder: jest.fn().mockReturnValue(mockQueryBuilder),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuditLogService,
        {
          provide: getRepositoryToken(AuditLog),
          useValue: mockRepository,
        },
      ],
    }).compile();

    service = module.get<AuditLogService>(AuditLogService);
    consoleErrorSpy.mockClear();
  });

  afterAll(() => {
    consoleErrorSpy.mockRestore();
  });

  describe("log", () => {
    it("should create and save an audit log entry", () => {
      service.log("USER_LOGIN", "auth", "user-1", { status: "success" }, {
        ipAddress: "192.168.1.1",
        userAgent: "Chrome",
        resourceId: "resource-123",
      });

      expect(mockRepository.create).toHaveBeenCalledWith({
        action: "USER_LOGIN",
        resource: "auth",
        userId: "user-1",
        metadata: { status: "success" },
        ipAddress: "192.168.1.1",
        userAgent: "Chrome",
        resourceId: "resource-123",
      });
      expect(mockRepository.save).toHaveBeenCalled();
    });

    it("should handle null values for optional parameters", () => {
      service.log("ANONYMOUS_ACTION", null, null);

      expect(mockRepository.create).toHaveBeenCalledWith({
        action: "ANONYMOUS_ACTION",
        resource: null,
        userId: null,
        metadata: null,
        ipAddress: null,
        userAgent: null,
        resourceId: null,
      });
    });

    it("should not block on save errors (fire-and-forget)", async () => {
      const saveError = new Error("Database error");
      mockRepository.save.mockRejectedValue(saveError);

      // This should not throw
      service.log("TEST_ACTION", "test", "user-1");

      // Wait for the promise to settle
      await new Promise((resolve) => setImmediate(resolve));

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        "[AuditLogService] Failed to log audit event:",
        saveError
      );
    });

    it("should handle undefined metadata", () => {
      service.log("TEST_ACTION", "test", "user-1", undefined);

      expect(mockRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          metadata: null,
        })
      );
    });

    it("should handle undefined options fields", () => {
      service.log("TEST_ACTION", "test", "user-1", null, {});

      expect(mockRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          ipAddress: null,
          userAgent: null,
          resourceId: null,
        })
      );
    });
  });

  describe("getByUser", () => {
    it("should return paginated audit logs for a user", async () => {
      const mockLogs = [createMockAuditLog(), createMockAuditLog()];
      mockRepository.findAndCount.mockResolvedValue([mockLogs, 2]);

      const result = await service.getByUser("user-1", { skip: 0, take: 50 });

      expect(result).toEqual({ logs: mockLogs, total: 2 });
      expect(mockRepository.findAndCount).toHaveBeenCalledWith({
        where: { userId: "user-1" },
        order: { createdAt: "DESC" },
        skip: 0,
        take: 50,
        relations: ["user"],
      });
    });

    it("should use default pagination values", async () => {
      mockRepository.findAndCount.mockResolvedValue([[], 0]);

      await service.getByUser("user-1");

      expect(mockRepository.findAndCount).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 0,
          take: 50,
        })
      );
    });

    it("should handle custom pagination", async () => {
      mockRepository.findAndCount.mockResolvedValue([[], 0]);

      await service.getByUser("user-1", { skip: 100, take: 25 });

      expect(mockRepository.findAndCount).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 100,
          take: 25,
        })
      );
    });
  });

  describe("getByResource", () => {
    it("should return logs for a resource ID", async () => {
      const mockLogs = [createMockAuditLog()];
      mockRepository.find.mockResolvedValue(mockLogs);

      const result = await service.getByResource("resource-1");

      expect(result).toEqual(mockLogs);
      expect(mockRepository.find).toHaveBeenCalledWith({
        where: { resourceId: "resource-1" },
        order: { createdAt: "DESC" },
        relations: ["user"],
      });
    });

    it("should filter by resource type when provided", async () => {
      mockRepository.find.mockResolvedValue([]);

      await service.getByResource("resource-1", "task");

      expect(mockRepository.find).toHaveBeenCalledWith({
        where: { resourceId: "resource-1", resource: "task" },
        order: { createdAt: "DESC" },
        relations: ["user"],
      });
    });

    it("should not include resource type in query when not provided", async () => {
      mockRepository.find.mockResolvedValue([]);

      await service.getByResource("resource-1");

      const callArg = mockRepository.find.mock.calls[0][0];
      expect(callArg.where).not.toHaveProperty("resource");
    });
  });

  describe("search", () => {
    it("should return paginated results with default pagination", async () => {
      const mockLogs = [createMockAuditLog()];
      mockQueryBuilder.getManyAndCount.mockResolvedValue([mockLogs, 1]);

      const result = await service.search({});

      expect(result).toEqual({ logs: mockLogs, total: 1 });
      expect(mockQueryBuilder.skip).toHaveBeenCalledWith(0);
      expect(mockQueryBuilder.take).toHaveBeenCalledWith(50);
    });

    it("should filter by userId", async () => {
      mockQueryBuilder.getManyAndCount.mockResolvedValue([[], 0]);

      await service.search({ userId: "user-1" });

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        "log.userId = :userId",
        { userId: "user-1" }
      );
    });

    it("should filter by action", async () => {
      mockQueryBuilder.getManyAndCount.mockResolvedValue([[], 0]);

      await service.search({ action: "USER_LOGIN" });

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        "log.action = :action",
        { action: "USER_LOGIN" }
      );
    });

    it("should filter by resource", async () => {
      mockQueryBuilder.getManyAndCount.mockResolvedValue([[], 0]);

      await service.search({ resource: "auth" });

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        "log.resource = :resource",
        { resource: "auth" }
      );
    });

    it("should filter by resourceId", async () => {
      mockQueryBuilder.getManyAndCount.mockResolvedValue([[], 0]);

      await service.search({ resourceId: "task-123" });

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        "log.resourceId = :resourceId",
        { resourceId: "task-123" }
      );
    });

    it("should filter by ipAddress", async () => {
      mockQueryBuilder.getManyAndCount.mockResolvedValue([[], 0]);

      await service.search({ ipAddress: "192.168.1.1" });

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        "log.ipAddress = :ipAddress",
        { ipAddress: "192.168.1.1" }
      );
    });

    it("should filter by startDate", async () => {
      mockQueryBuilder.getManyAndCount.mockResolvedValue([[], 0]);
      const startDate = new Date("2024-01-01");

      await service.search({ startDate });

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        "log.createdAt >= :startDate",
        { startDate }
      );
    });

    it("should filter by endDate", async () => {
      mockQueryBuilder.getManyAndCount.mockResolvedValue([[], 0]);
      const endDate = new Date("2024-12-31");

      await service.search({ endDate });

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        "log.createdAt <= :endDate",
        { endDate }
      );
    });

    it("should apply multiple filters", async () => {
      mockQueryBuilder.getManyAndCount.mockResolvedValue([[], 0]);
      const filters: AuditLogFilters = {
        userId: "user-1",
        action: "USER_LOGIN",
        resource: "auth",
        ipAddress: "192.168.1.1",
        startDate: new Date("2024-01-01"),
        endDate: new Date("2024-12-31"),
        skip: 10,
        take: 20,
      };

      await service.search(filters);

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledTimes(6);
      expect(mockQueryBuilder.skip).toHaveBeenCalledWith(10);
      expect(mockQueryBuilder.take).toHaveBeenCalledWith(20);
    });

    it("should use custom pagination", async () => {
      mockQueryBuilder.getManyAndCount.mockResolvedValue([[], 0]);

      await service.search({ skip: 50, take: 100 });

      expect(mockQueryBuilder.skip).toHaveBeenCalledWith(50);
      expect(mockQueryBuilder.take).toHaveBeenCalledWith(100);
    });

    it("should order by createdAt DESC", async () => {
      mockQueryBuilder.getManyAndCount.mockResolvedValue([[], 0]);

      await service.search({});

      expect(mockQueryBuilder.orderBy).toHaveBeenCalledWith(
        "log.createdAt",
        "DESC"
      );
    });

    it("should join with user relation", async () => {
      mockQueryBuilder.getManyAndCount.mockResolvedValue([[], 0]);

      await service.search({});

      expect(mockQueryBuilder.leftJoinAndSelect).toHaveBeenCalledWith(
        "log.user",
        "user"
      );
    });
  });
});
