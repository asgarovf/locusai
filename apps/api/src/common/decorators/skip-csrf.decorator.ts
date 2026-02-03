import { SetMetadata } from "@nestjs/common";

export const SKIP_CSRF_KEY = "skipCsrf";

/**
 * Decorator to skip CSRF validation for a specific route or controller.
 * Use sparingly - only for routes that have alternative authentication
 * mechanisms (e.g., API key authentication, webhooks with signatures).
 *
 * @example
 * ```typescript
 * @SkipCsrf()
 * @Post('webhook')
 * handleWebhook(@Body() payload: WebhookPayload) {
 *   // CSRF validation skipped
 * }
 * ```
 */
export const SkipCsrf = () => SetMetadata(SKIP_CSRF_KEY, true);
