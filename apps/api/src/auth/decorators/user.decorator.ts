import { createParamDecorator, ExecutionContext } from "@nestjs/common";
import { AuthRequest } from "../interfaces/auth-request.interface";

/**
 * Custom decorator to extract the current user from the request.
 * Usage: @CurrentUser() user: User
 */
export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest<AuthRequest>();
    return request.user;
  }
);
