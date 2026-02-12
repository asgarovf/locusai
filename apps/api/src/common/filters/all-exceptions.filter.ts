import { $FixMe, ApiResponse } from "@locusai/shared";
import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from "@nestjs/common";
import { Request, Response } from "express";
import { AppLogger } from "../logger";

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  constructor(private readonly logger: AppLogger) {}

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const exceptionResponse =
      exception instanceof HttpException ? exception.getResponse() : null;

    const message =
      exception instanceof HttpException
        ? exception.message
        : "Internal server error";

    const apiResponse: ApiResponse = {
      success: false,
      error: {
        code: this.getErrorCode(status),
        message:
          typeof exceptionResponse === "object" && exceptionResponse !== null
            ? (exceptionResponse as $FixMe).message || message
            : message,
        details:
          typeof exceptionResponse === "object" && exceptionResponse !== null
            ? (exceptionResponse as $FixMe).errors || exceptionResponse
            : undefined,
      },
      meta: {
        timestamp: new Date().toISOString(),
        path: request.url,
        requestId: request.requestId,
      },
    };

    const sanitizedBody = this.sanitizeBody(request.body);

    if (status >= 500) {
      this.logger.error(
        `${request.method} ${request.url} ${status} - ${message} - ${JSON.stringify(sanitizedBody)}`,
        exception instanceof Error ? exception.stack : undefined,
        "Exceptions"
      );
    } else {
      this.logger.warn(
        `[Exceptions] ${request.method} ${request.url} ${status} - ${message} - ${JSON.stringify(sanitizedBody)}`
      );
    }

    response.status(status).json(apiResponse);
  }

  private sanitizeBody(body: $FixMe): $FixMe {
    if (!body || typeof body !== "object") return body;

    const sensitiveKeys = ["otp", "password", "token", "apiKey", "key"];
    const sanitized = { ...body };

    for (const key of Object.keys(sanitized)) {
      if (sensitiveKeys.some((sk) => key.toLowerCase().includes(sk))) {
        sanitized[key] = "********";
      } else if (typeof sanitized[key] === "object") {
        sanitized[key] = this.sanitizeBody(sanitized[key]);
      }
    }

    return sanitized;
  }

  private getErrorCode(status: number): string {
    switch (status) {
      case HttpStatus.BAD_REQUEST:
        return "BAD_REQUEST";
      case HttpStatus.UNAUTHORIZED:
        return "UNAUTHORIZED";
      case HttpStatus.FORBIDDEN:
        return "FORBIDDEN";
      case HttpStatus.NOT_FOUND:
        return "NOT_FOUND";
      case HttpStatus.CONFLICT:
        return "CONFLICT";
      case HttpStatus.UNPROCESSABLE_ENTITY:
        return "VALIDATION_ERROR";
      default:
        return "INTERNAL_SERVER_ERROR";
    }
  }
}
