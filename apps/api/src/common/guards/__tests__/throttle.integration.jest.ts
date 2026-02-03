import "reflect-metadata";
import { Controller, Get, HttpStatus, INestApplication, Post } from "@nestjs/common";
import { APP_GUARD } from "@nestjs/core";
import { Test, TestingModule } from "@nestjs/testing";
import { ThrottlerModule, ThrottlerException } from "@nestjs/throttler";
import request from "supertest";
import { CustomThrottleGuard } from "../custom-throttle.guard";
import {
  CustomThrottle,
  SkipCustomThrottle,
  byIp,
  byUserId,
  byEmail,
} from "../../decorators/custom-throttle.decorator";
import { AllExceptionsFilter } from "../../filters/all-exceptions.filter";
import { AppLogger } from "../../logger";

// Test controller with various throttle configurations
@Controller("test")
class TestController {
  @Get("default")
  defaultEndpoint() {
    return { message: "default" };
  }

  @Get("custom")
  @CustomThrottle({ limit: 2, ttl: 60000, keyGenerator: byIp() })
  customLimitEndpoint() {
    return { message: "custom" };
  }

  @Get("skip")
  @SkipCustomThrottle()
  skippedEndpoint() {
    return { message: "skipped" };
  }

  @Post("login")
  @CustomThrottle({ limit: 3, ttl: 60000, keyGenerator: byEmail("body.email") })
  loginEndpoint() {
    return { message: "login" };
  }

  @Get("user-limited")
  @CustomThrottle({ limit: 2, ttl: 60000, keyGenerator: byUserId() })
  userLimitedEndpoint() {
    return { message: "user-limited" };
  }

  @Get("strict")
  @CustomThrottle({ limit: 1, ttl: 1000 })
  strictEndpoint() {
    return { message: "strict" };
  }
}

