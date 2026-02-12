import "reflect-metadata";

import {
  ArgumentsHost,
  BadRequestException,
  ConflictException,
  ForbiddenException,
  HttpException,
  HttpStatus,
  NotFoundException,
  UnauthorizedException,
  UnprocessableEntityException,
} from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import { AppLogger } from "../../logger";
import { AllExceptionsFilter } from "../all-exceptions.filter";

describe("AllExceptionsFilter", () => {
  let filter: AllExceptionsFilter;
  let logger: jest.Mocked<AppLogger>;

  const createMockHost = (
    body: any = {},
    url = "/test",
    method = "POST"
  ): { host: ArgumentsHost; response: any; request: any } => {
    const mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
    const mockRequest = { url, method, body };
    const mockHost = {
      switchToHttp: () => ({
        getResponse: () => mockResponse,
        getRequest: () => mockRequest,
      }),
    } as ArgumentsHost;
    return { host: mockHost, response: mockResponse, request: mockRequest };
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AllExceptionsFilter,
        {
          provide: AppLogger,
          useValue: {
            error: jest.fn(),
            warn: jest.fn(),
            log: jest.fn(),
          },
        },
      ],
    }).compile();

    filter = module.get<AllExceptionsFilter>(AllExceptionsFilter);
    logger = module.get(AppLogger);
  });

  describe("HttpException handling", () => {
    it("should catch HttpException and format response", () => {
      const { host, response } = createMockHost({
        otp: "123456",
        name: "test",
      });
      const exception = new HttpException(
        "Bad Request",
        HttpStatus.BAD_REQUEST
      );

      filter.catch(exception, host);

      expect(response.status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
      expect(response.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.objectContaining({
            code: "BAD_REQUEST",
            message: "Bad Request",
          }),
        })
      );
    });

    it("should catch unknown errors as 500", () => {
      const { host, response } = createMockHost({}, "/test", "GET");
      const exception = new Error("Something went wrong");

      filter.catch(exception, host);

      expect(response.status).toHaveBeenCalledWith(
        HttpStatus.INTERNAL_SERVER_ERROR
      );
      expect(logger.error).toHaveBeenCalled();
    });
  });

  describe("sanitization", () => {
    it("should sanitize OTP fields in request body", () => {
      const { host } = createMockHost({ otp: "123456", name: "test" });
      const exception = new BadRequestException("Invalid");

      filter.catch(exception, host);

      expect(logger.warn).toHaveBeenCalledWith(
        expect.stringContaining('"otp":"********"')
      );
      expect(logger.warn).toHaveBeenCalledWith(
        expect.stringContaining('"name":"test"')
      );
    });

    it("should sanitize password fields", () => {
      const { host } = createMockHost({
        email: "test@test.com",
        password: "secret123",
      });
      const exception = new BadRequestException("Invalid");

      filter.catch(exception, host);

      expect(logger.warn).toHaveBeenCalledWith(
        expect.stringContaining('"password":"********"')
      );
      expect(logger.warn).toHaveBeenCalledWith(
        expect.stringContaining('"email":"test@test.com"')
      );
    });

    it("should sanitize token fields", () => {
      const { host } = createMockHost({
        token: "jwt-token-value",
        userId: "user-1",
      });
      const exception = new BadRequestException("Invalid");

      filter.catch(exception, host);

      expect(logger.warn).toHaveBeenCalledWith(
        expect.stringContaining('"token":"********"')
      );
    });

    it("should sanitize apiKey fields", () => {
      const { host } = createMockHost({
        apiKey: "lk_secret_key",
        name: "my-key",
      });
      const exception = new BadRequestException("Invalid");

      filter.catch(exception, host);

      expect(logger.warn).toHaveBeenCalledWith(
        expect.stringContaining('"apiKey":"********"')
      );
    });

    it("should sanitize key fields", () => {
      const { host } = createMockHost({ key: "secret-value", type: "test" });
      const exception = new BadRequestException("Invalid");

      filter.catch(exception, host);

      expect(logger.warn).toHaveBeenCalledWith(
        expect.stringContaining('"key":"********"')
      );
    });

    it("should recursively sanitize nested objects", () => {
      const { host } = createMockHost({
        user: {
          name: "test",
          password: "secret",
        },
      });
      const exception = new BadRequestException("Invalid");

      filter.catch(exception, host);

      const logCall = logger.warn.mock.calls[0]![0] as string;
      expect(logCall).toContain('"password":"********"');
      expect(logCall).toContain('"name":"test"');
    });

    it("should handle null/undefined body gracefully", () => {
      const { host } = createMockHost(null);
      const exception = new BadRequestException("Invalid");

      expect(() => filter.catch(exception, host)).not.toThrow();
    });

    it("should sanitize case-insensitively (e.g., myPassword, authToken)", () => {
      const { host } = createMockHost({
        myPassword: "secret",
        authToken: "token-val",
        normalField: "visible",
      });
      const exception = new BadRequestException("Invalid");

      filter.catch(exception, host);

      const logCall = logger.warn.mock.calls[0]![0] as string;
      expect(logCall).toContain('"myPassword":"********"');
      expect(logCall).toContain('"authToken":"********"');
      expect(logCall).toContain('"normalField":"visible"');
    });
  });

  describe("error code mapping", () => {
    const testCases = [
      {
        exception: new BadRequestException("Bad"),
        code: "BAD_REQUEST",
        status: 400,
      },
      {
        exception: new UnauthorizedException("Unauth"),
        code: "UNAUTHORIZED",
        status: 401,
      },
      {
        exception: new ForbiddenException("Forbidden"),
        code: "FORBIDDEN",
        status: 403,
      },
      {
        exception: new NotFoundException("Not found"),
        code: "NOT_FOUND",
        status: 404,
      },
      {
        exception: new ConflictException("Conflict"),
        code: "CONFLICT",
        status: 409,
      },
      {
        exception: new UnprocessableEntityException("Unprocessable"),
        code: "VALIDATION_ERROR",
        status: 422,
      },
    ];

    for (const { exception, code, status } of testCases) {
      it(`should map ${status} to ${code}`, () => {
        const { host, response } = createMockHost();

        filter.catch(exception, host);

        expect(response.status).toHaveBeenCalledWith(status);
        expect(response.json).toHaveBeenCalledWith(
          expect.objectContaining({
            error: expect.objectContaining({ code }),
          })
        );
      });
    }

    it("should map unknown status to INTERNAL_SERVER_ERROR", () => {
      const { host, response } = createMockHost();
      const exception = new Error("Unknown");

      filter.catch(exception, host);

      expect(response.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.objectContaining({ code: "INTERNAL_SERVER_ERROR" }),
        })
      );
    });
  });

  describe("logging", () => {
    it("should use error level for 5xx status codes", () => {
      const { host } = createMockHost();
      const exception = new Error("Server error");

      filter.catch(exception, host);

      expect(logger.error).toHaveBeenCalled();
      expect(logger.warn).not.toHaveBeenCalled();
    });

    it("should use warn level for 4xx status codes", () => {
      const { host } = createMockHost();
      const exception = new BadRequestException("Bad request");

      filter.catch(exception, host);

      expect(logger.warn).toHaveBeenCalled();
      expect(logger.error).not.toHaveBeenCalled();
    });

    it("should include request method and URL in log", () => {
      const { host } = createMockHost({}, "/api/users", "GET");
      const exception = new NotFoundException("Not found");

      filter.catch(exception, host);

      expect(logger.warn).toHaveBeenCalledWith(
        expect.stringContaining("GET /api/users")
      );
    });
  });

  describe("response format", () => {
    it("should include meta with timestamp and path", () => {
      const { host, response } = createMockHost({}, "/api/test");
      const exception = new BadRequestException("Invalid");

      filter.catch(exception, host);

      const responseBody = response.json.mock.calls[0][0];
      expect(responseBody.meta).toBeDefined();
      expect(responseBody.meta.path).toBe("/api/test");
      expect(responseBody.meta.timestamp).toBeDefined();
    });

    it("should set success to false", () => {
      const { host, response } = createMockHost();
      const exception = new BadRequestException("Invalid");

      filter.catch(exception, host);

      const responseBody = response.json.mock.calls[0][0];
      expect(responseBody.success).toBe(false);
    });
  });
});
