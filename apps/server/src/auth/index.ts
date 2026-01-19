/**
 * Authentication Module
 *
 * Exports all auth-related utilities, services, and middleware.
 */

export { AuthService, type AuthServiceConfig } from "./auth.service.js";
export * from "./jwt.js";
export {
  type AuthMiddlewareConfig,
  apiKeyAuth,
  flexAuth,
  jwtAuth,
  localAuth,
  optionalAuth,
  requireAdmin,
  requireProject,
} from "./middleware.js";
export * from "./password.js";