describe("Rate Limiting Integration Tests", () => {
  let app: INestApplication;
  let mockLogger: jest.Mocked<AppLogger>;

  beforeAll(async () => {
    mockLogger = {
      error: jest.fn(),
      warn: jest.fn(),
      log: jest.fn(),
      debug: jest.fn(),
      verbose: jest.fn(),
      fatal: jest.fn(),
    } as unknown as jest.Mocked<AppLogger>;

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        ThrottlerModule.forRoot({
          throttlers: [
            {
              ttl: 60000,
              limit: 10,
            },
          ],
          setHeaders: true,
        }),
      ],
      controllers: [TestController],
      providers: [
        {
          provide: APP_GUARD,
          useClass: CustomThrottleGuard,
        },
        {
          provide: AppLogger,
          useValue: mockLogger,
        },
        AllExceptionsFilter,
      ],
    }).compile();

    app = moduleFixture.createNestApplication();

    // Apply the global exception filter
    const filter = app.get(AllExceptionsFilter);
    app.useGlobalFilters(filter);

    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe("Global Rate Limiting", () => {
    it("should allow requests within global limit", async () => {
      const response = await request(app.getHttpServer())
        .get("/test/default")
        .expect(HttpStatus.OK);

      expect(response.body).toEqual({ message: "default" });
    });

    it("should include rate limit headers in response", async () => {
      const response = await request(app.getHttpServer())
        .get("/test/default")
        .expect(HttpStatus.OK);

      expect(response.headers).toHaveProperty("x-ratelimit-limit");
      expect(response.headers).toHaveProperty("x-ratelimit-remaining");
      expect(response.headers).toHaveProperty("x-ratelimit-reset");
    });

    it("should decrement remaining count with each request", async () => {
      // Make two requests and check the remaining count decreases
      const response1 = await request(app.getHttpServer())
        .get("/test/default")
        .expect(HttpStatus.OK);

      const remaining1 = parseInt(response1.headers["x-ratelimit-remaining"], 10);

      const response2 = await request(app.getHttpServer())
        .get("/test/default")
        .expect(HttpStatus.OK);

      const remaining2 = parseInt(response2.headers["x-ratelimit-remaining"], 10);

      expect(remaining2).toBeLessThan(remaining1);
    });
  });

  describe("Endpoint-Specific Rate Limiting", () => {
    it("should enforce custom limit on decorated endpoint", async () => {
      // Reset by using a unique IP
      const uniqueIp = `192.168.1.${Math.floor(Math.random() * 255)}`;

      // First request should succeed
      const response1 = await request(app.getHttpServer())
        .get("/test/custom")
        .set("X-Forwarded-For", uniqueIp)
        .expect(HttpStatus.OK);

      expect(response1.body).toEqual({ message: "custom" });

      // Second request should succeed
      await request(app.getHttpServer())
        .get("/test/custom")
        .set("X-Forwarded-For", uniqueIp)
        .expect(HttpStatus.OK);

      // Third request should be rate limited (limit is 2)
      await request(app.getHttpServer())
        .get("/test/custom")
        .set("X-Forwarded-For", uniqueIp)
        .expect(HttpStatus.TOO_MANY_REQUESTS);
    });

    it("should show custom limit in rate limit headers", async () => {
      const uniqueIp = `192.168.2.${Math.floor(Math.random() * 255)}`;

      const response = await request(app.getHttpServer())
        .get("/test/custom")
        .set("X-Forwarded-For", uniqueIp)
        .expect(HttpStatus.OK);

      expect(response.headers["x-ratelimit-limit"]).toBe("2");
    });

    it("should skip throttling for endpoints with SkipCustomThrottle", async () => {
      // Make many requests - should never be throttled
      for (let i = 0; i < 15; i++) {
        await request(app.getHttpServer())
          .get("/test/skip")
          .expect(HttpStatus.OK);
      }
    });
  });

  describe("Key Generator Based Limiting", () => {
    it("should rate limit by email for login endpoint", async () => {
      const testEmail = `test-${Date.now()}@example.com`;

      // First 3 requests should succeed (limit is 3)
      for (let i = 0; i < 3; i++) {
        await request(app.getHttpServer())
          .post("/test/login")
          .send({ email: testEmail })
          .expect(HttpStatus.CREATED);
      }

      // Fourth request should be rate limited
      await request(app.getHttpServer())
        .post("/test/login")
        .send({ email: testEmail })
        .expect(HttpStatus.TOO_MANY_REQUESTS);
    });

    it("should allow different emails to have separate limits", async () => {
      const email1 = `user1-${Date.now()}@example.com`;
      const email2 = `user2-${Date.now()}@example.com`;

      // Exhaust limit for email1
      for (let i = 0; i < 3; i++) {
        await request(app.getHttpServer())
          .post("/test/login")
          .send({ email: email1 })
          .expect(HttpStatus.CREATED);
      }

      // email1 should be rate limited
      await request(app.getHttpServer())
        .post("/test/login")
        .send({ email: email1 })
        .expect(HttpStatus.TOO_MANY_REQUESTS);

      // email2 should still work
      await request(app.getHttpServer())
        .post("/test/login")
        .send({ email: email2 })
        .expect(HttpStatus.CREATED);
    });

    it("should track different IPs separately", async () => {
      const ip1 = `10.0.1.${Math.floor(Math.random() * 255)}`;
      const ip2 = `10.0.2.${Math.floor(Math.random() * 255)}`;

      // Exhaust limit for ip1 (limit is 2)
      for (let i = 0; i < 2; i++) {
        await request(app.getHttpServer())
          .get("/test/custom")
          .set("X-Forwarded-For", ip1)
          .expect(HttpStatus.OK);
      }

      // ip1 should be rate limited
      await request(app.getHttpServer())
        .get("/test/custom")
        .set("X-Forwarded-For", ip1)
        .expect(HttpStatus.TOO_MANY_REQUESTS);

      // ip2 should still work
      await request(app.getHttpServer())
        .get("/test/custom")
        .set("X-Forwarded-For", ip2)
        .expect(HttpStatus.OK);
    });
  });

  describe("429 Response Format", () => {
    it("should return proper 429 status code", async () => {
      const uniqueIp = `192.168.100.${Math.floor(Math.random() * 255)}`;

      // Exhaust the limit (limit is 1 for strict endpoint)
      await request(app.getHttpServer())
        .get("/test/strict")
        .set("X-Forwarded-For", uniqueIp)
        .expect(HttpStatus.OK);

      // Should get 429
      const response = await request(app.getHttpServer())
        .get("/test/strict")
        .set("X-Forwarded-For", uniqueIp)
        .expect(HttpStatus.TOO_MANY_REQUESTS);

      expect(response.status).toBe(429);
    });

    it("should return ApiResponse format for 429 errors", async () => {
      const uniqueIp = `192.168.101.${Math.floor(Math.random() * 255)}`;

      // Exhaust the limit
      await request(app.getHttpServer())
        .get("/test/strict")
        .set("X-Forwarded-For", uniqueIp)
        .expect(HttpStatus.OK);

      // Check 429 response format
      const response = await request(app.getHttpServer())
        .get("/test/strict")
        .set("X-Forwarded-For", uniqueIp)
        .expect(HttpStatus.TOO_MANY_REQUESTS);

      expect(response.body).toMatchObject({
        success: false,
        error: expect.objectContaining({
          code: expect.any(String),
          message: expect.any(String),
        }),
        meta: expect.objectContaining({
          timestamp: expect.any(String),
          path: "/test/strict",
        }),
      });
    });

    it("should include Retry-After header on 429 response", async () => {
      const uniqueIp = `192.168.102.${Math.floor(Math.random() * 255)}`;

      // Exhaust the limit
      await request(app.getHttpServer())
        .get("/test/strict")
        .set("X-Forwarded-For", uniqueIp)
        .expect(HttpStatus.OK);

      // Check headers on 429
      const response = await request(app.getHttpServer())
        .get("/test/strict")
        .set("X-Forwarded-For", uniqueIp)
        .expect(HttpStatus.TOO_MANY_REQUESTS);

      // NestJS Throttler includes Retry-After header
      expect(response.headers).toHaveProperty("retry-after");
    });
  });

  describe("TTL Window Behavior", () => {
    it("should enforce rate limit within TTL window", async () => {
      // Use a completely unique IP for this test to avoid interference
      const uniqueIp = `192.168.${Date.now() % 255}.${Math.floor(Math.random() * 255)}`;

      // Use strict endpoint with 1 second TTL and limit of 1
      const response1 = await request(app.getHttpServer())
        .get("/test/strict")
        .set("X-Forwarded-For", uniqueIp);

      expect(response1.status).toBe(HttpStatus.OK);

      // Immediate second request should be rate limited (within 1 second TTL)
      const response2 = await request(app.getHttpServer())
        .get("/test/strict")
        .set("X-Forwarded-For", uniqueIp);

      expect(response2.status).toBe(HttpStatus.TOO_MANY_REQUESTS);

      // The Retry-After header should indicate when the client can retry
      expect(response2.headers["retry-after"]).toBeDefined();
    });
  });
});

