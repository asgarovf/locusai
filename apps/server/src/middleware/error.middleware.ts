import type { NextFunction, Request, Response } from "express";
import { ServiceError } from "../services/task.service.js";

export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
) {
  console.error("Server Error:", err);

  const statusCode = err instanceof ServiceError ? err.statusCode : 500;
  const message = err.message || "Internal Server Error";

  res.status(statusCode).json({
    error: {
      message,
      stack: process.env.NODE_ENV === "development" ? err.stack : undefined,
    },
  });
}
