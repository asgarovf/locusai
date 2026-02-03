import { applyDecorators, UseGuards } from "@nestjs/common";
import { AdminGuard } from "../guards/admin.guard";

/**
 * Decorator that restricts access to system administrators only.
 * Combines the AdminGuard with the route handler.
 *
 * @example
 * ```typescript
 * @Get('admin/users')
 * @AdminOnly()
 * getUsers() {
 *   return this.usersService.findAll();
 * }
 * ```
 */
export const AdminOnly = () => applyDecorators(UseGuards(AdminGuard));
