import "reflect-metadata";
import "../../test-setup"; // Shared entity mocks - must be before other imports

import * as crypto from "node:crypto";
import { UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { Test, TestingModule } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { DataSource } from "typeorm";
import { EmailService } from "@/common/services/email.service";
import { ApiKey } from "@/entities/api-key.entity";
import { UsersService } from "@/users/users.service";
import { AuthService } from "../auth.service";
import { OtpService } from "../otp.service";

describe("AuthService - API Key Validation", () => {
  let service: AuthService;
  let apiKeyRepository: any;

  beforeEach(async () => {
    apiKeyRepository = {
      findOne: jest.fn(),
      save: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: UsersService,
          useValue: { findByEmail: jest.fn(), findById: jest.fn() },
        },
        {
          provide: JwtService,
          useValue: { sign: jest.fn() },
        },
        {
          provide: OtpService,
          useValue: {
            generateOtp: jest.fn(),
            verifyOtp: jest.fn(),
            invalidateOtp: jest.fn(),
          },
        },
        {
          provide: EmailService,
          useValue: {
            sendOtpEmail: jest.fn(),
            sendWelcomeEmail: jest.fn(),
          },
        },
        {
          provide: DataSource,
          useValue: { query: jest.fn(), transaction: jest.fn() },
        },
        {
          provide: getRepositoryToken(ApiKey),
          useValue: apiKeyRepository,
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  describe("validateApiKey", () => {
    it("should reject invalid API key with UnauthorizedException", async () => {
      apiKeyRepository.findOne.mockResolvedValue(null);

      await expect(service.validateApiKey("lk_invalid_key")).rejects.toThrow(
        UnauthorizedException
      );
      await expect(service.validateApiKey("lk_invalid_key")).rejects.toThrow(
        "Invalid API key"
      );
    });

    it("should validate a correct active API key", async () => {
      const rawKey = "lk_test_valid_key_123";
      const keyHash = crypto.createHash("sha256").update(rawKey).digest("hex");

      apiKeyRepository.findOne.mockResolvedValue({
        id: "key-1",
        keyHash,
        name: "Test Key",
        active: true,
        organizationId: "org-1",
        workspaceId: "ws-1",
        lastUsedAt: null,
      });

      const result = await service.validateApiKey(rawKey);

      expect(result).toEqual({
        authType: "api_key",
        apiKeyId: "key-1",
        apiKeyName: "Test Key",
        orgId: "org-1",
        workspaceId: "ws-1",
      });
    });

    it("should reject inactive API keys", async () => {
      // findOne with active: true will not find inactive keys
      apiKeyRepository.findOne.mockResolvedValue(null);

      await expect(service.validateApiKey("lk_inactive_key")).rejects.toThrow(
        UnauthorizedException
      );
    });

    it("should update lastUsedAt when not recently used", async () => {
      const rawKey = "lk_test_key";
      apiKeyRepository.findOne.mockResolvedValue({
        id: "key-1",
        name: "Test Key",
        active: true,
        organizationId: "org-1",
        workspaceId: null,
        lastUsedAt: null, // Never used before
      });

      await service.validateApiKey(rawKey);

      expect(apiKeyRepository.save).toHaveBeenCalled();
      const savedKey = apiKeyRepository.save.mock.calls[0][0];
      expect(savedKey.lastUsedAt).toBeInstanceOf(Date);
    });

    it("should throttle lastUsedAt updates to once per minute", async () => {
      const rawKey = "lk_test_key";
      const recentUsedAt = new Date(); // Just used

      apiKeyRepository.findOne.mockResolvedValue({
        id: "key-1",
        name: "Test Key",
        active: true,
        organizationId: "org-1",
        workspaceId: null,
        lastUsedAt: recentUsedAt,
      });

      await service.validateApiKey(rawKey);

      // Should NOT save since lastUsedAt is recent (within 1 minute)
      expect(apiKeyRepository.save).not.toHaveBeenCalled();
    });

    it("should update lastUsedAt when more than a minute has passed", async () => {
      const rawKey = "lk_test_key";
      const oldUsedAt = new Date(Date.now() - 2 * 60 * 1000); // 2 minutes ago

      apiKeyRepository.findOne.mockResolvedValue({
        id: "key-1",
        name: "Test Key",
        active: true,
        organizationId: "org-1",
        workspaceId: null,
        lastUsedAt: oldUsedAt,
      });

      await service.validateApiKey(rawKey);

      expect(apiKeyRepository.save).toHaveBeenCalled();
    });

    it("should hash the API key with SHA-256 for lookup", async () => {
      const rawKey = "lk_my_secret_key";
      const expectedHash = crypto
        .createHash("sha256")
        .update(rawKey)
        .digest("hex");

      apiKeyRepository.findOne.mockResolvedValue(null);

      try {
        await service.validateApiKey(rawKey);
      } catch {
        // Expected to throw
      }

      expect(apiKeyRepository.findOne).toHaveBeenCalledWith({
        where: { keyHash: expectedHash, active: true },
        relations: ["organization"],
      });
    });

    it("should return correct ApiKeyAuthUser structure", async () => {
      const rawKey = "lk_test";
      apiKeyRepository.findOne.mockResolvedValue({
        id: "key-1",
        name: "My Key",
        active: true,
        organizationId: "org-abc",
        workspaceId: "ws-xyz",
        lastUsedAt: null,
      });

      const result = await service.validateApiKey(rawKey);

      expect(result.authType).toBe("api_key");
      expect(result.apiKeyId).toBe("key-1");
      expect(result.apiKeyName).toBe("My Key");
      expect(result.orgId).toBe("org-abc");
      expect(result.workspaceId).toBe("ws-xyz");
    });

    it("should handle null organizationId and workspaceId", async () => {
      const rawKey = "lk_test";
      apiKeyRepository.findOne.mockResolvedValue({
        id: "key-1",
        name: "My Key",
        active: true,
        organizationId: null,
        workspaceId: null,
        lastUsedAt: null,
      });

      const result = await service.validateApiKey(rawKey);

      expect(result.orgId).toBeUndefined();
      expect(result.workspaceId).toBeUndefined();
    });
  });
});
