import { getAuthUserId, AuthenticatedUser } from "@locusai/shared";
import { ExecutionContext, SetMetadata } from "@nestjs/common";
import { Request } from "express";

export const CUSTOM_THROTTLE_KEY = "custom_throttle";
export const SKIP_CUSTOM_THROTTLE_KEY = "skip_custom_throttle";

interface RequestWithUser extends Request {
  user?: AuthenticatedUser;
}

/**
 * Function type for generating custom throttle keys.
 * Receives the execution context and returns a unique string key for rate limiting.
 */
export type KeyGeneratorFunction = (context: ExecutionContext) => string;

/**
 * Options for the CustomThrottle decorator.
 */
export interface CustomThrottleOptions {
  /** Maximum number of requests allowed within the TTL window */
  limit: number;
  /** Time-to-live in milliseconds for the rate limit window */
  ttl: number;
  /** Optional custom key generator function. Defaults to IP-based limiting. */
  keyGenerator?: KeyGeneratorFunction;
}

/**
 * Extract client IP address from request, handling proxies.
 */
function getClientIp(request: Request): string {
  const forwardedFor = request.headers["x-forwarded-for"];
  if (forwardedFor) {
    const firstIp = Array.isArray(forwardedFor)
      ? forwardedFor[0]
      : forwardedFor.split(",")[0];
    return firstIp?.trim() ?? "unknown";
  }

  const realIp = request.headers["x-real-ip"];
  if (realIp) {
    return Array.isArray(realIp) ? realIp[0] ?? "unknown" : realIp;
  }

  return request.ip ?? "unknown";
}

/**
 * Pre-built key generator: Rate limit by IP address.
 * This is the default behavior if no keyGenerator is specified.
 *
 * @example
 * ```typescript
 * @CustomThrottle({ limit: 10, ttl: 60000, keyGenerator: byIp() })
 * @Post('login')
 * login() { ... }
 * ```
 */
export function byIp(): KeyGeneratorFunction {
  return (context: ExecutionContext): string => {
    const request = context.switchToHttp().getRequest<Request>();
    return `ip:${getClientIp(request)}`;
  };
}

/**
 * Pre-built key generator: Rate limit by authenticated user ID.
 * Falls back to IP if user is not authenticated.
 *
 * @example
 * ```typescript
 * @CustomThrottle({ limit: 100, ttl: 60000, keyGenerator: byUserId() })
 * @Post('create')
 * create() { ... }
 * ```
 */
export function byUserId(): KeyGeneratorFunction {
  return (context: ExecutionContext): string => {
    const request = context.switchToHttp().getRequest<RequestWithUser>();
    if (request.user) {
      const userId = getAuthUserId(request.user);
      return `user:${userId}`;
    }
    return `ip:${getClientIp(request)}`;
  };
}

/**
 * Pre-built key generator: Rate limit by email from request body or query.
 * Useful for login/signup/password-reset endpoints.
 *
 * @param path - Dot-notation path to the email field (e.g., 'body.email', 'query.email')
 *
 * @example
 * ```typescript
 * @CustomThrottle({ limit: 5, ttl: 300000, keyGenerator: byEmail('body.email') })
 * @Post('login')
 * login(@Body() dto: LoginDto) { ... }
 * ```
 */
export function byEmail(path: string = "body.email"): KeyGeneratorFunction {
  return (context: ExecutionContext): string => {
    const request = context.switchToHttp().getRequest<Request>();
    const parts = path.split(".");
    let value: unknown = request;

    for (const part of parts) {
      if (value && typeof value === "object" && part in value) {
        value = (value as Record<string, unknown>)[part];
      } else {
        value = undefined;
        break;
      }
    }

    if (typeof value === "string" && value) {
      return `email:${value.toLowerCase()}`;
    }

    // Fall back to IP if email not found
    return `ip:${getClientIp(request)}`;
  };
}

/**
 * Pre-built key generator: Composite rate limit by user ID AND IP.
 * Provides stricter rate limiting by tracking both dimensions.
 *
 * @example
 * ```typescript
 * @CustomThrottle({ limit: 50, ttl: 60000, keyGenerator: byUserIdAndIp() })
 * @Post('sensitive-action')
 * sensitiveAction() { ... }
 * ```
 */
export function byUserIdAndIp(): KeyGeneratorFunction {
  return (context: ExecutionContext): string => {
    const request = context.switchToHttp().getRequest<RequestWithUser>();
    const ip = getClientIp(request);

    if (request.user) {
      const userId = getAuthUserId(request.user);
      return `user:${userId}:ip:${ip}`;
    }

    return `ip:${ip}`;
  };
}

/**
 * Pre-built key generator: Rate limit by a custom request field.
 * Allows rate limiting by any field in the request (params, query, body, headers).
 *
 * @param path - Dot-notation path to the field (e.g., 'params.workspaceId', 'headers.x-tenant-id')
 * @param prefix - Optional prefix for the key (defaults to 'custom')
 *
 * @example
 * ```typescript
 * @CustomThrottle({ limit: 100, ttl: 60000, keyGenerator: byField('params.workspaceId', 'workspace') })
 * @Get(':workspaceId/tasks')
 * getTasks() { ... }
 * ```
 */
export function byField(
  path: string,
  prefix: string = "custom"
): KeyGeneratorFunction {
  return (context: ExecutionContext): string => {
    const request = context.switchToHttp().getRequest<Request>();
    const parts = path.split(".");
    let value: unknown = request;

    for (const part of parts) {
      if (value && typeof value === "object" && part in value) {
        value = (value as Record<string, unknown>)[part];
      } else {
        value = undefined;
        break;
      }
    }

    if (value !== undefined && value !== null) {
      return `${prefix}:${String(value)}`;
    }

    // Fall back to IP if field not found
    return `ip:${getClientIp(request)}`;
  };
}

/**
 * Decorator to apply custom rate limiting to a route handler or controller.
 * When applied, the CustomThrottleGuard will use the specified limit, TTL,
 * and key generator instead of the global throttle settings.
 *
 * @param options - Custom throttle configuration
 *
 * @example
 * ```typescript
 * // Rate limit login attempts by email: 5 attempts per 5 minutes
 * @Post('login')
 * @CustomThrottle({ limit: 5, ttl: 300000, keyGenerator: byEmail() })
 * login(@Body() dto: LoginDto) {
 *   return this.authService.login(dto);
 * }
 *
 * // Rate limit API calls by user: 100 requests per minute
 * @Get('data')
 * @CustomThrottle({ limit: 100, ttl: 60000, keyGenerator: byUserId() })
 * getData() {
 *   return this.dataService.getData();
 * }
 *
 * // Custom key generator
 * @Post('action')
 * @CustomThrottle({
 *   limit: 10,
 *   ttl: 60000,
 *   keyGenerator: (ctx) => {
 *     const req = ctx.switchToHttp().getRequest();
 *     return `custom:${req.body.tenantId}:${req.user?.id}`;
 *   }
 * })
 * performAction() { ... }
 * ```
 */
export const CustomThrottle = (options: CustomThrottleOptions) =>
  SetMetadata<string, CustomThrottleOptions>(CUSTOM_THROTTLE_KEY, options);

/**
 * Decorator to skip custom throttling on a specific route.
 * Useful when you want to exclude certain endpoints from rate limiting.
 *
 * @example
 * ```typescript
 * @Get('health')
 * @SkipCustomThrottle()
 * healthCheck() {
 *   return { status: 'ok' };
 * }
 * ```
 */
export const SkipCustomThrottle = () =>
  SetMetadata(SKIP_CUSTOM_THROTTLE_KEY, true);
