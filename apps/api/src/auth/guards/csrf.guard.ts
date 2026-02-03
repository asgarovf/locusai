import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import type { Request, Response } from "express";
import { CsrfService } from "@/auth/csrf.service";
import {
  CSRF_SECRET_COOKIE,
  CSRF_TOKEN_COOKIE,
  CookieService,
} from "@/auth/cookie.service";
import { SKIP_CSRF_KEY } from "@/common/decorators/skip-csrf.decorator";
import { IS_PUBLIC_KEY } from "@/auth/decorators/public.decorator";

const CSRF_HEADER = "x-csrf-token";
const SAFE_METHODS = ["GET", "HEAD", "OPTIONS"];

@Injectable()
export class CsrfGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly csrfService: CsrfService,
    private readonly cookieService: CookieService
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const response = context.switchToHttp().getResponse<Response>();

    // Check if CSRF should be skipped for this route
    if (this.shouldSkipCsrf(context, request)) {
      return true;
    }

    const method = request.method.toUpperCase();

    // For safe methods (GET, HEAD, OPTIONS), set/refresh CSRF cookies
    if (SAFE_METHODS.includes(method)) {
      this.ensureCsrfCookies(request, response);
      return true;
    }

    // For unsafe methods (POST, PUT, DELETE, PATCH), validate CSRF token
    return this.validateCsrfToken(request);
  }

  private shouldSkipCsrf(context: ExecutionContext, request: Request): boolean {
    // Skip if route has @SkipCsrf() decorator
    const skipCsrf = this.reflector.getAllAndOverride<boolean>(SKIP_CSRF_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (skipCsrf) {
      return true;
    }

    // Skip if route is public (no auth required)
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) {
      return true;
    }

    // Skip CSRF for API key authenticated requests
    // API keys are machine-to-machine and don't need CSRF protection
    if (this.isApiKeyRequest(request)) {
      return true;
    }

    return false;
  }

  private isApiKeyRequest(request: Request): boolean {
    const headers = request.headers;

    // Check X-API-Key header
    if (headers["x-api-key"]) {
      return true;
    }

    // Check Authorization header for ApiKey or API key format
    const authHeader = headers.authorization;
    if (authHeader) {
      const parts = authHeader.split(" ");
      const scheme = parts[0]?.toLowerCase();
      const token = parts[1];

      // ApiKey scheme
      if (scheme === "apikey" && token) {
        return true;
      }

      // Bearer with API key format (lk_...)
      if (scheme === "bearer" && token?.startsWith("lk_")) {
        return true;
      }
    }

    return false;
  }

  private ensureCsrfCookies(request: Request, response: Response): void {
    const existingSecret = request.cookies?.[CSRF_SECRET_COOKIE];
    const existingToken = request.cookies?.[CSRF_TOKEN_COOKIE];

    // If both cookies exist and are valid, don't regenerate
    if (
      existingSecret &&
      existingToken &&
      this.csrfService.validateToken(existingToken, existingSecret)
    ) {
      return;
    }

    // Generate new CSRF credentials
    const secret = this.csrfService.generateSecret();
    const token = this.csrfService.generateToken(secret);

    this.cookieService.setCsrfCookies(response, token, secret);
  }

  private validateCsrfToken(request: Request): boolean {
    const tokenFromHeader = request.headers[CSRF_HEADER] as string | undefined;
    const secretFromCookie = request.cookies?.[CSRF_SECRET_COOKIE] as
      | string
      | undefined;

    if (!tokenFromHeader) {
      throw new ForbiddenException("CSRF token missing from request header");
    }

    if (!secretFromCookie) {
      throw new ForbiddenException("CSRF secret cookie missing");
    }

    const isValid = this.csrfService.validateToken(
      tokenFromHeader,
      secretFromCookie
    );

    if (!isValid) {
      throw new ForbiddenException("Invalid CSRF token");
    }

    return true;
  }
}
