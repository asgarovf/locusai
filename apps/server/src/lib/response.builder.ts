/**
 * Response Builder
 *
 * Unified response builder for consistent API responses.
 */

import type { Response } from "express";
import type { PaginationMeta } from "../schemas/common.schemas.js";

export class ResponseBuilder {
  /**
   * Send a successful response
   */
  static success<T>(res: Response, data: T, statusCode = 200): void {
    res.status(statusCode).json({
      success: true,
      ...data,
    });
  }

  /**
   * Send a paginated response
   */
  static paginated<T>(
    res: Response,
    data: T[],
    pagination: PaginationMeta,
    statusCode = 200
  ): void {
    res.status(statusCode).json({
      success: true,
      data,
      pagination,
    });
  }

  /**
   * Send a simple message response
   */
  static message(res: Response, message: string, statusCode = 200): void {
    res.status(statusCode).json({
      success: true,
      message,
    });
  }
}
