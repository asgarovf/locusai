import "reflect-metadata";
import "../../test-setup"; // Shared entity mocks - must be before other imports
import { INestApplication } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import cookieParser from "cookie-parser";
import request from "supertest";
import { TypedConfigService } from "@/config/config.service";
import { AuthController } from "../auth.controller";
import { AuthService } from "../auth.service";
import {
  ACCESS_TOKEN_COOKIE,
  CookieService,
  REFRESH_TOKEN_COOKIE,
} from "../cookie.service";
import { CsrfService } from "../csrf.service";
import { IpBlockService } from "../ip-block.service";
import { OAuthCodeService } from "../oauth-code.service";

describe("Session Management Integration", () => {
  let app: INestApplication;
  let authService: {
    refreshTokens: jest.Mock;
    revokeRefreshToken: jest.Mock;
    revokeAllUserRefreshTokens: jest.Mock;
  };
  const normalizeSetCookies = (
    value: string | string[] | undefined
  ): string[] => {
    if (!value) return [];
    return Array.isArray(value) ? value : [value];
  };

  beforeAll(async () => {
    authService = {
      refreshTokens: jest.fn(),
      revokeRefreshToken: jest.fn(),
      revokeAllUserRefreshTokens: jest.fn(),
    };

    const configService = {
      get: jest.fn((key: string) => {
        switch (key) {
          case "NODE_ENV":
            return "test";
          case "ACCESS_TOKEN_EXPIRES_IN_MINUTES":
            return 30;
          case "REFRESH_TOKEN_EXPIRES_IN_DAYS":
            return 7;
          case "COOKIE_DOMAIN":
            return undefined;
          default:
            return undefined;
        }
      }),
    };

    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        CookieService,
        {
          provide: AuthService,
          useValue: authService,
        },
        {
          provide: TypedConfigService,
          useValue: configService,
        },
        {
          provide: CsrfService,
          useValue: {
            generateSecret: jest.fn(),
            generateToken: jest.fn(),
          },
        },
        {
          provide: OAuthCodeService,
          useValue: {},
        },
        {
          provide: IpBlockService,
          useValue: {
            recordFailedAttempt: jest.fn(),
            clearFailedAttempts: jest.fn(),
          },
        },
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix("api");
    app.use(cookieParser());

    app.use((req, _res, next) => {
      const userHeader = req.headers["x-test-user"];
      if (userHeader === "jwt") {
        req.user = {
          authType: "jwt",
          id: "user-1",
          email: "user@example.com",
          name: "User",
          role: "USER",
        };
      }
      if (userHeader === "api_key") {
        req.user = {
          authType: "api_key",
          apiKeyId: "key-1",
          apiKeyName: "Test Key",
          orgId: "org-1",
        };
      }
      next();
    });

    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    authService.refreshTokens.mockReset();
    authService.revokeRefreshToken.mockReset();
    authService.revokeAllUserRefreshTokens.mockReset();
  });

  it("rejects refresh when no refresh token is provided", async () => {
    const response = await request(app.getHttpServer())
      .post("/api/auth/refresh")
      .expect(401);

    expect(response.body.message).toContain("No refresh token provided");
  });

  it("refreshes tokens and rotates cookies", async () => {
    authService.refreshTokens.mockResolvedValue({
      accessToken: "new-access",
      refreshToken: "new-refresh",
    });

    const response = await request(app.getHttpServer())
      .post("/api/auth/refresh")
      .set("Cookie", [`${REFRESH_TOKEN_COOKIE}=old-refresh`])
      .set("User-Agent", "jest-agent")
      .expect(201);

    expect(response.body).toEqual({ success: true });
    expect(authService.refreshTokens).toHaveBeenCalledWith(
      "old-refresh",
      expect.objectContaining({
        userAgent: "jest-agent",
        ipAddress: expect.any(String),
      })
    );

    const setCookies = normalizeSetCookies(response.headers["set-cookie"]);
    const accessCookie = setCookies.find((cookie: string) =>
      cookie.startsWith(`${ACCESS_TOKEN_COOKIE}=`)
    );
    const refreshCookie = setCookies.find((cookie: string) =>
      cookie.startsWith(`${REFRESH_TOKEN_COOKIE}=`)
    );

    expect(accessCookie).toContain("Path=/");
    expect(refreshCookie).toContain("Path=/api/auth/refresh");
  });

  it("revokes refresh token and clears cookies on logout", async () => {
    const response = await request(app.getHttpServer())
      .post("/api/auth/logout")
      .set("Cookie", [`${REFRESH_TOKEN_COOKIE}=old-refresh`])
      .expect(201);

    expect(response.body).toEqual({ success: true });
    expect(authService.revokeRefreshToken).toHaveBeenCalledWith("old-refresh");

    const setCookies = normalizeSetCookies(response.headers["set-cookie"]);
    expect(
      setCookies.some((cookie: string) =>
        cookie.startsWith(`${ACCESS_TOKEN_COOKIE}=`)
      )
    ).toBe(true);
    expect(
      setCookies.some((cookie: string) =>
        cookie.startsWith(`${REFRESH_TOKEN_COOKIE}=`)
      )
    ).toBe(true);
  });

  it("rejects logout-all for API key users", async () => {
    await request(app.getHttpServer())
      .post("/api/auth/logout-all")
      .set("x-test-user", "api_key")
      .expect(401);
  });

  it("revokes all refresh tokens for JWT users on logout-all", async () => {
    const response = await request(app.getHttpServer())
      .post("/api/auth/logout-all")
      .set("x-test-user", "jwt")
      .expect(201);

    expect(response.body).toEqual({ success: true });
    expect(authService.revokeAllUserRefreshTokens).toHaveBeenCalledWith(
      "user-1"
    );

    const setCookies = normalizeSetCookies(response.headers["set-cookie"]);
    expect(
      setCookies.some((cookie: string) =>
        cookie.startsWith(`${ACCESS_TOKEN_COOKIE}=`)
      )
    ).toBe(true);
    expect(
      setCookies.some((cookie: string) =>
        cookie.startsWith(`${REFRESH_TOKEN_COOKIE}=`)
      )
    ).toBe(true);
  });
});
