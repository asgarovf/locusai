import crypto from "node:crypto";
import { Injectable, NestMiddleware } from "@nestjs/common";
import { NextFunction, Request, Response } from "express";

const UUID_V4_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

declare global {
  // biome-ignore lint/style/noNamespace: Express augmentation requires namespace
  namespace Express {
    interface Request {
      requestId: string;
    }
  }
}

function resolveRequestId(req: Request): string {
  const clientId = req.headers["x-request-id"];
  return typeof clientId === "string" && UUID_V4_REGEX.test(clientId)
    ? clientId
    : crypto.randomUUID();
}

@Injectable()
export class RequestIdMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    const requestId = resolveRequestId(req);
    req.requestId = requestId;
    res.setHeader("X-Request-ID", requestId);
    next();
  }
}

export function requestIdMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const requestId = resolveRequestId(req);
  req.requestId = requestId;
  res.setHeader("X-Request-ID", requestId);
  next();
}
