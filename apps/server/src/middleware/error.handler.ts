/**
 * Global Error Handler Middleware
 *
 * Catches all errors thrown in route handlers and returns a consistent JSON response.
 */

import type { NextFunction, Request, Response } from "express";
import { ZodError } from "zod";
import { AppError } from "../lib/errors.js";

/**
 * Standard error response structure
 */
export interface ErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
}

/**
 * Global error handler middleware
 * Must be registered AFTER all routes
 */
export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  // Log error in development
  if (process.env.NODE_ENV !== "production") {
    console.error("[Error]", err);
  }

  // Handle Zod validation errors
  if (err instanceof ZodError) {
    const fieldErrors: Record<string, string[]> = {};

    for (const issue of err.issues) {
      const path = issue.path.join(".");
      if (!fieldErrors[path]) {
        fieldErrors[path] = [];
      }
      fieldErrors[path].push(issue.message);
    }

    const response: ErrorResponse = {
      success: false,
      error: {
        code: "VALIDATION_ERROR",
        message: "Validation failed",
        details: { fieldErrors },
      },
    };

    res.status(422).json(response);
    return;
  }

  // Handle custom AppError
  if (err instanceof AppError) {
    const response: ErrorResponse = {
      success: false,
      error: {
        code: err.code,
        message: err.message,
        details: err.details,
      },
    };

    res.status(err.statusCode).json(response);
    return;
  }

  // Handle unknown errors
  const response: ErrorResponse = {
    success: false,
    error: {
      code: "INTERNAL_ERROR",
      message:
        process.env.NODE_ENV === "production"
          ? "Internal server error"
          : err.message,
    },
  };

  res.status(500).json(response);
}

/**
 * Async handler wrapper
 * Catches async errors and passes them to the error handler
 */
export function asyncHandler<T>(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<T>
) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}
