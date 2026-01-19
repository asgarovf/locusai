/**
 * Middleware Module
 *
 * Exports all middleware functions.
 */

export {
  type AuthMiddlewareConfig,
  apiKeyAuth,
  flexAuth,
  jwtAuth,
  localAuth,
  optionalAuth,
  requireAdmin,
  requireOrgRole,
  requireProject,
} from "../auth/middleware.js";
export {
  asyncHandler,
  type ErrorResponse,
  errorHandler,
} from "./error.handler.js";
export {
  validateBody,
  validateParams,
  validateQuery,
} from "./validation.middleware.js";
