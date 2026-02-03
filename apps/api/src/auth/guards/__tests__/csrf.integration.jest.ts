import "reflect-metadata";
import {
  Controller,
  Delete,
  Get,
  HttpStatus,
  INestApplication,
  Patch,
  Post,
  Put,
} from "@nestjs/common";
import { APP_GUARD, Reflector } from "@nestjs/core";
import { ConfigModule } from "@nestjs/config";
import { Test, TestingModule } from "@nestjs/testing";
import request from "supertest";
import { createHmac, randomBytes } from "node:crypto";
import cookieParser from "cookie-parser";
import { CsrfGuard } from "../csrf.guard";
import { CsrfService } from "@/auth/csrf.service";
import {
  CookieService,
  CSRF_SECRET_COOKIE,
  CSRF_TOKEN_COOKIE,
} from "@/auth/cookie.service";
import { TypedConfigService } from "@/config/config.service";
import { SkipCsrf } from "@/common/decorators/skip-csrf.decorator";
import { Public } from "@/auth/decorators/public.decorator";
import { AllExceptionsFilter } from "@/common/filters/all-exceptions.filter";
import { AppLogger } from "@/common/logger";

const TEST_CSRF_SECRET = "test-csrf-secret-key-minimum-32-chars";

// Test controller with various CSRF configurations
@Controller("test")
class CsrfTestController {
  @Get("safe")
  safeGet() {
    return { message: "safe-get" };
  }

  @Post("unsafe")
  unsafePost() {
    return { message: "unsafe-post" };
  }

  @Put("unsafe")
  unsafePut() {
    return { message: "unsafe-put" };
  }

  @Delete("unsafe")
  unsafeDelete() {
    return { message: "unsafe-delete" };
  }

  @Patch("unsafe")
  unsafePatch() {
    return { message: "unsafe-patch" };
  }

  @Public()
  @Post("public")
  publicPost() {
    return { message: "public-post" };
  }

  @SkipCsrf()
  @Post("skip-csrf")
  skipCsrfPost() {
    return { message: "skip-csrf-post" };
  }
}

// Helper function to generate valid CSRF credentials
function generateValidCsrfCredentials(): { secret: string; token: string } {
  const secret = randomBytes(32).toString("hex");
  const hmac = createHmac("sha256", TEST_CSRF_SECRET);
  hmac.update(secret);
  const token = hmac.digest("hex");
  return { secret, token };
}

// Helper to build cookie string from object
function buildCookieString(cookies: Record<string, string>): string {
  return Object.entries(cookies)
    .map(([key, value]) => `${key}=${value}`)
    .join("; ");
}

