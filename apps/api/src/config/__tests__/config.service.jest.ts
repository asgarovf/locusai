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
    process.env.SWAGGER_DOCS_ENABLED = "false";
    delete process.env.SWAGGER_DOCS_USERNAME;
    delete process.env.SWAGGER_DOCS_PASSWORD;

    const module: TestingModule = await Test.createTestingModule({
      imports: [
        NestConfigModule.forRoot({
          load: [configuration],
          ignoreEnvFile: true,
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

  it("should return swagger docs settings from typed accessor", () => {
    expect(service.getSwaggerDocsConfig()).toEqual({
      enabled: false,
      username: undefined,
      password: undefined,
    });
  });

  it("should return default values for security env vars", () => {
    expect(service.get("THROTTLE_TTL")).toBe(60);
    expect(service.get("THROTTLE_LIMIT")).toBe(100);
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
      expect(result.THROTTLE_LIMIT).toBe(100);
      expect(result.LOCKOUT_MAX_ATTEMPTS).toBe(5);
      expect(result.LOCKOUT_WINDOW_MINUTES).toBe(15);
      expect(result.LOCKOUT_DURATION_MINUTES).toBe(30);
      expect(result.OTP_MAX_ATTEMPTS).toBe(5);
    });

    describe("Swagger Docs Validation", () => {
      const baseConfig = {
        DATABASE_URL: "postgres://localhost:5432/db",
        JWT_SECRET: "a-very-long-secret-that-is-at-least-32-chars",
      };

      it("should parse valid swagger config when docs are enabled", () => {
        const result = ConfigSchema.parse({
          ...baseConfig,
          SWAGGER_DOCS_ENABLED: "true",
          SWAGGER_DOCS_USERNAME: "  admin-user  ",
          SWAGGER_DOCS_PASSWORD: "  secure-password  ",
        });

        expect(result.SWAGGER_DOCS_ENABLED).toBe(true);
        expect(result.SWAGGER_DOCS_USERNAME).toBe("admin-user");
        expect(result.SWAGGER_DOCS_PASSWORD).toBe("secure-password");
      });

      it("should parse valid swagger config when docs are disabled", () => {
        const result = ConfigSchema.parse({
          ...baseConfig,
          SWAGGER_DOCS_ENABLED: "false",
        });

        expect(result.SWAGGER_DOCS_ENABLED).toBe(false);
        expect(result.SWAGGER_DOCS_USERNAME).toBeUndefined();
        expect(result.SWAGGER_DOCS_PASSWORD).toBeUndefined();
      });

      it("should reject enabled swagger docs without username", () => {
        const parsed = ConfigSchema.safeParse({
          ...baseConfig,
          SWAGGER_DOCS_ENABLED: "true",
          SWAGGER_DOCS_PASSWORD: "secure-password",
        });

        expect(parsed.success).toBe(false);
        if (!parsed.success) {
          expect(parsed.error.issues).toEqual(
            expect.arrayContaining([
              expect.objectContaining({
                path: ["SWAGGER_DOCS_USERNAME"],
                message:
                  "SWAGGER_DOCS_USERNAME is required when SWAGGER_DOCS_ENABLED=true",
              }),
            ])
          );
        }
      });

      it("should reject enabled swagger docs without password", () => {
        const parsed = ConfigSchema.safeParse({
          ...baseConfig,
          SWAGGER_DOCS_ENABLED: "true",
          SWAGGER_DOCS_USERNAME: "admin-user",
        });

        expect(parsed.success).toBe(false);
        if (!parsed.success) {
          expect(parsed.error.issues).toEqual(
            expect.arrayContaining([
              expect.objectContaining({
                path: ["SWAGGER_DOCS_PASSWORD"],
                message:
                  "SWAGGER_DOCS_PASSWORD is required when SWAGGER_DOCS_ENABLED=true",
              }),
            ])
          );
        }
      });

      it("should reject blank swagger credentials when docs are enabled", () => {
        const parsed = ConfigSchema.safeParse({
          ...baseConfig,
          SWAGGER_DOCS_ENABLED: "true",
          SWAGGER_DOCS_USERNAME: "   ",
          SWAGGER_DOCS_PASSWORD: "   ",
        });

        expect(parsed.success).toBe(false);
        if (!parsed.success) {
          expect(parsed.error.issues).toEqual(
            expect.arrayContaining([
              expect.objectContaining({
                path: ["SWAGGER_DOCS_USERNAME"],
                message:
                  "SWAGGER_DOCS_USERNAME is required when SWAGGER_DOCS_ENABLED=true",
              }),
              expect.objectContaining({
                path: ["SWAGGER_DOCS_PASSWORD"],
                message:
                  "SWAGGER_DOCS_PASSWORD is required when SWAGGER_DOCS_ENABLED=true",
              }),
            ])
          );
        }
      });
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

    it("should not include plaintext swagger password in validation output", () => {
      const errorSpy = jest.spyOn(console, "error").mockImplementation();
      const logSpy = jest.spyOn(console, "log").mockImplementation();
      const plaintextPassword = "never-log-this-swagger-password";

      process.env.DATABASE_URL = "postgres://localhost:5432/db";
      process.env.JWT_SECRET = "a-very-long-secret-that-is-at-least-32-chars";
      process.env.SWAGGER_DOCS_ENABLED = "true";
      delete process.env.SWAGGER_DOCS_USERNAME;
      process.env.SWAGGER_DOCS_PASSWORD = plaintextPassword;

      expect(() => configuration()).toThrow("Invalid api configuration");

      const consoleOutput = errorSpy.mock.calls
        .map((call) => JSON.stringify(call))
        .join(" ");
      expect(consoleOutput).not.toContain(plaintextPassword);

      errorSpy.mockRestore();
      logSpy.mockRestore();
    });
  });
});
