import { SetMetadata } from "@nestjs/common";

export const SKIP_IP_BLOCK_KEY = "skipIpBlock";

/**
 * Decorator to skip IP block check for a specific route or controller.
 * Use for health check endpoints and other routes that should always be accessible.
 *
 * @example
 * ```typescript
 * @SkipIpBlock()
 * @Get('health')
 * healthCheck() {
 *   return { status: 'ok' };
 * }
 * ```
 */
export const SkipIpBlock = () => SetMetadata(SKIP_IP_BLOCK_KEY, true);
