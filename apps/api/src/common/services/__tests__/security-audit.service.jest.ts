import "reflect-metadata";

import { Test, TestingModule } from "@nestjs/testing";
import { AppLogger } from "../../logger";
import {
  SecurityAuditService,
  SecurityEventType,
} from "../security-audit.service";

describe("SecurityAuditService", () => {
  let service: SecurityAuditService;
  let logger: jest.Mocked<AppLogger>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SecurityAuditService,
        {
          provide: AppLogger,
          useValue: {
            log: jest.fn(),
            warn: jest.fn(),
            error: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<SecurityAuditService>(SecurityAuditService);
    logger = module.get(AppLogger);
  });

  describe("log levels per event type", () => {
    it("should use log level for AUTH_SUCCESS", () => {
      service.log({
        type: "AUTH_SUCCESS",
        message: "User logged in",
        email: "user@example.com",
      });

      expect(logger.log).toHaveBeenCalledWith(
        expect.any(String),
        "SecurityAudit"
      );
      expect(logger.warn).not.toHaveBeenCalled();
      expect(logger.error).not.toHaveBeenCalled();
    });

    it("should use warn level for AUTH_FAILURE", () => {
      service.log({
        type: "AUTH_FAILURE",
        message: "Invalid credentials",
        email: "user@example.com",
      });

      expect(logger.warn).toHaveBeenCalledWith(
        expect.any(String),
        "SecurityAudit"
      );
      expect(logger.log).not.toHaveBeenCalled();
      expect(logger.error).not.toHaveBeenCalled();
    });

    it("should use warn level for API_KEY_INVALID", () => {
      service.log({
        type: "API_KEY_INVALID",
        message: "Invalid API key used",
        ip: "192.168.1.1",
      });

      expect(logger.warn).toHaveBeenCalledWith(
        expect.any(String),
        "SecurityAudit"
      );
    });

    it("should use warn level for API_KEY_EXPIRED", () => {
      service.log({
        type: "API_KEY_EXPIRED",
        message: "Expired API key used",
        ip: "192.168.1.1",
      });

      expect(logger.warn).toHaveBeenCalledWith(
        expect.any(String),
        "SecurityAudit"
      );
    });

    it("should use error level for ACCOUNT_LOCKED", () => {
      service.log({
        type: "ACCOUNT_LOCKED",
        message: "Account locked after too many attempts",
        email: "user@example.com",
      });

      expect(logger.error).toHaveBeenCalledWith(
        expect.any(String),
        undefined,
        "SecurityAudit"
      );
    });

    it("should use error level for OTP_BRUTE_FORCE", () => {
      service.log({
        type: "OTP_BRUTE_FORCE",
        message: "OTP brute force detected",
        email: "user@example.com",
        ip: "192.168.1.1",
      });

      expect(logger.error).toHaveBeenCalledWith(
        expect.any(String),
        undefined,
        "SecurityAudit"
      );
    });

    it("should use error level for IP_FLAGGED", () => {
      service.log({
        type: "IP_FLAGGED",
        message: "IP flagged for suspicious activity",
        ip: "192.168.1.1",
      });

      expect(logger.error).toHaveBeenCalledWith(
        expect.any(String),
        undefined,
        "SecurityAudit"
      );
    });

    it("should use error level for SUSPICIOUS_REQUEST", () => {
      service.log({
        type: "SUSPICIOUS_REQUEST",
        message: "Suspicious request detected",
        ip: "192.168.1.1",
      });

      expect(logger.error).toHaveBeenCalledWith(
        expect.any(String),
        undefined,
        "SecurityAudit"
      );
    });
  });

  describe("structured output", () => {
    it("should include event type in log output", () => {
      service.log({
        type: "AUTH_SUCCESS",
        message: "User logged in",
      });

      const loggedMessage = logger.log.mock.calls[0]![0] as string;
      const parsed = JSON.parse(loggedMessage);
      expect(parsed.securityEvent).toBe("AUTH_SUCCESS");
    });

    it("should include message in log output", () => {
      service.log({
        type: "AUTH_FAILURE",
        message: "Invalid credentials",
      });

      const loggedMessage = logger.warn.mock.calls[0]![0] as string;
      const parsed = JSON.parse(loggedMessage);
      expect(parsed.message).toBe("Invalid credentials");
    });

    it("should include ip and email when provided", () => {
      service.log({
        type: "AUTH_FAILURE",
        message: "Failed login",
        ip: "10.0.0.1",
        email: "test@example.com",
      });

      const loggedMessage = logger.warn.mock.calls[0]![0] as string;
      const parsed = JSON.parse(loggedMessage);
      expect(parsed.ip).toBe("10.0.0.1");
      expect(parsed.email).toBe("test@example.com");
    });

    it("should include timestamp in log output", () => {
      service.log({
        type: "AUTH_SUCCESS",
        message: "Login",
      });

      const loggedMessage = logger.log.mock.calls[0]![0] as string;
      const parsed = JSON.parse(loggedMessage);
      expect(parsed.timestamp).toBeDefined();
      // Verify it's a valid ISO string
      expect(new Date(parsed.timestamp).toISOString()).toBe(parsed.timestamp);
    });

    it("should include metadata when provided", () => {
      service.log({
        type: "AUTH_FAILURE",
        message: "Failed",
        metadata: { attemptCount: 3, userAgent: "curl/7.0" },
      });

      const loggedMessage = logger.warn.mock.calls[0]![0] as string;
      const parsed = JSON.parse(loggedMessage);
      expect(parsed.attemptCount).toBe(3);
      expect(parsed.userAgent).toBe("curl/7.0");
    });
  });

  describe("all event types are handled", () => {
    const eventTypes: SecurityEventType[] = [
      "AUTH_SUCCESS",
      "AUTH_FAILURE",
      "ACCOUNT_LOCKED",
      "API_KEY_INVALID",
      "API_KEY_EXPIRED",
      "OTP_BRUTE_FORCE",
      "IP_FLAGGED",
      "SUSPICIOUS_REQUEST",
    ];

    for (const eventType of eventTypes) {
      it(`should handle ${eventType} without throwing`, () => {
        expect(() => {
          service.log({
            type: eventType,
            message: `Test ${eventType}`,
          });
        }).not.toThrow();
      });
    }
  });
});
