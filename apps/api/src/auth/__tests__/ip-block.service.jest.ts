import "reflect-metadata";
import "../../test-setup";

import { ForbiddenException, NotFoundException } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { IpBlock } from "@/entities/ip-block.entity";
import { IpBlockService } from "../ip-block.service";

describe("IpBlockService", () => {
  let service: IpBlockService;
  let mockRepository: {
    findOne: jest.Mock;
    save: jest.Mock;
    create: jest.Mock;
    delete: jest.Mock;
    createQueryBuilder: jest.Mock;
  };
  let mockQueryBuilder: {
    where: jest.Mock;
    andWhere: jest.Mock;
    orderBy: jest.Mock;
    getMany: jest.Mock;
  };

  const createMockIpBlock = (overrides: Partial<IpBlock> = {}): IpBlock =>
    ({
      id: "test-id",
      ipAddress: "192.168.1.1",
      failedAttempts: 0,
      blockedAt: null,
      blockExpiresAt: null,
      manuallyUnblocked: false,
      lastFailedAttempt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      ...overrides,
    }) as IpBlock;

  beforeEach(async () => {
    mockQueryBuilder = {
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      getMany: jest.fn().mockResolvedValue([]),
    };

    mockRepository = {
      findOne: jest.fn(),
      save: jest.fn(),
      create: jest.fn((data) => ({ ...createMockIpBlock(), ...data })),
      delete: jest.fn(),
      createQueryBuilder: jest.fn().mockReturnValue(mockQueryBuilder),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        IpBlockService,
        {
          provide: getRepositoryToken(IpBlock),
          useValue: mockRepository,
        },
      ],
    }).compile();

    service = module.get<IpBlockService>(IpBlockService);
  });

  describe("isIpBlocked", () => {
    it("should return false if no record exists", async () => {
      mockRepository.findOne.mockResolvedValue(null);

      const result = await service.isIpBlocked("192.168.1.1");

      expect(result).toBe(false);
      expect(mockRepository.findOne).toHaveBeenCalledWith({
        where: { ipAddress: "192.168.1.1" },
      });
    });

    it("should return false if IP was manually unblocked", async () => {
      mockRepository.findOne.mockResolvedValue(
        createMockIpBlock({
          blockedAt: new Date(),
          blockExpiresAt: new Date(Date.now() + 86400000),
          manuallyUnblocked: true,
        })
      );

      const result = await service.isIpBlocked("192.168.1.1");

      expect(result).toBe(false);
    });

    it("should return false if block has expired", async () => {
      mockRepository.findOne.mockResolvedValue(
        createMockIpBlock({
          blockedAt: new Date(Date.now() - 86400000 * 2),
          blockExpiresAt: new Date(Date.now() - 86400000),
        })
      );

      const result = await service.isIpBlocked("192.168.1.1");

      expect(result).toBe(false);
    });

    it("should return true if IP is actively blocked", async () => {
      mockRepository.findOne.mockResolvedValue(
        createMockIpBlock({
          blockedAt: new Date(),
          blockExpiresAt: new Date(Date.now() + 86400000),
        })
      );

      const result = await service.isIpBlocked("192.168.1.1");

      expect(result).toBe(true);
    });

    it("should return false if blockedAt is null even with future expiry", async () => {
      mockRepository.findOne.mockResolvedValue(
        createMockIpBlock({
          blockedAt: null,
          blockExpiresAt: new Date(Date.now() + 86400000),
        })
      );

      const result = await service.isIpBlocked("192.168.1.1");

      expect(result).toBe(false);
    });
  });

  describe("getIpStatus", () => {
    it("should return default status if no record exists", async () => {
      mockRepository.findOne.mockResolvedValue(null);

      const result = await service.getIpStatus("192.168.1.1");

      expect(result).toEqual({
        isBlocked: false,
        failedAttempts: 0,
        blockedAt: null,
        blockExpiresAt: null,
        remainingAttempts: 10,
      });
    });

    it("should return correct status for blocked IP", async () => {
      const blockedAt = new Date();
      const blockExpiresAt = new Date(Date.now() + 86400000);
      mockRepository.findOne.mockResolvedValue(
        createMockIpBlock({
          failedAttempts: 10,
          blockedAt,
          blockExpiresAt,
        })
      );

      const result = await service.getIpStatus("192.168.1.1");

      expect(result).toEqual({
        isBlocked: true,
        failedAttempts: 10,
        blockedAt,
        blockExpiresAt,
        remainingAttempts: 0,
      });
    });

    it("should return remaining attempts for unblocked IP", async () => {
      mockRepository.findOne.mockResolvedValue(
        createMockIpBlock({
          failedAttempts: 3,
        })
      );

      const result = await service.getIpStatus("192.168.1.1");

      expect(result).toEqual({
        isBlocked: false,
        failedAttempts: 3,
        blockedAt: null,
        blockExpiresAt: null,
        remainingAttempts: 7,
      });
    });

    it("should return 0 remaining attempts when at limit", async () => {
      mockRepository.findOne.mockResolvedValue(
        createMockIpBlock({
          failedAttempts: 10,
        })
      );

      const result = await service.getIpStatus("192.168.1.1");

      expect(result.remainingAttempts).toBe(0);
    });
  });

  describe("recordFailedAttempt", () => {
    it("should create new record for first failed attempt", async () => {
      mockRepository.findOne.mockResolvedValue(null);
      mockRepository.save.mockImplementation((data) =>
        Promise.resolve({ ...createMockIpBlock(), ...data })
      );

      await service.recordFailedAttempt("192.168.1.1");

      expect(mockRepository.create).toHaveBeenCalledWith({
        ipAddress: "192.168.1.1",
        failedAttempts: 0,
      });
      expect(mockRepository.save).toHaveBeenCalled();
    });

    it("should increment failed attempts for existing record", async () => {
      const existingRecord = createMockIpBlock({
        failedAttempts: 3,
      });
      mockRepository.findOne.mockResolvedValue(existingRecord);
      mockRepository.save.mockResolvedValue(existingRecord);

      await service.recordFailedAttempt("192.168.1.1");

      expect(mockRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          failedAttempts: 4,
          lastFailedAttempt: expect.any(Date),
        })
      );
    });

    it("should block IP after 10 failed attempts", async () => {
      const existingRecord = createMockIpBlock({
        failedAttempts: 9,
      });
      mockRepository.findOne.mockResolvedValue(existingRecord);
      mockRepository.save.mockResolvedValue(existingRecord);

      await service.recordFailedAttempt("192.168.1.1");

      expect(mockRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          failedAttempts: 10,
          blockedAt: expect.any(Date),
          blockExpiresAt: expect.any(Date),
        })
      );
    });

    it("should set block duration to 24 hours", async () => {
      const existingRecord = createMockIpBlock({
        failedAttempts: 9,
      });
      mockRepository.findOne.mockResolvedValue(existingRecord);
      mockRepository.save.mockImplementation((record) =>
        Promise.resolve(record)
      );

      const beforeTime = Date.now();
      await service.recordFailedAttempt("192.168.1.1");
      const afterTime = Date.now();

      const savedRecord = mockRepository.save.mock.calls[0][0];
      const expiryTime = savedRecord.blockExpiresAt.getTime();
      const expectedMinExpiry = beforeTime + 24 * 60 * 60 * 1000;
      const expectedMaxExpiry = afterTime + 24 * 60 * 60 * 1000;

      expect(expiryTime).toBeGreaterThanOrEqual(expectedMinExpiry);
      expect(expiryTime).toBeLessThanOrEqual(expectedMaxExpiry);
    });

    it("should reset counts if previously manually unblocked", async () => {
      const existingRecord = createMockIpBlock({
        failedAttempts: 5,
        blockedAt: new Date(),
        blockExpiresAt: new Date(Date.now() + 86400000),
        manuallyUnblocked: true,
      });
      mockRepository.findOne.mockResolvedValue(existingRecord);
      mockRepository.save.mockResolvedValue(existingRecord);

      await service.recordFailedAttempt("192.168.1.1");

      expect(mockRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          failedAttempts: 1,
          manuallyUnblocked: false,
          blockedAt: null,
          blockExpiresAt: null,
        })
      );
    });

    it("should reset counts if block has expired", async () => {
      const existingRecord = createMockIpBlock({
        failedAttempts: 10,
        blockedAt: new Date(Date.now() - 86400000 * 2),
        blockExpiresAt: new Date(Date.now() - 86400000),
      });
      mockRepository.findOne.mockResolvedValue(existingRecord);
      mockRepository.save.mockResolvedValue(existingRecord);

      await service.recordFailedAttempt("192.168.1.1");

      expect(mockRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          failedAttempts: 1,
          blockedAt: null,
          blockExpiresAt: null,
        })
      );
    });

    it("should not re-block if already blocked", async () => {
      const blockedAt = new Date();
      const blockExpiresAt = new Date(Date.now() + 86400000);
      const existingRecord = createMockIpBlock({
        failedAttempts: 15,
        blockedAt,
        blockExpiresAt,
      });
      mockRepository.findOne.mockResolvedValue(existingRecord);
      mockRepository.save.mockResolvedValue(existingRecord);

      await service.recordFailedAttempt("192.168.1.1");

      expect(mockRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          failedAttempts: 16,
          blockedAt,
          blockExpiresAt,
        })
      );
    });
  });

  describe("resetFailedAttempts", () => {
    it("should reset all fields for existing record", async () => {
      const existingRecord = createMockIpBlock({
        failedAttempts: 5,
        blockedAt: new Date(),
        blockExpiresAt: new Date(Date.now() + 86400000),
        manuallyUnblocked: true,
      });
      mockRepository.findOne.mockResolvedValue(existingRecord);
      mockRepository.save.mockResolvedValue(existingRecord);

      await service.resetFailedAttempts("192.168.1.1");

      expect(mockRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          failedAttempts: 0,
          blockedAt: null,
          blockExpiresAt: null,
          manuallyUnblocked: false,
        })
      );
    });

    it("should do nothing if record does not exist", async () => {
      mockRepository.findOne.mockResolvedValue(null);

      await service.resetFailedAttempts("192.168.1.1");

      expect(mockRepository.save).not.toHaveBeenCalled();
    });
  });

  describe("unblockIp", () => {
    it("should manually unblock an IP", async () => {
      const existingRecord = createMockIpBlock({
        failedAttempts: 10,
        blockedAt: new Date(),
        blockExpiresAt: new Date(Date.now() + 86400000),
      });
      mockRepository.findOne.mockResolvedValue(existingRecord);
      mockRepository.save.mockResolvedValue(existingRecord);

      await service.unblockIp("192.168.1.1");

      expect(mockRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          manuallyUnblocked: true,
          failedAttempts: 0,
          blockedAt: null,
          blockExpiresAt: null,
        })
      );
    });

    it("should throw NotFoundException if IP not found", async () => {
      mockRepository.findOne.mockResolvedValue(null);

      await expect(service.unblockIp("192.168.1.1")).rejects.toThrow(
        NotFoundException
      );
      await expect(service.unblockIp("192.168.1.1")).rejects.toThrow(
        "IP address 192.168.1.1 not found"
      );
    });
  });

  describe("getBlockedIps", () => {
    it("should return all actively blocked IPs", async () => {
      const blockedIps = [
        createMockIpBlock({
          ipAddress: "192.168.1.1",
          blockedAt: new Date(),
          blockExpiresAt: new Date(Date.now() + 86400000),
        }),
        createMockIpBlock({
          ipAddress: "192.168.1.2",
          blockedAt: new Date(),
          blockExpiresAt: new Date(Date.now() + 86400000),
        }),
      ];
      mockQueryBuilder.getMany.mockResolvedValue(blockedIps);

      const result = await service.getBlockedIps();

      expect(result).toEqual(blockedIps);
      expect(mockQueryBuilder.where).toHaveBeenCalledWith(
        "ip_block.blocked_at IS NOT NULL"
      );
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        "ip_block.manually_unblocked = :unblocked",
        { unblocked: false }
      );
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        "ip_block.block_expires_at > :now",
        { now: expect.any(Date) }
      );
      expect(mockQueryBuilder.orderBy).toHaveBeenCalledWith(
        "ip_block.blocked_at",
        "DESC"
      );
    });

    it("should return empty array if no blocked IPs", async () => {
      mockQueryBuilder.getMany.mockResolvedValue([]);

      const result = await service.getBlockedIps();

      expect(result).toEqual([]);
    });
  });

  describe("assertNotBlocked", () => {
    it("should not throw if IP is not blocked", async () => {
      mockRepository.findOne.mockResolvedValue(null);

      await expect(
        service.assertNotBlocked("192.168.1.1")
      ).resolves.not.toThrow();
    });

    it("should throw ForbiddenException if IP is blocked", async () => {
      const blockExpiresAt = new Date(Date.now() + 86400000);
      mockRepository.findOne.mockResolvedValue(
        createMockIpBlock({
          failedAttempts: 10,
          blockedAt: new Date(),
          blockExpiresAt,
        })
      );

      await expect(service.assertNotBlocked("192.168.1.1")).rejects.toThrow(
        ForbiddenException
      );
    });

    it("should include block expiry time in exception", async () => {
      const blockExpiresAt = new Date(Date.now() + 86400000);
      mockRepository.findOne.mockResolvedValue(
        createMockIpBlock({
          failedAttempts: 10,
          blockedAt: new Date(),
          blockExpiresAt,
        })
      );

      try {
        await service.assertNotBlocked("192.168.1.1");
        throw new Error("Expected ForbiddenException to be thrown");
      } catch (error) {
        expect(error).toBeInstanceOf(ForbiddenException);
        const response = (error as ForbiddenException).getResponse();
        expect(response).toMatchObject({
          message:
            "Your IP address has been temporarily blocked due to too many failed login attempts",
          code: "IP_BLOCKED",
          blockExpiresAt: blockExpiresAt.toISOString(),
        });
      }
    });
  });

  describe("cleanupExpiredBlocks", () => {
    it("should delete expired blocks and return count", async () => {
      mockRepository.delete.mockResolvedValue({ affected: 5 });

      const result = await service.cleanupExpiredBlocks();

      expect(result).toBe(5);
      expect(mockRepository.delete).toHaveBeenCalledWith({
        blockExpiresAt: expect.anything(),
        manuallyUnblocked: false,
      });
    });

    it("should return 0 if no expired blocks", async () => {
      mockRepository.delete.mockResolvedValue({ affected: 0 });

      const result = await service.cleanupExpiredBlocks();

      expect(result).toBe(0);
    });

    it("should return 0 if affected is undefined", async () => {
      mockRepository.delete.mockResolvedValue({});

      const result = await service.cleanupExpiredBlocks();

      expect(result).toBe(0);
    });
  });
});
