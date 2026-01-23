import "reflect-metadata";
import { ConfigModule as NestConfigModule } from "@nestjs/config";
import { Test, TestingModule } from "@nestjs/testing";
import { TypedConfigService } from "../config.service";
import configuration, { ConfigSchema } from "../configuration";

describe("ConfigModule", () => {
  let service: TypedConfigService;

  beforeEach(async () => {
    // Set required env vars for validation to pass
    process.env.DATABASE_URL = "postgres://localhost:5432/db";
    process.env.JWT_SECRET = "a-very-long-secret-that-is-at-least-32-chars";

    const module: TestingModule = await Test.createTestingModule({
      imports: [
        NestConfigModule.forRoot({
          load: [configuration],
        }),
      ],
      providers: [TypedConfigService],
    }).compile();

    service = module.get<TypedConfigService>(TypedConfigService);
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  it("should return default values", () => {
    expect(service.get("PORT")).toBe(8000);
    expect(service.get("NODE_ENV")).toBe("test");
  });

  it("should return values from process.env", () => {
    expect(service.get("DATABASE_URL")).toBe("postgres://localhost:5432/db");
  });

  describe("Configuration Validation", () => {
    it("should throw error for invalid configuration", () => {
      const invalidConfig = {
        PORT: "invalid", // Should be a number
        JWT_SECRET: "short", // Too short
      };

      expect(() => ConfigSchema.parse(invalidConfig)).toThrow();
    });

    it("should parse valid configuration", () => {
      const validConfig = {
        DATABASE_URL: "postgres://localhost:5432/db",
        JWT_SECRET: "a-very-long-secret-that-is-at-least-32-chars",
      };

      const result = ConfigSchema.parse(validConfig);
      expect(result.DATABASE_URL).toBe(validConfig.DATABASE_URL);
      expect(result.PORT).toBe(8000); // Default value
    });

    it("should allow optional RESEND_API_KEY", () => {
      const configWithoutResend = {
        DATABASE_URL: "postgres://localhost:5432/db",
        JWT_SECRET: "a-very-long-secret-that-is-at-least-32-chars",
      };

      const result = ConfigSchema.parse(configWithoutResend);
      expect(result.RESEND_API_KEY).toBeUndefined();
    });
  });
});
