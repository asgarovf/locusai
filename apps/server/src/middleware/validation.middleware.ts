/**
 * Validation Middleware
 *
 * Middleware for validating request body, query, and params using Zod schemas.
 */

import type { NextFunction, Request, Response } from "express";
import type { z } from "zod";
import { ValidationError } from "../lib/errors.js";

/**
 * Validate request body against a Zod schema.
 * Note: To get full type safety in your handler, use the following pattern:
 * asyncHandler(async (req: Request<any, any, RegisterRequest>, res) => { ... })
 */
export function validateBody<T extends z.ZodTypeAny>(schema: T) {
  return (req: Request, _res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.body);

    if (!result.success) {
      const fieldErrors: Record<string, string[]> = {};

      for (const issue of result.error.issues) {
        const path = issue.path.join(".") || "_root";
        if (!fieldErrors[path]) {
          fieldErrors[path] = [];
        }
        fieldErrors[path].push(issue.message);
      }

      throw new ValidationError("Validation failed", fieldErrors);
    }

    // Replace body with parsed/transformed data
    req.body = result.data;
    next();
  };
}

/**
 * Validate query parameters against a Zod schema.
 */
export function validateQuery<T extends z.ZodTypeAny>(schema: T) {
  return (req: Request, _res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.query);

    if (!result.success) {
      const fieldErrors: Record<string, string[]> = {};

      for (const issue of result.error.issues) {
        const path = issue.path.join(".") || "_root";
        if (!fieldErrors[path]) {
          fieldErrors[path] = [];
        }
        fieldErrors[path].push(issue.message);
      }

      throw new ValidationError("Query validation failed", fieldErrors);
    }

    req.query = result.data;
    next();
  };
}

/**
 * Validate route parameters against a Zod schema.
 */
export function validateParams<T extends z.ZodTypeAny>(schema: T) {
  return (req: Request, _res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.params);

    if (!result.success) {
      const fieldErrors: Record<string, string[]> = {};

      for (const issue of result.error.issues) {
        const path = issue.path.join(".") || "_root";
        if (!fieldErrors[path]) {
          fieldErrors[path] = [];
        }
        fieldErrors[path].push(issue.message);
      }

      throw new ValidationError("Parameter validation failed", fieldErrors);
    }

    req.params = result.data;
    next();
  };
}
