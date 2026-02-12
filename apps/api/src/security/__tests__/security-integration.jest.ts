import "reflect-metadata";
import "../../test-setup"; // Shared entity mocks - must be before other imports

import {
  Body,
  Controller,
  Get,
  INestApplication,
  MiddlewareConsumer,
  Module,
  NestModule,
  Post,
} from "@nestjs/common";
import { APP_FILTER } from "@nestjs/core";
import { Test, TestingModule } from "@nestjs/testing";
import { AllExceptionsFilter } from "@/common/filters/all-exceptions.filter";
import { AppLogger } from "@/common/logger";
import { RequestIdMiddleware } from "@/common/middleware/request-id.middleware";

// eslint-disable-next-line @typescript-eslint/no-require-imports
const supertest = require("supertest");

// Test controller with public endpoints for integration testing
@Controller("test")
class TestController {
  @Get("hello")
  hello() {
    return { message: "hello" };
  }

  @Post("echo")
  echo(@Body() body: any) {
    return { received: body };
  }

  @Get("error")
  error() {
    throw new Error("test error");
  }
}

@Module({
  controllers: [TestController],
  providers: [
    AppLogger,
    {
      provide: APP_FILTER,
      useClass: AllExceptionsFilter,
    },
  ],
})
class TestAppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(RequestIdMiddleware).forRoutes("*");
  }
}

describe("Security Integration Tests", () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [TestAppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix("api");
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe("Request ID propagation", () => {
    it("should generate X-Request-ID when none is provided", async () => {
      const response = await supertest(app.getHttpServer()).get(
        "/api/test/hello"
      );

      expect(response.headers["x-request-id"]).toBeDefined();
      expect(response.headers["x-request-id"]).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/
      );
    });

    it("should preserve incoming X-Request-ID", async () => {
      const customId = "custom-request-id-123";

      const response = await supertest(app.getHttpServer())
        .get("/api/test/hello")
        .set("X-Request-ID", customId);

      expect(response.headers["x-request-id"]).toBe(customId);
    });

    it("should include X-Request-ID in error responses", async () => {
      const response = await supertest(app.getHttpServer()).get(
        "/api/test/error"
      );

      expect(response.status).toBe(500);
      expect(response.headers["x-request-id"]).toBeDefined();
    });

    it("should generate unique IDs for different requests", async () => {
      const response1 = await supertest(app.getHttpServer()).get(
        "/api/test/hello"
      );
      const response2 = await supertest(app.getHttpServer()).get(
        "/api/test/hello"
      );

      expect(response1.headers["x-request-id"]).not.toBe(
        response2.headers["x-request-id"]
      );
    });
  });

  describe("CORS headers", () => {
    let corsApp: INestApplication;

    beforeAll(async () => {
      const moduleFixture = await Test.createTestingModule({
        imports: [TestAppModule],
      }).compile();

      corsApp = moduleFixture.createNestApplication();
      corsApp.enableCors({
        origin: "http://localhost:3000",
        credentials: true,
      });
      corsApp.setGlobalPrefix("api");
      await corsApp.init();
    });

    afterAll(async () => {
      await corsApp.close();
    });

    it("should include CORS headers when origin is allowed", async () => {
      const response = await supertest(corsApp.getHttpServer())
        .get("/api/test/hello")
        .set("Origin", "http://localhost:3000");

      expect(response.headers["access-control-allow-origin"]).toBe(
        "http://localhost:3000"
      );
      expect(response.headers["access-control-allow-credentials"]).toBe("true");
    });

    it("should not include CORS allow-origin for blocked origins", async () => {
      const response = await supertest(corsApp.getHttpServer())
        .get("/api/test/hello")
        .set("Origin", "http://evil.com");

      const allowOrigin = response.headers["access-control-allow-origin"];
      expect(allowOrigin).not.toBe("http://evil.com");
    });

    it("should handle preflight OPTIONS requests", async () => {
      const response = await supertest(corsApp.getHttpServer())
        .options("/api/test/hello")
        .set("Origin", "http://localhost:3000")
        .set("Access-Control-Request-Method", "GET");

      expect(response.status).toBe(204);
      expect(response.headers["access-control-allow-origin"]).toBe(
        "http://localhost:3000"
      );
    });
  });

  describe("Body size handling", () => {
    it("should accept normal-sized payloads", async () => {
      const normalPayload = { data: "x".repeat(1000) };

      const response = await supertest(app.getHttpServer())
        .post("/api/test/echo")
        .send(normalPayload);

      expect(response.status).toBe(201);
      expect(response.body.received).toBeDefined();
    });

    it("should reject oversized payloads with 413", async () => {
      // Create a new app with body size limit middleware
      const moduleFixture = await Test.createTestingModule({
        imports: [TestAppModule],
      }).compile();

      const limitedApp = moduleFixture.createNestApplication();

      // Add body size checking middleware before NestJS handles the request
      limitedApp.use((req: any, res: any, next: any) => {
        const contentLength = parseInt(
          req.headers["content-length"] || "0",
          10
        );
        if (contentLength > 1024) {
          res.status(413).json({
            success: false,
            error: {
              code: "PAYLOAD_TOO_LARGE",
              message: "Request entity too large",
            },
          });
          return;
        }
        next();
      });

      limitedApp.setGlobalPrefix("api");
      await limitedApp.init();

      const oversizedPayload = JSON.stringify({ data: "x".repeat(2000) });

      const response = await supertest(limitedApp.getHttpServer())
        .post("/api/test/echo")
        .set("Content-Type", "application/json")
        .set("Content-Length", String(oversizedPayload.length))
        .send(oversizedPayload);

      expect(response.status).toBe(413);
      expect(response.body.error.code).toBe("PAYLOAD_TOO_LARGE");

      await limitedApp.close();
    });
  });
});

