import { Injectable, ExecutionContext } from "@nestjs/common";
import { ThrottlerGuard, ThrottlerLimitDetail } from "@nestjs/throttler";
import {
  CUSTOM_THROTTLE_KEY,
  SKIP_CUSTOM_THROTTLE_KEY,
  CustomThrottleOptions,
  byIp,
} from "../decorators/custom-throttle.decorator";

/**
 * Custom Throttle Guard that extends NestJS ThrottlerGuard.
 *
 * This guard enhances the default throttler with:
 * - Per-route custom rate limits via @CustomThrottle decorator
 * - Custom key generation strategies (by IP, user ID, email, etc.)
 * - Skip functionality via @SkipCustomThrottle decorator
 *
 * If no @CustomThrottle decorator is present on a route, it falls back
 * to the global throttle configuration.
 */
@Injectable()
export class CustomThrottleGuard extends ThrottlerGuard {

  /**
   * Main entry point for the guard.
   * Checks for skip decorator and custom throttle options.
   */
  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Check if throttling should be skipped for this route
    const shouldSkip = this.reflector.getAllAndOverride<boolean>(
      SKIP_CUSTOM_THROTTLE_KEY,
      [context.getHandler(), context.getClass()]
    );

    if (shouldSkip) {
      return true;
    }

    return super.canActivate(context);
  }

  /**
   * Generate the tracker key for rate limiting.
   * Uses custom key generator if @CustomThrottle is present,
   * otherwise falls back to the default IP-based key.
   */
  protected async getTracker(req: Record<string, unknown>): Promise<string> {
    // Default implementation returns IP
    // This is called by the parent when no custom logic is applied
    const forwardedFor = (req.headers as Record<string, string>)?.[
      "x-forwarded-for"
    ];
    if (forwardedFor) {
      return forwardedFor.split(",")[0]?.trim() ?? "unknown";
    }

    const realIp = (req.headers as Record<string, string>)?.["x-real-ip"];
    if (realIp) {
      return realIp;
    }

    return (req.ip as string) ?? "unknown";
  }

  /**
   * Handle the throttle check for each configured throttler.
   * This is called for each throttler in the configuration.
   */
  protected async handleRequest(
    requestProps: {
      context: ExecutionContext;
      limit: number;
      ttl: number;
      throttler: ThrottlerLimitDetail;
      blockDuration: number;
      getTracker: (req: Record<string, unknown>) => Promise<string>;
      generateKey: (
        context: ExecutionContext,
        trackerString: string,
        throttlerName: string
      ) => string;
    }
  ): Promise<boolean> {
    const { context } = requestProps;

    // Get custom throttle options from decorator
    const customOptions = this.reflector.getAllAndOverride<
      CustomThrottleOptions | undefined
    >(CUSTOM_THROTTLE_KEY, [context.getHandler(), context.getClass()]);

    if (customOptions) {
      // Use custom options from decorator
      const { limit, ttl, keyGenerator } = customOptions;

      // Use custom key generator or default to IP
      const generator = keyGenerator ?? byIp();
      const trackerKey = generator(context);

      // Override the request props with custom values
      return super.handleRequest({
        ...requestProps,
        limit,
        ttl,
        getTracker: async () => trackerKey,
        generateKey: (_ctx, tracker, throttlerName) =>
          `${throttlerName}:${tracker}`,
      });
    }

    // No custom options, use default behavior
    return super.handleRequest(requestProps);
  }
}
