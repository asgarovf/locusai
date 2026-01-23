import "reflect-metadata";
import "../../test-setup"; // Shared entity mocks - must be before other imports

import { UserRole } from "@locusai/shared";
import { ConflictException, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { Test, TestingModule } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { DataSource } from "typeorm";
import { EmailService } from "@/common/services/email.service";
import { ApiKey } from "@/entities/api-key.entity";
import { UsersService } from "@/users/users.service";
import { AuthService } from "../auth.service";
import { OtpService } from "../otp.service";

describe("AuthService", () => {
  let service: AuthService;
  let usersService: jest.Mocked<UsersService>;
  let jwtService: jest.Mocked<JwtService>;
  let otpService: jest.Mocked<OtpService>;
  let emailService: jest.Mocked<EmailService>;
  let dataSource: jest.Mocked<DataSource>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: UsersService,
          useValue: {
            findByEmail: jest.fn(),
            findById: jest.fn(),
          },
        },
        {
          provide: JwtService,
          useValue: {
            sign: jest.fn(),
          },
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
          useValue: {
            query: jest.fn(),
            transaction: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(ApiKey),
          useValue: {
            findOne: jest.fn(),
            save: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    usersService = module.get(UsersService);
    jwtService = module.get(JwtService);
    otpService = module.get(OtpService);
    emailService = module.get(EmailService);
    dataSource = module.get(DataSource);
  });

  describe("login", () => {
    it("should return login response with token and user data", async () => {
      const user = {
        id: "user-1",
        email: "test@example.com",
        name: "Test User",
        role: UserRole.USER,
        avatarUrl: null,
        onboardingCompleted: true,
        emailVerified: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any;

      jwtService.sign.mockReturnValue("test-token");
      dataSource.query.mockResolvedValue([{ id: "ws-1", orgId: "org-1" }]);

      const result = await service.login(user);

      expect(result).toEqual({
        token: "test-token",
        user: expect.objectContaining({
          id: "user-1",
          email: "test@example.com",
          workspaceId: "ws-1",
          orgId: "org-1",
        }),
      });
      expect(dataSource.query).toHaveBeenCalled();
    });
  });

  describe("requestLoginOtp", () => {
    it("should throw UnauthorizedException if user not found", async () => {
      usersService.findByEmail.mockResolvedValue(null);

      await expect(service.requestLoginOtp("test@example.com")).rejects.toThrow(
        UnauthorizedException
      );
    });

    it("should generate and send OTP if user exists", async () => {
      usersService.findByEmail.mockResolvedValue({ id: "1" } as any);
      otpService.generateOtp.mockResolvedValue({
        code: "123456",
        expiresAt: new Date(Date.now() + 600000),
      });

      const result = await service.requestLoginOtp("test@example.com");

      expect(result).toEqual({ success: true });
      expect(otpService.generateOtp).toHaveBeenCalledWith("test@example.com");
      expect(emailService.sendOtpEmail).toHaveBeenCalled();
    });
  });

  describe("requestRegisterOtp", () => {
    it("should throw ConflictException if user already exists", async () => {
      usersService.findByEmail.mockResolvedValue({ id: "1" } as any);

      await expect(
        service.requestRegisterOtp("test@example.com")
      ).rejects.toThrow(ConflictException);
    });

    it("should generate and send OTP if user does not exist", async () => {
      usersService.findByEmail.mockResolvedValue(null);
      otpService.generateOtp.mockResolvedValue({
        code: "123456",
        expiresAt: new Date(Date.now() + 600000),
      });

      const result = await service.requestRegisterOtp("test@example.com");

      expect(result).toEqual({ success: true });
      expect(otpService.generateOtp).toHaveBeenCalledWith("test@example.com");
      expect(emailService.sendOtpEmail).toHaveBeenCalled();
    });
  });

  describe("verifyOtpAndLogin", () => {
    it("should throw UnauthorizedException if OTP is invalid", async () => {
      otpService.verifyOtp.mockResolvedValue({
        valid: false,
        message: "Invalid",
      });

      await expect(
        service.verifyOtpAndLogin("test@example.com", "123456")
      ).rejects.toThrow(UnauthorizedException);
    });

    it("should login user if OTP is valid", async () => {
      const user = {
        id: "1",
        email: "test@example.com",
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any;
      otpService.verifyOtp.mockResolvedValue({ valid: true });
      usersService.findByEmail.mockResolvedValue(user);
      jest
        .spyOn(service, "login")
        .mockResolvedValue({ token: "tok", user: {} as any });

      const result = await service.verifyOtpAndLogin(
        "test@example.com",
        "123456"
      );

      expect(result.token).toBe("tok");
      expect(otpService.invalidateOtp).toHaveBeenCalledWith("test@example.com");
    });
  });
});
