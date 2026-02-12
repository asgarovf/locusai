import "reflect-metadata";
import "../../test-setup"; // Shared entity mocks - must be before other imports

import { ExecutionContext, UnauthorizedException } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { Test, TestingModule } from "@nestjs/testing";
import { AuthService } from "../auth.service";
import { JwtOrApiKeyGuard } from "../guards/jwt-or-api-key.guard";

// Mock passport AuthGuard
jest.mock("@nestjs/passport", () => ({
  AuthGuard: () => {
    class MockAuthGuard {
      canActivate(): boolean {
        return true;
      }
    }
    return MockAuthGuard;
  },
}));

describe("JwtOrApiKeyGuard", () => {
  let guard: JwtOrApiKeyGuard;
  let reflector: jest.Mocked<Reflector>;
  let authService: jest.Mocked<AuthService>;

  const createMockContext = (
    headers: Record<string, string> = {},
    params: Record<string, string> = {}
  ): ExecutionContext => {
    const request = { headers, params, user: undefined as any };
    return {
      switchToHttp: () => ({
        getRequest: () => request,
        getResponse: () => ({}),
        getNext: () => jest.fn(),
      }),
      getHandler: () => jest.fn(),
      getClass: () => jest.fn() as any,
      getArgs: () => [],
      getArgByIndex: () => undefined,
      switchToRpc: () => ({}) as any,
      switchToWs: () => ({}) as any,
      getType: () => "http" as any,
    } as ExecutionContext;
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JwtOrApiKeyGuard,
        {
          provide: Reflector,
          useValue: {
            getAllAndOverride: jest.fn(),
          },
        },
        {
          provide: AuthService,
          useValue: {
            validateApiKey: jest.fn(),
          },
        },
      ],
    }).compile();

    guard = module.get<JwtOrApiKeyGuard>(JwtOrApiKeyGuard);
    reflector = module.get(Reflector);
    authService = module.get(AuthService);
  });

  describe("public routes", () => {
    it("should allow access to public routes without authentication", async () => {
      reflector.getAllAndOverride.mockReturnValue(true);
      const context = createMockContext();

      const result = await guard.canActivate(context);

      expect(result).toBe(true);
    });
  });

  describe("API key extraction", () => {
    it("should extract API key from X-API-Key header", async () => {
      reflector.getAllAndOverride.mockReturnValue(false);
      // Mock super.canActivate to throw (JWT fails)
      jest
        .spyOn(Object.getPrototypeOf(JwtOrApiKeyGuard.prototype), "canActivate")
        .mockRejectedValue(new Error("JWT failed"));

      const apiKeyUser = {
        authType: "api_key" as const,
        apiKeyId: "key-1",
        apiKeyName: "Test Key",
        orgId: "org-1",
      };
      authService.validateApiKey.mockResolvedValue(apiKeyUser);

      const context = createMockContext({ "x-api-key": "lk_test_key" });
      const result = await guard.canActivate(context);

      expect(result).toBe(true);
      expect(authService.validateApiKey).toHaveBeenCalledWith("lk_test_key");
    });

    it("should extract API key from Authorization: ApiKey header", async () => {
      reflector.getAllAndOverride.mockReturnValue(false);
      jest
        .spyOn(Object.getPrototypeOf(JwtOrApiKeyGuard.prototype), "canActivate")
        .mockRejectedValue(new Error("JWT failed"));

      const apiKeyUser = {
        authType: "api_key" as const,
        apiKeyId: "key-1",
        apiKeyName: "Test Key",
        orgId: "org-1",
      };
      authService.validateApiKey.mockResolvedValue(apiKeyUser);

      const context = createMockContext({
        authorization: "ApiKey lk_test_key",
      });
      const result = await guard.canActivate(context);

      expect(result).toBe(true);
      expect(authService.validateApiKey).toHaveBeenCalledWith("lk_test_key");
    });

    it("should extract API key from Authorization: Bearer lk_ format", async () => {
      reflector.getAllAndOverride.mockReturnValue(false);
      jest
        .spyOn(Object.getPrototypeOf(JwtOrApiKeyGuard.prototype), "canActivate")
        .mockRejectedValue(new Error("JWT failed"));

      const apiKeyUser = {
        authType: "api_key" as const,
        apiKeyId: "key-1",
        apiKeyName: "Test Key",
        orgId: "org-1",
      };
      authService.validateApiKey.mockResolvedValue(apiKeyUser);

      const context = createMockContext({
        authorization: "Bearer lk_my_api_key",
      });
      const result = await guard.canActivate(context);

      expect(result).toBe(true);
      expect(authService.validateApiKey).toHaveBeenCalledWith("lk_my_api_key");
    });
  });

  describe("no authentication", () => {
    it("should throw UnauthorizedException when no auth is provided", async () => {
      reflector.getAllAndOverride.mockReturnValue(false);
      jest
        .spyOn(Object.getPrototypeOf(JwtOrApiKeyGuard.prototype), "canActivate")
        .mockRejectedValue(new Error("JWT failed"));

      const context = createMockContext();

      await expect(guard.canActivate(context)).rejects.toThrow(
        UnauthorizedException
      );
    });

    it("should include helpful error message", async () => {
      reflector.getAllAndOverride.mockReturnValue(false);
      jest
        .spyOn(Object.getPrototypeOf(JwtOrApiKeyGuard.prototype), "canActivate")
        .mockRejectedValue(new Error("JWT failed"));

      const context = createMockContext();

      await expect(guard.canActivate(context)).rejects.toThrow(
        "Authentication required (JWT or API key)"
      );
    });
  });

  describe("JWT fallback to API key", () => {
    it("should try JWT first, then fall back to API key on failure", async () => {
      reflector.getAllAndOverride.mockReturnValue(false);
      const jwtSpy = jest
        .spyOn(Object.getPrototypeOf(JwtOrApiKeyGuard.prototype), "canActivate")
        .mockRejectedValue(new Error("JWT failed"));

      const apiKeyUser = {
        authType: "api_key" as const,
        apiKeyId: "key-1",
        apiKeyName: "Test Key",
        orgId: "org-1",
      };
      authService.validateApiKey.mockResolvedValue(apiKeyUser);

      const context = createMockContext({ "x-api-key": "lk_test" });
      const result = await guard.canActivate(context);

      expect(jwtSpy).toHaveBeenCalled();
      expect(authService.validateApiKey).toHaveBeenCalledWith("lk_test");
      expect(result).toBe(true);
    });
  });

  describe("invalid API key", () => {
    it("should propagate UnauthorizedException from validateApiKey", async () => {
      reflector.getAllAndOverride.mockReturnValue(false);
      jest
        .spyOn(Object.getPrototypeOf(JwtOrApiKeyGuard.prototype), "canActivate")
        .mockRejectedValue(new Error("JWT failed"));

      authService.validateApiKey.mockRejectedValue(
        new UnauthorizedException("Invalid API key")
      );

      const context = createMockContext({ "x-api-key": "lk_invalid" });

      await expect(guard.canActivate(context)).rejects.toThrow(
        UnauthorizedException
      );
    });
  });
});
