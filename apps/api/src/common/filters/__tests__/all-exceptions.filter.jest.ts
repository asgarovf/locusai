import "reflect-metadata";
import { ArgumentsHost, HttpException, HttpStatus } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import { AppLogger } from "../../logger";
import { AllExceptionsFilter } from "../all-exceptions.filter";

describe("AllExceptionsFilter", () => {
  let filter: AllExceptionsFilter;
  let logger: jest.Mocked<AppLogger>;

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

  it("should catch HttpException and format response", () => {
    const mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
    const mockRequest = {
      url: "/test",
      method: "POST",
      body: { otp: "123456", name: "test" },
    };
    const mockHost = {
      switchToHttp: () => ({
        getResponse: () => mockResponse,
        getRequest: () => mockRequest,
      }),
    } as ArgumentsHost;

    const exception = new HttpException("Bad Request", HttpStatus.BAD_REQUEST);

    filter.catch(exception, mockHost);

    expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
    expect(mockResponse.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        error: expect.objectContaining({
          code: "BAD_REQUEST",
          message: "Bad Request",
        }),
      })
    );

    // Check if sanitization works in logs
    expect(logger.warn).toHaveBeenCalledWith(
      expect.stringContaining('"otp":"********"')
    );
    expect(logger.warn).toHaveBeenCalledWith(
      expect.stringContaining('"name":"test"')
    );
  });

  it("should catch unknown errors as 500", () => {
    const mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
    const mockRequest = {
      url: "/test",
      method: "GET",
      body: {},
    };
    const mockHost = {
      switchToHttp: () => ({
        getResponse: () => mockResponse,
        getRequest: () => mockRequest,
      }),
    } as ArgumentsHost;

    const exception = new Error("Something went wrong");

    filter.catch(exception, mockHost);

    expect(mockResponse.status).toHaveBeenCalledWith(
      HttpStatus.INTERNAL_SERVER_ERROR
    );
    expect(logger.error).toHaveBeenCalled();
  });

  it("should handle 429 Too Many Requests with TOO_MANY_REQUESTS code", () => {
    const mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
    const mockRequest = {
      url: "/api/login",
      method: "POST",
      body: { email: "test@example.com" },
    };
    const mockHost = {
      switchToHttp: () => ({
        getResponse: () => mockResponse,
        getRequest: () => mockRequest,
      }),
    } as ArgumentsHost;

    const exception = new HttpException(
      "ThrottlerException: Too Many Requests",
      HttpStatus.TOO_MANY_REQUESTS
    );

    filter.catch(exception, mockHost);

    expect(mockResponse.status).toHaveBeenCalledWith(
      HttpStatus.TOO_MANY_REQUESTS
    );
    expect(mockResponse.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        error: expect.objectContaining({
          code: "TOO_MANY_REQUESTS",
          message: "ThrottlerException: Too Many Requests",
        }),
        meta: expect.objectContaining({
          path: "/api/login",
        }),
      })
    );
    expect(logger.warn).toHaveBeenCalled();
  });

  it("should include timestamp in meta for rate limit errors", () => {
    const mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
    const mockRequest = {
      url: "/api/endpoint",
      method: "GET",
      body: {},
    };
    const mockHost = {
      switchToHttp: () => ({
        getResponse: () => mockResponse,
        getRequest: () => mockRequest,
      }),
    } as ArgumentsHost;

    const exception = new HttpException(
      "Rate limit exceeded",
      HttpStatus.TOO_MANY_REQUESTS
    );

    filter.catch(exception, mockHost);

    expect(mockResponse.json).toHaveBeenCalledWith(
      expect.objectContaining({
        meta: expect.objectContaining({
          timestamp: expect.any(String),
        }),
      })
    );
  });

  it("should handle HttpException with UNAUTHORIZED status", () => {
    const mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
    const mockRequest = {
      url: "/api/protected",
      method: "GET",
      body: {},
    };
    const mockHost = {
      switchToHttp: () => ({
        getResponse: () => mockResponse,
        getRequest: () => mockRequest,
      }),
    } as ArgumentsHost;

    const exception = new HttpException("Unauthorized", HttpStatus.UNAUTHORIZED);

    filter.catch(exception, mockHost);

    expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.UNAUTHORIZED);
    expect(mockResponse.json).toHaveBeenCalledWith(
      expect.objectContaining({
        error: expect.objectContaining({
          code: "UNAUTHORIZED",
        }),
      })
    );
  });

  it("should handle HttpException with FORBIDDEN status", () => {
    const mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
    const mockRequest = {
      url: "/api/admin",
      method: "POST",
      body: {},
    };
    const mockHost = {
      switchToHttp: () => ({
        getResponse: () => mockResponse,
        getRequest: () => mockRequest,
      }),
    } as ArgumentsHost;

    const exception = new HttpException("Forbidden", HttpStatus.FORBIDDEN);

    filter.catch(exception, mockHost);

    expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.FORBIDDEN);
    expect(mockResponse.json).toHaveBeenCalledWith(
      expect.objectContaining({
        error: expect.objectContaining({
          code: "FORBIDDEN",
        }),
      })
    );
  });

  it("should handle HttpException with NOT_FOUND status", () => {
    const mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
    const mockRequest = {
      url: "/api/resources/123",
      method: "GET",
      body: {},
    };
    const mockHost = {
      switchToHttp: () => ({
        getResponse: () => mockResponse,
        getRequest: () => mockRequest,
      }),
    } as ArgumentsHost;

    const exception = new HttpException("Not Found", HttpStatus.NOT_FOUND);

    filter.catch(exception, mockHost);

    expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.NOT_FOUND);
    expect(mockResponse.json).toHaveBeenCalledWith(
      expect.objectContaining({
        error: expect.objectContaining({
          code: "NOT_FOUND",
        }),
      })
    );
  });

  it("should handle HttpException with REQUEST_TIMEOUT status", () => {
    const mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
    const mockRequest = {
      url: "/api/slow-endpoint",
      method: "GET",
      body: {},
    };
    const mockHost = {
      switchToHttp: () => ({
        getResponse: () => mockResponse,
        getRequest: () => mockRequest,
      }),
    } as ArgumentsHost;

    const exception = new HttpException("Request Timeout", HttpStatus.REQUEST_TIMEOUT);

    filter.catch(exception, mockHost);

    expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.REQUEST_TIMEOUT);
    expect(mockResponse.json).toHaveBeenCalledWith(
      expect.objectContaining({
        error: expect.objectContaining({
          code: "REQUEST_TIMEOUT",
        }),
      })
    );
  });

  it("should handle HttpException with CONFLICT status", () => {
    const mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
    const mockRequest = {
      url: "/api/resources",
      method: "POST",
      body: {},
    };
    const mockHost = {
      switchToHttp: () => ({
        getResponse: () => mockResponse,
        getRequest: () => mockRequest,
      }),
    } as ArgumentsHost;

    const exception = new HttpException("Conflict", HttpStatus.CONFLICT);

    filter.catch(exception, mockHost);

    expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.CONFLICT);
    expect(mockResponse.json).toHaveBeenCalledWith(
      expect.objectContaining({
        error: expect.objectContaining({
          code: "CONFLICT",
        }),
      })
    );
  });

  it("should handle HttpException with UNPROCESSABLE_ENTITY status", () => {
    const mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
    const mockRequest = {
      url: "/api/validate",
      method: "POST",
      body: { email: "invalid" },
    };
    const mockHost = {
      switchToHttp: () => ({
        getResponse: () => mockResponse,
        getRequest: () => mockRequest,
      }),
    } as ArgumentsHost;

    const exception = new HttpException("Validation Error", HttpStatus.UNPROCESSABLE_ENTITY);

    filter.catch(exception, mockHost);

    expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.UNPROCESSABLE_ENTITY);
    expect(mockResponse.json).toHaveBeenCalledWith(
      expect.objectContaining({
        error: expect.objectContaining({
          code: "VALIDATION_ERROR",
        }),
      })
    );
  });

  it("should sanitize nested sensitive data in request body", () => {
    const mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
    const mockRequest = {
      url: "/api/auth",
      method: "POST",
      body: {
        user: {
          password: "secret123",
          profile: {
            apiKey: "key-123",
            name: "John",
          },
        },
        token: "jwt-token",
      },
    };
    const mockHost = {
      switchToHttp: () => ({
        getResponse: () => mockResponse,
        getRequest: () => mockRequest,
      }),
    } as ArgumentsHost;

    const exception = new HttpException("Bad Request", HttpStatus.BAD_REQUEST);

    filter.catch(exception, mockHost);

    // Check that nested sensitive data is sanitized in logs
    expect(logger.warn).toHaveBeenCalledWith(
      expect.stringContaining('"password":"********"')
    );
    expect(logger.warn).toHaveBeenCalledWith(
      expect.stringContaining('"apiKey":"********"')
    );
    expect(logger.warn).toHaveBeenCalledWith(
      expect.stringContaining('"token":"********"')
    );
    expect(logger.warn).toHaveBeenCalledWith(
      expect.stringContaining('"name":"John"')
    );
  });

  it("should handle non-object body in sanitization", () => {
    const mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
    const mockRequest = {
      url: "/api/endpoint",
      method: "POST",
      body: "plain string body",
    };
    const mockHost = {
      switchToHttp: () => ({
        getResponse: () => mockResponse,
        getRequest: () => mockRequest,
      }),
    } as ArgumentsHost;

    const exception = new HttpException("Bad Request", HttpStatus.BAD_REQUEST);

    filter.catch(exception, mockHost);

    expect(logger.warn).toHaveBeenCalledWith(
      expect.stringContaining('"plain string body"')
    );
  });

  it("should handle null body", () => {
    const mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
    const mockRequest = {
      url: "/api/endpoint",
      method: "GET",
      body: null,
    };
    const mockHost = {
      switchToHttp: () => ({
        getResponse: () => mockResponse,
        getRequest: () => mockRequest,
      }),
    } as ArgumentsHost;

    const exception = new HttpException("Bad Request", HttpStatus.BAD_REQUEST);

    filter.catch(exception, mockHost);

    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining("null"));
  });

  it("should extract message from exception response object", () => {
    const mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
    const mockRequest = {
      url: "/api/endpoint",
      method: "POST",
      body: {},
    };
    const mockHost = {
      switchToHttp: () => ({
        getResponse: () => mockResponse,
        getRequest: () => mockRequest,
      }),
    } as ArgumentsHost;

    const exception = new HttpException(
      { message: "Custom validation message", errors: [{ field: "email", error: "invalid" }] },
      HttpStatus.BAD_REQUEST
    );

    filter.catch(exception, mockHost);

    expect(mockResponse.json).toHaveBeenCalledWith(
      expect.objectContaining({
        error: expect.objectContaining({
          message: "Custom validation message",
          // When errors is present, it gets extracted to details directly
          details: [{ field: "email", error: "invalid" }],
        }),
      })
    );
  });

  it("should use default message when response object has no message field", () => {
    const mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
    const mockRequest = {
      url: "/api/endpoint",
      method: "POST",
      body: {},
    };
    const mockHost = {
      switchToHttp: () => ({
        getResponse: () => mockResponse,
        getRequest: () => mockRequest,
      }),
    } as ArgumentsHost;

    const exception = new HttpException(
      { statusCode: 400 },
      HttpStatus.BAD_REQUEST
    );

    filter.catch(exception, mockHost);

    expect(mockResponse.json).toHaveBeenCalledWith(
      expect.objectContaining({
        error: expect.objectContaining({
          message: expect.any(String),
        }),
      })
    );
  });
});
