import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { Request } from "express";
import { Observable } from "rxjs";
import { SKIP_SANITIZE_KEY } from "../decorators";

function stripHtmlTags(value: string): string {
  return value.replace(/<[^>]*>/g, "");
}

function sanitize(value: unknown): unknown {
  if (typeof value === "string") {
    return stripHtmlTags(value);
  }

  if (Array.isArray(value)) {
    return value.map(sanitize);
  }

  if (value !== null && typeof value === "object") {
    const result: Record<string, unknown> = {};
    for (const key of Object.keys(value)) {
      result[key] = sanitize((value as Record<string, unknown>)[key]);
    }
    return result;
  }

  return value;
}

@Injectable()
export class SanitizeInterceptor implements NestInterceptor {
  constructor(private readonly reflector: Reflector) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const skipSanitize = this.reflector.getAllAndOverride<boolean>(
      SKIP_SANITIZE_KEY,
      [context.getHandler(), context.getClass()]
    );

    if (skipSanitize) {
      return next.handle();
    }

    const request = context.switchToHttp().getRequest<Request>();

    if (request.body && typeof request.body === "object") {
      request.body = sanitize(request.body);
    }

    return next.handle();
  }
}
