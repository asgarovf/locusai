import { AuthenticatedUser, isJwtUser, UserRole } from "@locusai/shared";
import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from "@nestjs/common";

/**
 * Guard that restricts access to system administrators only.
 * Only users with UserRole.ADMIN can pass this guard.
 * API key users are not allowed since they don't have a user role.
 */
@Injectable()
export class AdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user as AuthenticatedUser | undefined;

    if (!user) {
      throw new ForbiddenException("Authentication required");
    }

    // Only JWT users can be admins
    if (!isJwtUser(user)) {
      throw new ForbiddenException("Admin access required");
    }

    if (user.role !== UserRole.ADMIN) {
      throw new ForbiddenException("Admin access required");
    }

    return true;
  }
}
