import "reflect-metadata";
import { ConfigModule as NestConfigModule } from "@nestjs/config";
import { Test, TestingModule } from "@nestjs/testing";
import { TypedConfigService } from "../config.service";
import configuration, { ConfigSchema } from "../configuration";

describe("ConfigModule", () => {
  let service: TypedConfigService;
  // Snapshot env at module load time before any test mutations
  const envSnapshot = { ...process.env };

  beforeEach(async () => {
    // Restore a clean copy of the environment before each test
    process.env = { ...envSnapshot };

    // Set required env vars for validation to pass
    process.env.NODE_ENV = "test";
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

  afterEach(() => {
    process.env = { ...envSnapshot };
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

  it("should return default values for security env vars", () => {
    expect(service.get("THROTTLE_TTL")).toBe(60);
    expect(service.get("THROTTLE_LIMIT")).toBe(10);
    expect(service.get("LOCKOUT_MAX_ATTEMPTS")).toBe(5);
    expect(service.get("LOCKOUT_WINDOW_MINUTES")).toBe(15);
    expect(service.get("LOCKOUT_DURATION_MINUTES")).toBe(30);
    expect(service.get("OTP_MAX_ATTEMPTS")).toBe(5);
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

    it("should parse security env vars with custom values", () => {
      const config = {
        DATABASE_URL: "postgres://localhost:5432/db",
        JWT_SECRET: "a-very-long-secret-that-is-at-least-32-chars",
        THROTTLE_TTL: "120",
        THROTTLE_LIMIT: "20",
        LOCKOUT_MAX_ATTEMPTS: "3",
        LOCKOUT_WINDOW_MINUTES: "10",
        LOCKOUT_DURATION_MINUTES: "60",
        OTP_MAX_ATTEMPTS: "3",
      };

      const result = ConfigSchema.parse(config);
      expect(result.THROTTLE_TTL).toBe(120);
      expect(result.THROTTLE_LIMIT).toBe(20);
      expect(result.LOCKOUT_MAX_ATTEMPTS).toBe(3);
      expect(result.LOCKOUT_WINDOW_MINUTES).toBe(10);
      expect(result.LOCKOUT_DURATION_MINUTES).toBe(60);
      expect(result.OTP_MAX_ATTEMPTS).toBe(3);
    });

    it("should use default values for security env vars when not provided", () => {
      const config = {
        DATABASE_URL: "postgres://localhost:5432/db",
        JWT_SECRET: "a-very-long-secret-that-is-at-least-32-chars",
      };

      const result = ConfigSchema.parse(config);
      expect(result.THROTTLE_TTL).toBe(60);
      expect(result.THROTTLE_LIMIT).toBe(10);
      expect(result.LOCKOUT_MAX_ATTEMPTS).toBe(5);
      expect(result.LOCKOUT_WINDOW_MINUTES).toBe(15);
      expect(result.LOCKOUT_DURATION_MINUTES).toBe(30);
      expect(result.OTP_MAX_ATTEMPTS).toBe(5);
    });
  });

  describe("Security Validation", () => {
    it("should reject insecure JWT_SECRET 'secret'", () => {
      expect(() =>
        ConfigSchema.parse({
          DATABASE_URL: "postgres://localhost:5432/db",
          JWT_SECRET: "short",
        })
      ).toThrow();
    });

    it("should reject JWT_SECRET matching known insecure defaults via configuration loader", () => {
      process.env.DATABASE_URL = "postgres://localhost:5432/db";
      process.env.JWT_SECRET = "secret";

      expect(() => configuration()).toThrow();
    });

    it("should warn when CORS_ORIGIN is wildcard in production", () => {
      const warnSpy = jest.spyOn(console, "warn").mockImplementation();
      const logSpy = jest.spyOn(console, "log").mockImplementation();

      process.env.DATABASE_URL = "postgres://localhost:5432/db";
      process.env.JWT_SECRET = "a-very-long-secret-that-is-at-least-32-chars";
      process.env.NODE_ENV = "production";
      process.env.CORS_ORIGIN = "*";

      configuration();

      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining("CORS_ORIGIN is set to '*' in production")
      );

      warnSpy.mockRestore();
      logSpy.mockRestore();
    });

    it("should warn when DATABASE_SYNC is true in production", () => {
      const warnSpy = jest.spyOn(console, "warn").mockImplementation();
      const logSpy = jest.spyOn(console, "log").mockImplementation();

      process.env.DATABASE_URL = "postgres://localhost:5432/db";
      process.env.JWT_SECRET = "a-very-long-secret-that-is-at-least-32-chars";
      process.env.NODE_ENV = "production";
      process.env.DATABASE_SYNC = "true";

      configuration();

      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining("DATABASE_SYNC is enabled in production")
      );

      warnSpy.mockRestore();
      logSpy.mockRestore();
    });

    it("should not warn about CORS or DATABASE_SYNC in development", () => {
      const warnSpy = jest.spyOn(console, "warn").mockImplementation();
      const logSpy = jest.spyOn(console, "log").mockImplementation();

      process.env.DATABASE_URL = "postgres://localhost:5432/db";
      process.env.JWT_SECRET = "a-very-long-secret-that-is-at-least-32-chars";
      process.env.NODE_ENV = "development";
      process.env.CORS_ORIGIN = "*";
      process.env.DATABASE_SYNC = "true";

      configuration();

      expect(warnSpy).not.toHaveBeenCalled();

      warnSpy.mockRestore();
      logSpy.mockRestore();
    });

    it("should log security configuration summary", () => {
      const logSpy = jest.spyOn(console, "log").mockImplementation();

      process.env.DATABASE_URL = "postgres://localhost:5432/db";
      process.env.JWT_SECRET = "a-very-long-secret-that-is-at-least-32-chars";
      process.env.NODE_ENV = "development";

      configuration();

      expect(logSpy).toHaveBeenCalledWith(
        expect.stringContaining("Security Configuration Summary")
      );

      logSpy.mockRestore();
    });
  });
});