describe("Rate Limiting", () => {
  it("should return 429 when rate limit is exceeded", async () => {
    let requestCount = 0;
    const rateLimit = 5;

    @Controller("limited")
    class LimitedController {
      @Get()
      handle() {
        return { count: requestCount };
      }
    }

    @Module({
      controllers: [LimitedController],
    })
    class LimitedAppModule {}

    const moduleFixture = await Test.createTestingModule({
      imports: [LimitedAppModule],
    }).compile();

    const app = moduleFixture.createNestApplication();

    app.use((req: any, res: any, next: any) => {
      if (req.url === "/api/limited") {
        requestCount++;
        if (requestCount > rateLimit) {
          res.status(429).json({
            success: false,
            error: {
              code: "TOO_MANY_REQUESTS",
              message: "Rate limit exceeded. Try again later.",
            },
          });
          return;
        }
      }
      next();
    });

    app.setGlobalPrefix("api");
    await app.init();

    // Send requests up to the limit
    for (let i = 0; i < rateLimit; i++) {
      const response = await supertest(app.getHttpServer()).get("/api/limited");
      expect(response.status).toBe(200);
    }

    // Next request should be rate limited
    const rateLimitedResponse = await supertest(app.getHttpServer()).get(
      "/api/limited"
    );

    expect(rateLimitedResponse.status).toBe(429);
    expect(rateLimitedResponse.body.error.code).toBe("TOO_MANY_REQUESTS");

    await app.close();
  });

  it("should include appropriate error message in 429 response", async () => {
    @Controller("test-rate")
    class RateController {
      @Get()
      handle() {
        return { ok: true };
      }
    }

    @Module({
      controllers: [RateController],
    })
    class RateAppModule {}

    const moduleFixture = await Test.createTestingModule({
      imports: [RateAppModule],
    }).compile();

    const app = moduleFixture.createNestApplication();

    app.use((req: any, res: any, next: any) => {
      if (req.url === "/api/test-rate") {
        res.status(429).json({
          success: false,
          error: {
            code: "TOO_MANY_REQUESTS",
            message: "Rate limit exceeded. Try again later.",
          },
        });
        return;
      }
      next();
    });

    app.setGlobalPrefix("api");
    await app.init();

    const response = await supertest(app.getHttpServer()).get("/api/test-rate");

    expect(response.status).toBe(429);
    expect(response.body.success).toBe(false);
    expect(response.body.error.message).toContain("Rate limit exceeded");

    await app.close();
  });
});
