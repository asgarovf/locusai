import { Injectable, NestMiddleware } from "@nestjs/common";
import type { NextFunction, Request, Response } from "express";
import sanitizeHtml from "sanitize-html";

/**
 * Configuration for sanitize-html that strips all HTML tags
 * and removes script tags completely to prevent XSS attacks.
 */
const SANITIZE_CONFIG: sanitizeHtml.IOptions = {
  allowedTags: [],
  allowedAttributes: {},
  disallowedTagsMode: "discard",
};

/**
 * Middleware to sanitize string inputs and prevent XSS attacks.
 * - Strips all HTML tags from string inputs
 * - Completely removes script tags
 * - Works recursively for nested objects and arrays
 */
@Injectable()
export class SanitizeMiddleware implements NestMiddleware {
  use(req: Request, _res: Response, next: NextFunction): void {
    if (req.body) {
      req.body = this.sanitizeObject(req.body);
    }

    if (req.query) {
      req.query = this.sanitizeObject(req.query) as typeof req.query;
    }

    if (req.params) {
      req.params = this.sanitizeObject(req.params) as typeof req.params;
    }

    next();
  }

  /**
   * Recursively sanitizes an object, array, or primitive value.
   * - Strings are sanitized using sanitize-html
   * - Arrays are processed element by element
   * - Objects are processed property by property
   * - Other types (numbers, booleans, null, undefined) are returned as-is
   */
  private sanitizeObject<T>(obj: T): T {
    if (obj === null || obj === undefined) {
      return obj;
    }

    if (typeof obj === "string") {
      return this.sanitizeValue(obj) as T;
    }

    if (Array.isArray(obj)) {
      return obj.map((item) => this.sanitizeObject(item)) as T;
    }

    if (typeof obj === "object") {
      const sanitized: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(obj)) {
        sanitized[key] = this.sanitizeObject(value);
      }
      return sanitized as T;
    }

    return obj;
  }

  /**
   * Sanitizes a single string value by stripping all HTML tags.
   */
  private sanitizeValue(value: string): string {
    return sanitizeHtml(value, SANITIZE_CONFIG);
  }
}