describe("CSRF Protection Integration Tests", () => {
  let app: INestApplication;
  let csrfService: CsrfService;

  beforeAll(async () => {
    const mockLogger = {
      error: jest.fn(),
      warn: jest.fn(),
      log: jest.fn(),
      debug: jest.fn(),
      verbose: jest.fn(),
      fatal: jest.fn(),
    } as unknown as jest.Mocked<AppLogger>;

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          load: [
            () => ({
              NODE_ENV: "test",
              CSRF_SECRET: TEST_CSRF_SECRET,
            }),
          ],
        }),
      ],
      controllers: [CsrfTestController],
      providers: [
        TypedConfigService,
        CsrfService,
        CookieService,
        Reflector,
        {
          provide: APP_GUARD,
          useClass: CsrfGuard,
        },
        {
          provide: AppLogger,
          useValue: mockLogger,
        },
        AllExceptionsFilter,
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.use(cookieParser());

    // Apply the global exception filter for consistent error responses
    const filter = app.get(AllExceptionsFilter);
    app.useGlobalFilters(filter);

    csrfService = moduleFixture.get<CsrfService>(CsrfService);

    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe("Browser Requests Without Token (Should Fail)", () => {
    it("should reject POST request without CSRF token header", async () => {
      const { secret } = generateValidCsrfCredentials();

      const response = await request(app.getHttpServer())
        .post("/test/unsafe")
        .set("Cookie", buildCookieString({ [CSRF_SECRET_COOKIE]: secret }))
        .expect(HttpStatus.FORBIDDEN);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBeDefined();
      expect(response.body.error.message).toContain("CSRF token missing");
    });

    it("should reject PUT request without CSRF token header", async () => {
      const { secret } = generateValidCsrfCredentials();

      const response = await request(app.getHttpServer())
        .put("/test/unsafe")
        .set("Cookie", buildCookieString({ [CSRF_SECRET_COOKIE]: secret }))
        .expect(HttpStatus.FORBIDDEN);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBeDefined();
      expect(response.body.error.message).toContain("CSRF token missing");
    });

    it("should reject DELETE request without CSRF token header", async () => {
      const { secret } = generateValidCsrfCredentials();

      const response = await request(app.getHttpServer())
        .delete("/test/unsafe")
        .set("Cookie", buildCookieString({ [CSRF_SECRET_COOKIE]: secret }))
        .expect(HttpStatus.FORBIDDEN);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBeDefined();
      expect(response.body.error.message).toContain("CSRF token missing");
    });

    it("should reject PATCH request without CSRF token header", async () => {
      const { secret } = generateValidCsrfCredentials();

      const response = await request(app.getHttpServer())
        .patch("/test/unsafe")
        .set("Cookie", buildCookieString({ [CSRF_SECRET_COOKIE]: secret }))
        .expect(HttpStatus.FORBIDDEN);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBeDefined();
      expect(response.body.error.message).toContain("CSRF token missing");
    });

    it("should reject POST request without CSRF secret cookie", async () => {
      const { token } = generateValidCsrfCredentials();

      const response = await request(app.getHttpServer())
        .post("/test/unsafe")
        .set("x-csrf-token", token)
        .expect(HttpStatus.FORBIDDEN);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBeDefined();
      expect(response.body.error.message).toContain(
        "CSRF secret cookie missing"
      );
    });
  });

  describe("Browser Requests With Valid Token (Should Pass)", () => {
    it("should allow POST request with valid CSRF token and secret", async () => {
      const { secret, token } = generateValidCsrfCredentials();

      const response = await request(app.getHttpServer())
        .post("/test/unsafe")
        .set("Cookie", buildCookieString({ [CSRF_SECRET_COOKIE]: secret }))
        .set("x-csrf-token", token)
        .expect(HttpStatus.CREATED);

      expect(response.body).toEqual({ message: "unsafe-post" });
    });

    it("should allow PUT request with valid CSRF token and secret", async () => {
      const { secret, token } = generateValidCsrfCredentials();

      const response = await request(app.getHttpServer())
        .put("/test/unsafe")
        .set("Cookie", buildCookieString({ [CSRF_SECRET_COOKIE]: secret }))
        .set("x-csrf-token", token)
        .expect(HttpStatus.OK);

      expect(response.body).toEqual({ message: "unsafe-put" });
    });

    it("should allow DELETE request with valid CSRF token and secret", async () => {
      const { secret, token } = generateValidCsrfCredentials();

      const response = await request(app.getHttpServer())
        .delete("/test/unsafe")
        .set("Cookie", buildCookieString({ [CSRF_SECRET_COOKIE]: secret }))
        .set("x-csrf-token", token)
        .expect(HttpStatus.OK);

      expect(response.body).toEqual({ message: "unsafe-delete" });
    });

    it("should allow PATCH request with valid CSRF token and secret", async () => {
      const { secret, token } = generateValidCsrfCredentials();

      const response = await request(app.getHttpServer())
        .patch("/test/unsafe")
        .set("Cookie", buildCookieString({ [CSRF_SECRET_COOKIE]: secret }))
        .set("x-csrf-token", token)
        .expect(HttpStatus.OK);

      expect(response.body).toEqual({ message: "unsafe-patch" });
    });
  });

  describe("Browser Requests With Invalid Token (Should Fail)", () => {
    it("should reject request with mismatched token and secret", async () => {
      const { secret } = generateValidCsrfCredentials();
      const { token: differentToken } = generateValidCsrfCredentials();

      const response = await request(app.getHttpServer())
        .post("/test/unsafe")
        .set("Cookie", buildCookieString({ [CSRF_SECRET_COOKIE]: secret }))
        .set("x-csrf-token", differentToken)
        .expect(HttpStatus.FORBIDDEN);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBeDefined();
      expect(response.body.error.message).toContain("Invalid CSRF token");
    });

    it("should reject request with tampered token", async () => {
      const { secret, token } = generateValidCsrfCredentials();
      const tamperedToken = `${token.slice(0, -4)}xxxx`;

      const response = await request(app.getHttpServer())
        .post("/test/unsafe")
        .set("Cookie", buildCookieString({ [CSRF_SECRET_COOKIE]: secret }))
        .set("x-csrf-token", tamperedToken)
        .expect(HttpStatus.FORBIDDEN);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBeDefined();
      expect(response.body.error.message).toContain("Invalid CSRF token");
    });

    it("should reject request with empty token", async () => {
      const { secret } = generateValidCsrfCredentials();

      const response = await request(app.getHttpServer())
        .post("/test/unsafe")
        .set("Cookie", buildCookieString({ [CSRF_SECRET_COOKIE]: secret }))
        .set("x-csrf-token", "")
        .expect(HttpStatus.FORBIDDEN);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBeDefined();
    });
  });

  describe("API Key Requests Bypass CSRF", () => {
    it("should bypass CSRF for requests with X-API-Key header", async () => {
      const response = await request(app.getHttpServer())
        .post("/test/unsafe")
        .set("X-API-Key", "test-api-key-12345")
        .expect(HttpStatus.CREATED);

      expect(response.body).toEqual({ message: "unsafe-post" });
    });

    it("should bypass CSRF for requests with Authorization: ApiKey scheme", async () => {
      const response = await request(app.getHttpServer())
        .post("/test/unsafe")
        .set("Authorization", "ApiKey test-api-key-12345")
        .expect(HttpStatus.CREATED);

      expect(response.body).toEqual({ message: "unsafe-post" });
    });

    it("should bypass CSRF for requests with Bearer lk_* token (Locus API key)", async () => {
      const response = await request(app.getHttpServer())
        .post("/test/unsafe")
        .set("Authorization", "Bearer lk_test_api_key_12345")
        .expect(HttpStatus.CREATED);

      expect(response.body).toEqual({ message: "unsafe-post" });
    });

    it("should NOT bypass CSRF for regular Bearer token (non-lk_ prefix)", async () => {
      const response = await request(app.getHttpServer())
        .post("/test/unsafe")
        .set("Authorization", "Bearer regular-jwt-token")
        .expect(HttpStatus.FORBIDDEN);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBeDefined();
      expect(response.body.error.message).toContain("CSRF");
    });
  });

  describe("Token Refresh Mechanism", () => {
    it("should set CSRF cookies on GET request when cookies are missing", async () => {
      const response = await request(app.getHttpServer())
        .get("/test/safe")
        .expect(HttpStatus.OK);

      const cookies = response.headers["set-cookie"];
      expect(cookies).toBeDefined();

      const cookieArray = Array.isArray(cookies) ? cookies : [cookies];
      const csrfTokenCookie = cookieArray.find((c: string) =>
        c.startsWith(CSRF_TOKEN_COOKIE)
      );
      const csrfSecretCookie = cookieArray.find((c: string) =>
        c.startsWith(CSRF_SECRET_COOKIE)
      );

      expect(csrfTokenCookie).toBeDefined();
      expect(csrfSecretCookie).toBeDefined();
    });

    it("should set CSRF cookies on HEAD request when cookies are missing", async () => {
      const response = await request(app.getHttpServer())
        .head("/test/safe")
        .expect(HttpStatus.OK);

      const cookies = response.headers["set-cookie"];
      expect(cookies).toBeDefined();

      const cookieArray = Array.isArray(cookies) ? cookies : [cookies];
      const csrfTokenCookie = cookieArray.find((c: string) =>
        c.startsWith(CSRF_TOKEN_COOKIE)
      );
      const csrfSecretCookie = cookieArray.find((c: string) =>
        c.startsWith(CSRF_SECRET_COOKIE)
      );

      expect(csrfTokenCookie).toBeDefined();
      expect(csrfSecretCookie).toBeDefined();
    });

    it("should preserve valid existing CSRF cookies on GET request", async () => {
      const { secret, token } = generateValidCsrfCredentials();

      const response = await request(app.getHttpServer())
        .get("/test/safe")
        .set(
          "Cookie",
          buildCookieString({
            [CSRF_TOKEN_COOKIE]: token,
            [CSRF_SECRET_COOKIE]: secret,
          })
        )
        .expect(HttpStatus.OK);

      // Should not set new cookies when existing ones are valid
      const cookies = response.headers["set-cookie"];
      expect(cookies).toBeUndefined();
    });

    it("should refresh CSRF cookies when token is invalid", async () => {
      const invalidToken = "invalid-token-value";
      const secret = randomBytes(32).toString("hex");

      const response = await request(app.getHttpServer())
        .get("/test/safe")
        .set(
          "Cookie",
          buildCookieString({
            [CSRF_TOKEN_COOKIE]: invalidToken,
            [CSRF_SECRET_COOKIE]: secret,
          })
        )
        .expect(HttpStatus.OK);

      // Should set new cookies because existing token is invalid
      const cookies = response.headers["set-cookie"];
      expect(cookies).toBeDefined();

      const cookieArray = Array.isArray(cookies) ? cookies : [cookies];
      const csrfTokenCookie = cookieArray.find((c: string) =>
        c.startsWith(CSRF_TOKEN_COOKIE)
      );
      expect(csrfTokenCookie).toBeDefined();
    });

    it("should refresh CSRF cookies when secret is missing", async () => {
      const { token } = generateValidCsrfCredentials();

      const response = await request(app.getHttpServer())
        .get("/test/safe")
        .set("Cookie", buildCookieString({ [CSRF_TOKEN_COOKIE]: token }))
        .expect(HttpStatus.OK);

      // Should set new cookies because secret is missing
      const cookies = response.headers["set-cookie"];
      expect(cookies).toBeDefined();

      const cookieArray = Array.isArray(cookies) ? cookies : [cookies];
      const csrfSecretCookie = cookieArray.find((c: string) =>
        c.startsWith(CSRF_SECRET_COOKIE)
      );
      expect(csrfSecretCookie).toBeDefined();
    });

    it("should refresh CSRF cookies when token is missing", async () => {
      const secret = randomBytes(32).toString("hex");

      const response = await request(app.getHttpServer())
        .get("/test/safe")
        .set("Cookie", buildCookieString({ [CSRF_SECRET_COOKIE]: secret }))
        .expect(HttpStatus.OK);

      // Should set new cookies because token is missing
      const cookies = response.headers["set-cookie"];
      expect(cookies).toBeDefined();

      const cookieArray = Array.isArray(cookies) ? cookies : [cookies];
      const csrfTokenCookie = cookieArray.find((c: string) =>
        c.startsWith(CSRF_TOKEN_COOKIE)
      );
      expect(csrfTokenCookie).toBeDefined();
    });
  });

  describe("Decorator-Based CSRF Skipping", () => {
    it("should skip CSRF validation for @Public() decorated routes", async () => {
      const response = await request(app.getHttpServer())
        .post("/test/public")
        .expect(HttpStatus.CREATED);

      expect(response.body).toEqual({ message: "public-post" });
    });

    it("should skip CSRF validation for @SkipCsrf() decorated routes", async () => {
      const response = await request(app.getHttpServer())
        .post("/test/skip-csrf")
        .expect(HttpStatus.CREATED);

      expect(response.body).toEqual({ message: "skip-csrf-post" });
    });
  });

  describe("CSRF Service Token Generation and Validation", () => {
    it("should generate valid token-secret pairs", () => {
      const secret = csrfService.generateSecret();
      const token = csrfService.generateToken(secret);

      expect(csrfService.validateToken(token, secret)).toBe(true);
    });

    it("should reject token with different secret", () => {
      const secret1 = csrfService.generateSecret();
      const secret2 = csrfService.generateSecret();
      const token = csrfService.generateToken(secret1);

      expect(csrfService.validateToken(token, secret2)).toBe(false);
    });

    it("should reject empty token", () => {
      const secret = csrfService.generateSecret();

      expect(csrfService.validateToken("", secret)).toBe(false);
    });

    it("should reject empty secret", () => {
      const secret = csrfService.generateSecret();
      const token = csrfService.generateToken(secret);

      expect(csrfService.validateToken(token, "")).toBe(false);
    });
  });
});
