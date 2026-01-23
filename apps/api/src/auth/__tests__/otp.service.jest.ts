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
});
