import { SecurityAuditEventType } from "@locusai/shared";
import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { AuthGuard } from "@nestjs/passport";
import { Request } from "express";
import { SecurityAuditService } from "@/common/services/security-audit.service";
import { AuthService } from "../auth.service";
import { IS_PUBLIC_KEY } from "../decorators/public.decorator";

/**
 * Combined Auth Guard - Accepts either JWT or API Key
 *
 * This guard tries JWT authentication first. If JWT fails (invalid or missing),
 * it falls back to API key authentication. This allows both:
 * - Web dashboard users (JWT) -> sets JwtAuthUser on request.user
 * - CLI/Agent users (API Key) -> sets ApiKeyAuthUser on request.user
 */
@Injectable()
export class JwtOrApiKeyGuard extends AuthGuard("jwt") implements CanActivate {
  constructor(
    private reflector: Reflector,
    private authService: AuthService,
    private securityAuditService: SecurityAuditService
  ) {
    super();
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Check if route is public
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest<Request>();

    // First, try JWT authentication
    try {
      const jwtResult = await super.canActivate(context);
      if (jwtResult) {
        // JWT strategy already sets properly typed JwtAuthUser
        return true;
      }
    } catch {
      // JWT failed, try API key
    }

    // Fall back to API key authentication
    const apiKey = this.extractApiKey(request);

    if (!apiKey) {
      await this.securityAuditService.log({
        eventType: SecurityAuditEventType.AUTH_FAILURE,
        ip: request.ip,
        userAgent: request.headers["user-agent"],
        requestId: request.requestId,
        metadata: {
          reason: "No valid JWT or API key provided",
          url: request.url,
          method: request.method,
        },
      });
      throw new UnauthorizedException(
        "Authentication required (JWT or API key)"
      );
    }

    try {
      const apiKeyUser = await this.authService.validateApiKey(apiKey);
      request.user = apiKeyUser;
      return true;
    } catch {
      await this.securityAuditService.log({
        eventType: SecurityAuditEventType.AUTH_FAILURE,
        ip: request.ip,
        userAgent: request.headers["user-agent"],
        requestId: request.requestId,
        metadata: {
          reason: "Invalid API key",
          url: request.url,
          method: request.method,
        },
      });
      throw new UnauthorizedException(
        "Authentication required (JWT or API key)"
      );
    }
  }

  private extractApiKey(request: Request): string | undefined {
    const headers = request.headers;
    if (!headers) return undefined;

    // Check X-API-Key header first (explicit API key)
    const apiKeyHeader = headers["x-api-key"];
    if (apiKeyHeader) {
      return apiKeyHeader as string;
    }

    // Check Authorization header for "ApiKey <key>" format
    const authHeader = headers.authorization;
    if (authHeader) {
      const parts = authHeader.split(" ");
      if (parts[0]?.toLowerCase() === "apikey" && parts[1]) {
        return parts[1];
      }
      // Check if it looks like an API key (lk_...) in Bearer format
      if (parts[0]?.toLowerCase() === "bearer" && parts[1]?.startsWith("lk_")) {
        return parts[1];
      }
    }

    return undefined;
  }
}
