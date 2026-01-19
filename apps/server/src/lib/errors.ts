/**
 * Application Errors
 *
 * Custom error classes for consistent error handling across the application.
 * These errors are caught by the global error handler and returned as JSON.
 */

/**
 * Base application error
 */
export class AppError extends Error {
  constructor(
    public readonly statusCode: number,
    public readonly code: string,
    message: string,
    public readonly details?: Record<string, unknown>
  ) {
    super(message);
    this.name = "AppError";
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * 400 - Bad Request
 */
export class BadRequestError extends AppError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(400, "BAD_REQUEST", message, details);
    this.name = "BadRequestError";
  }
}

/**
 * 401 - Unauthorized
 */
export class UnauthorizedError extends AppError {
  constructor(message = "Authentication required") {
    super(401, "UNAUTHORIZED", message);
    this.name = "UnauthorizedError";
  }
}

/**
 * 403 - Forbidden
 */
export class ForbiddenError extends AppError {
  constructor(message = "Access denied") {
    super(403, "FORBIDDEN", message);
    this.name = "ForbiddenError";
  }
}

/**
 * 404 - Not Found
 */
export class NotFoundError extends AppError {
  constructor(resource = "Resource") {
    super(404, "NOT_FOUND", `${resource} not found`);
    this.name = "NotFoundError";
  }
}

/**
 * 409 - Conflict
 */
export class ConflictError extends AppError {
  constructor(message: string) {
    super(409, "CONFLICT", message);
    this.name = "ConflictError";
  }
}

/**
 * 422 - Validation Error
 */
export class ValidationError extends AppError {
  constructor(
    message: string,
    public readonly fieldErrors: Record<string, string[]>
  ) {
    super(422, "VALIDATION_ERROR", message, { fieldErrors });
    this.name = "ValidationError";
  }
}

/**
 * 500 - Internal Server Error
 */
export class InternalError extends AppError {
  constructor(message = "Internal server error") {
    super(500, "INTERNAL_ERROR", message);
    this.name = "InternalError";
  }
}
