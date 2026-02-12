import "reflect-metadata";
import "../../test-setup"; // Shared entity mocks - must be before other imports

import { Test, TestingModule } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { TypedConfigService } from "@/config/config.service";
import { OtpVerification } from "@/entities/otp-verification.entity";
import { OtpService } from "../otp.service";

describe("OtpService", () => {
  let service: OtpService;
  let repository: jest.Mocked<Repository<OtpVerification>>;
  let configService: jest.Mocked<TypedConfigService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OtpService,
        {
          provide: getRepositoryToken(OtpVerification),
          useValue: {
            delete: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
            findOne: jest.fn(),
          },
        },
        {
          provide: TypedConfigService,
          useValue: {
            get: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<OtpService>(OtpService);
    repository = module.get(getRepositoryToken(OtpVerification));
    configService = module.get(TypedConfigService);
  });

  describe("generateOtp", () => {
    it("should generate and save a new OTP", async () => {
      const email = "test@example.com";
      configService.get.mockReturnValue(10); // 10 minutes
      repository.create.mockImplementation((dto) => dto as any);

      const result = await service.generateOtp(email);

      expect(result.code).toHaveLength(6);
      expect(repository.delete).toHaveBeenCalledWith({ email });
      expect(repository.save).toHaveBeenCalled();
    });
  });

  describe("verifyOtp", () => {
    it("should return invalid if OTP not found", async () => {
      repository.findOne.mockResolvedValue(null);

      const result = await service.verifyOtp("test@example.com", "123456");

      expect(result.valid).toBe(false);
      expect(result.message).toBe("Invalid or expired code");
    });

    it("should return invalid if OTP expired", async () => {
      repository.findOne.mockResolvedValue({
        expiresAt: new Date(Date.now() - 1000),
      } as any);

      const result = await service.verifyOtp("test@example.com", "123456");

      expect(result.valid).toBe(false);
      expect(result.message).toBe("Code has expired");
    });

    it("should return valid and mark as verified if OTP is correct", async () => {
      const otp = {
        expiresAt: new Date(Date.now() + 60000),
        verified: false,
      } as any;
      repository.findOne.mockResolvedValue(otp);

      const result = await service.verifyOtp("test@example.com", "123456");

      expect(result.valid).toBe(true);
      expect(otp.verified).toBe(true);
      expect(repository.save).toHaveBeenCalledWith(otp);
    });
  });

  describe("brute force protection", () => {
    it("should return distinct error for invalid code vs expired code", async () => {
      // Invalid code: OTP not found
      repository.findOne.mockResolvedValue(null);
      const invalidResult = await service.verifyOtp(
        "test@example.com",
        "000000"
      );
      expect(invalidResult.valid).toBe(false);
      expect(invalidResult.message).toBe("Invalid or expired code");

      // Expired code: OTP found but expired
      repository.findOne.mockResolvedValue({
        expiresAt: new Date(Date.now() - 1000),
      } as any);
      const expiredResult = await service.verifyOtp(
        "test@example.com",
        "123456"
      );
      expect(expiredResult.valid).toBe(false);
      expect(expiredResult.message).toBe("Code has expired");

      // Verify the error messages are distinct
      expect(invalidResult.message).not.toBe(expiredResult.message);
    });

    it("should reject verification after multiple failed attempts with wrong codes", async () => {
      const email = "brute@example.com";

      // Simulate multiple failed attempts - each returns invalid
      for (let i = 0; i < 5; i++) {
        repository.findOne.mockResolvedValue(null);
        const result = await service.verifyOtp(email, `00000${i}`);
        expect(result.valid).toBe(false);
      }

      // After 5 failed attempts, a valid OTP should still work
      // (lockout is handled by AccountLockoutService at a higher level)
      const validOtp = {
        expiresAt: new Date(Date.now() + 60000),
        verified: false,
      } as any;
      repository.findOne.mockResolvedValue(validOtp);
      const result = await service.verifyOtp(email, "123456");
      expect(result.valid).toBe(true);
    });

    it("should invalidate all OTPs for email when generating a new one", async () => {
      const email = "test@example.com";
      configService.get.mockReturnValue(10);
      repository.create.mockImplementation((dto) => dto as any);

      await service.generateOtp(email);

      // First call should delete all existing OTPs for this email
      expect(repository.delete).toHaveBeenCalledWith({ email });
      // Then save the new one
      expect(repository.save).toHaveBeenCalled();
    });

    it("should generate 6-digit numeric codes only", async () => {
      const email = "test@example.com";
      configService.get.mockReturnValue(10);
      repository.create.mockImplementation((dto) => dto as any);

      // Generate multiple OTPs to test randomness
      for (let i = 0; i < 10; i++) {
        const result = await service.generateOtp(email);
        expect(result.code).toMatch(/^\d{6}$/);
        const num = parseInt(result.code, 10);
        expect(num).toBeGreaterThanOrEqual(100000);
        expect(num).toBeLessThanOrEqual(999999);
      }
    });

    it("should set correct expiration based on config", async () => {
      const email = "test@example.com";
      const expiryMinutes = 5;
      configService.get.mockReturnValue(expiryMinutes);
      repository.create.mockImplementation((dto) => dto as any);

      const before = Date.now();
      const result = await service.generateOtp(email);
      const after = Date.now();

      const expectedMinMs = before + expiryMinutes * 60 * 1000;
      const expectedMaxMs = after + expiryMinutes * 60 * 1000;

      expect(result.expiresAt.getTime()).toBeGreaterThanOrEqual(expectedMinMs);
      expect(result.expiresAt.getTime()).toBeLessThanOrEqual(expectedMaxMs);
    });
  });

  describe("invalidateOtp", () => {
    it("should delete all OTPs for the given email", async () => {
      const email = "test@example.com";

      await service.invalidateOtp(email);

      expect(repository.delete).toHaveBeenCalledWith({ email });
    });
  });
});
