import "reflect-metadata";
import "../../test-setup"; // Shared entity mocks - must be before other imports

import { UserRole } from "@locusai/shared";
import { UnauthorizedException } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import { AuthController } from "../auth.controller";
import { AuthService } from "../auth.service";

describe("AuthController", () => {
  let controller: AuthController;
  let authService: jest.Mocked<AuthService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: {
            getUserById: jest.fn(),
            getUserWorkspaces: jest.fn(),
            getWorkspaceOrgId: jest.fn(),
            requestRegisterOtp: jest.fn(),
            requestLoginOtp: jest.fn(),
            verifyOtpAndLogin: jest.fn(),
            completeRegistration: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
    authService = module.get(AuthService);
  });

  describe("getProfile", () => {
    it("should throw UnauthorizedException if user is not JWT user", async () => {
      const authUser = { type: "api-key" } as any;

      await expect(controller.getProfile(authUser)).rejects.toThrow(
        UnauthorizedException
      );
    });

    it("should return user profile for JWT user", async () => {
      const authUser = {
        authType: "jwt",
        id: "user-1",
        email: "test@example.com",
        name: "Test",
        role: UserRole.USER,
      };
      const user = {
        id: "user-1",
        email: "test@example.com",
        name: "Test",
        role: UserRole.USER,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any;

      authService.getUserById.mockResolvedValue(user);
      authService.getUserWorkspaces.mockResolvedValue([{ id: "ws-1" }]);
      authService.getWorkspaceOrgId.mockResolvedValue({ orgId: "org-1" });

      const result = await controller.getProfile(authUser as any);

      expect(result.id).toBe("user-1");
      expect(result.workspaceId).toBe("ws-1");
      expect(result.orgId).toBe("org-1");
    });
  });

  describe("registerOtp", () => {
    it("should call authService.requestRegisterOtp", async () => {
      const dto = { email: "test@example.com" };
      authService.requestRegisterOtp.mockResolvedValue({ success: true });

      const result = await controller.registerOtp(dto);

      expect(result).toEqual({ success: true });
      expect(authService.requestRegisterOtp).toHaveBeenCalledWith(dto.email);
    });
  });
});