describe("ThrottlerException Tests", () => {
  it("should create ThrottlerException with default message", () => {
    const exception = new ThrottlerException();
    expect(exception.getStatus()).toBe(HttpStatus.TOO_MANY_REQUESTS);
  });

  it("should create ThrottlerException with custom message", () => {
    const customMessage = "Rate limit exceeded for this endpoint";
    const exception = new ThrottlerException(customMessage);
    expect(exception.getStatus()).toBe(HttpStatus.TOO_MANY_REQUESTS);
    expect(exception.message).toBe(customMessage);
  });
});

describe("Rate Limit Headers Tests", () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        ThrottlerModule.forRoot({
          throttlers: [
            {
              ttl: 60000,
              limit: 5,
            },
          ],
          setHeaders: true,
        }),
      ],
      controllers: [TestController],
      providers: [
        {
          provide: APP_GUARD,
          useClass: CustomThrottleGuard,
        },
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it("should have X-RateLimit-Limit header", async () => {
    const uniqueIp = `10.10.1.${Math.floor(Math.random() * 255)}`;

    const response = await request(app.getHttpServer())
      .get("/test/default")
      .set("X-Forwarded-For", uniqueIp)
      .expect(HttpStatus.OK);

    expect(response.headers["x-ratelimit-limit"]).toBeDefined();
  });

  it("should have X-RateLimit-Remaining header", async () => {
    const uniqueIp = `10.10.2.${Math.floor(Math.random() * 255)}`;

    const response = await request(app.getHttpServer())
      .get("/test/default")
      .set("X-Forwarded-For", uniqueIp)
      .expect(HttpStatus.OK);

    expect(response.headers["x-ratelimit-remaining"]).toBeDefined();
  });

  it("should have X-RateLimit-Reset header", async () => {
    const uniqueIp = `10.10.3.${Math.floor(Math.random() * 255)}`;

    const response = await request(app.getHttpServer())
      .get("/test/default")
      .set("X-Forwarded-For", uniqueIp)
      .expect(HttpStatus.OK);

    expect(response.headers["x-ratelimit-reset"]).toBeDefined();
  });

  it("should correctly show remaining requests", async () => {
    const uniqueIp = `10.10.4.${Math.floor(Math.random() * 255)}`;

    // Custom endpoint has limit of 2
    const response1 = await request(app.getHttpServer())
      .get("/test/custom")
      .set("X-Forwarded-For", uniqueIp)
      .expect(HttpStatus.OK);

    expect(response1.headers["x-ratelimit-limit"]).toBe("2");
    expect(parseInt(response1.headers["x-ratelimit-remaining"], 10)).toBe(1);

    const response2 = await request(app.getHttpServer())
      .get("/test/custom")
      .set("X-Forwarded-For", uniqueIp)
      .expect(HttpStatus.OK);

    expect(parseInt(response2.headers["x-ratelimit-remaining"], 10)).toBe(0);
  });
});
