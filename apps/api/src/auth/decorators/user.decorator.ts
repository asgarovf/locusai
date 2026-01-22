import { AuthenticatedUser, getAuthUserId } from "@locusai/shared";
import { createParamDecorator, ExecutionContext } from "@nestjs/common";
import { AuthRequest } from "../interfaces/auth-request.interface";

/**
 * Custom decorator to extract the current authenticated user from the request.
 * The user can be either a JWT user or an API key user.
 *
 * Usage: @CurrentUser() user: AuthenticatedUser
 */
export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AuthenticatedUser => {
    const request = ctx.switchToHttp().getRequest<AuthRequest>();
    return request.user;
  }
);

/**
 * Custom decorator to extract the current user's ID for database operations.
 * Returns null for API key users (since they don't have a real user ID).
 *
 * Usage: @CurrentUserId() userId: string | null
 */
export const CurrentUserId = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): string | null => {
    const request = ctx.switchToHttp().getRequest<AuthRequest>();
    return getAuthUserId(request.user);
  }
);
