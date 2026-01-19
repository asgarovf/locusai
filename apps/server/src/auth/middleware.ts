/**
 * Authentication Middleware for Express
 *
 * Provides middleware for JWT and API key authentication.
 */

import type { AuthContext } from "@locusai/shared";
import type { NextFunction, Request, Response } from "express";
import { ForbiddenError, UnauthorizedError } from "../lib/errors.js";
import { asyncHandler } from "../middleware/error.handler.js";
import type { AuthService } from "./auth.service.js";
import { verifyJWT } from "./jwt.js";

// Extend Express Request type using module augmentation
declare module "express-serve-static-core" {
  interface Request {
    auth?: AuthContext;
  }
}

export interface AuthMiddlewareConfig {
  jwtSecret: string;
  authService: AuthService;
}

/**
 * Local development mode authentication bypass
 * Sets a default auth context for local development without requiring actual credentials
 */
export function localAuth() {
  return (_req: Request, _res: Response, next: NextFunction) => {
    _req.auth = {
      userId: "local-dev",
      email: "dev@localhost",
      name: "Local Developer",
      role: "ADMIN",
      authType: "local",
    };
    next();
  };
}

/**
 * Extract Bearer token from Authorization header
 */
function extractBearerToken(header: string | undefined): string | null {
  if (!header) return null;
  const parts = header.split(" ");
  if (parts.length !== 2 || parts[0] !== "Bearer") return null;
  return parts[1];
}

/**
 * Extract API key from X-API-Key header or Authorization header
 */
function extractAPIKey(req: Request): string | null {
  // Check X-API-Key header first
  const apiKeyHeader = req.headers["x-api-key"] as string | undefined;
  if (apiKeyHeader) return apiKeyHeader;

  // Check Authorization header for API key format
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith("Bearer lk_")) {
    return authHeader.substring(7); // Remove "Bearer "
  }

  return null;
}

/**
 * JWT authentication middleware
 * Requires a valid JWT token in the Authorization header
 */
export function jwtAuth(config: AuthMiddlewareConfig) {
  return (req: Request, _res: Response, next: NextFunction) => {
    const authHeader = req.headers.authorization;
    const token = extractBearerToken(authHeader);

    if (!token) {
      throw new UnauthorizedError("Authorization header required");
    }

    // Check if it's an API key
    if (token.startsWith("lk_")) {
      throw new UnauthorizedError(
        "Use API key authentication for this endpoint"
      );
    }

    const result = verifyJWT(token, config.jwtSecret);

    if (!result.valid || !result.payload) {
      throw new UnauthorizedError(result.error || "Invalid token");
    }

    req.auth = {
      userId: result.payload.sub,
      email: result.payload.email,
      name: result.payload.name,
      role: result.payload.role,
      orgId: result.payload.orgId,
      authType: "jwt",
    };

    next();
  };
}

/**
 * API key authentication middleware
 * Requires a valid API key in X-API-Key header or Authorization header
 */
export function apiKeyAuth(config: AuthMiddlewareConfig) {
  return asyncHandler(
    async (req: Request, _res: Response, next: NextFunction) => {
      const apiKey = extractAPIKey(req);

      if (!apiKey) {
        throw new UnauthorizedError("API key required");
      }

      if (!apiKey.startsWith("lk_")) {
        throw new UnauthorizedError("Invalid API key format");
      }

      const keyData = await config.authService.validateAPIKey(apiKey);

      if (!keyData) {
        throw new UnauthorizedError("Invalid or expired API key");
      }

      // Get user info
      const user = await config.authService.getUserById(keyData.userId);

      if (!user) {
        throw new UnauthorizedError("User not found");
      }

      req.auth = {
        userId: keyData.userId,
        email: user.email,
        name: user.name,
        role: user.role,
        projectId: keyData.projectId,
        authType: "api_key",
      };

      next();
    }
  );
}

/**
 * Flexible authentication middleware
 * Accepts either JWT token or API key
 */
export function flexAuth(config: AuthMiddlewareConfig) {
  return asyncHandler(
    async (req: Request, _res: Response, next: NextFunction) => {
      const authHeader = req.headers.authorization;
      const apiKeyHeader = req.headers["x-api-key"] as string | undefined;

      // Try API key first (from dedicated header)
      if (apiKeyHeader) {
        const keyData = await config.authService.validateAPIKey(apiKeyHeader);

        if (keyData) {
          const user = await config.authService.getUserById(keyData.userId);

          if (user) {
            req.auth = {
              userId: keyData.userId,
              email: user.email,
              name: user.name,
              role: user.role,
              projectId: keyData.projectId,
              authType: "api_key",
            };
            return next();
          }
        }

        throw new UnauthorizedError("Invalid API key");
      }

      // Try Bearer token
      const token = extractBearerToken(authHeader);

      if (!token) {
        throw new UnauthorizedError("Authentication required");
      }

      // Check if it's an API key in Bearer format
      if (token.startsWith("lk_")) {
        const keyData = await config.authService.validateAPIKey(token);

        if (keyData) {
          const user = await config.authService.getUserById(keyData.userId);

          if (user) {
            req.auth = {
              userId: keyData.userId,
              email: user.email,
              name: user.name,
              role: user.role,
              projectId: keyData.projectId,
              authType: "api_key",
            };
            return next();
          }
        }

        throw new UnauthorizedError("Invalid API key");
      }

      // It's a JWT
      const result = verifyJWT(token, config.jwtSecret);

      if (!result.valid || !result.payload) {
        throw new UnauthorizedError(result.error || "Invalid token");
      }

      req.auth = {
        userId: result.payload.sub,
        email: result.payload.email,
        name: result.payload.name,
        role: result.payload.role,
        orgId: result.payload.orgId,
        authType: "jwt",
      };

      next();
    }
  );
}

/**
 * Optional authentication middleware
 * Sets auth context if valid credentials are provided, but doesn't require them
 */
export function optionalAuth(config: AuthMiddlewareConfig) {
  return asyncHandler(
    async (req: Request, _res: Response, next: NextFunction) => {
      const authHeader = req.headers.authorization;
      const apiKeyHeader = req.headers["x-api-key"] as string | undefined;

      // Try API key first
      if (apiKeyHeader?.startsWith("lk_")) {
        const keyData = await config.authService.validateAPIKey(apiKeyHeader);

        if (keyData) {
          const user = await config.authService.getUserById(keyData.userId);

          if (user) {
            req.auth = {
              userId: keyData.userId,
              email: user.email,
              name: user.name,
              role: user.role,
              projectId: keyData.projectId,
              authType: "api_key",
            };
          }
        }

        return next();
      }

      // Try Bearer token
      const token = extractBearerToken(authHeader);

      if (token && !token.startsWith("lk_")) {
        const result = verifyJWT(token, config.jwtSecret);

        if (result.valid && result.payload) {
          req.auth = {
            userId: result.payload.sub,
            email: result.payload.email,
            name: result.payload.name,
            role: result.payload.role,
            orgId: result.payload.orgId,
            authType: "jwt",
          };
        }
      }

      next();
    }
  );
}

/**
 * Require specific project access
 * Must be used after apiKeyAuth or flexAuth
 */
export function requireProject(projectId: string) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.auth) {
      throw new UnauthorizedError("Authentication required");
    }

    if (req.auth.authType === "api_key" && req.auth.projectId !== projectId) {
      throw new ForbiddenError("Access denied to this project");
    }

    next();
  };
}

/**
 * Require admin role (system-wide)
 */
export function requireAdmin() {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.auth) {
      throw new UnauthorizedError("Authentication required");
    }

    if (req.auth.role !== "ADMIN") {
      throw new ForbiddenError("Admin access required");
    }

    next();
  };
}

/**
 * Require specific organization role
 */
export function requireOrgRole(orgIdParam: string, roles: string[]) {
  return asyncHandler(
    async (req: Request, _res: Response, next: NextFunction) => {
      if (!req.auth) {
        throw new UnauthorizedError("Authentication required");
      }

      const orgId = req.params[orgIdParam];
      if (!orgId) {
        throw new ForbiddenError("Organization context missing");
      }

      // System ADMIN bypasses org checks
      if (req.auth.role === "ADMIN") {
        return next();
      }

      // In a real app, you'd want to cache this in the JWT or session
      // For now, we'll query the service (config.authService would need to be accessible)
      // Actually, we can reuse the auth middleware config if we wrap it differently
      // or just assume the orgId is available in req.auth if we updated the login/verify flow

      // For simplicity, let's assume we have an orgService or similar.
      // However, this middleware file doesn't have access to the service instance directly
      // without being constructed.

      // Let's keep it simple: if req.auth.orgId matches and role is in roles.
      if (req.auth.orgId === orgId && roles.includes(req.auth.role)) {
        return next();
      }

      throw new ForbiddenError("Insufficient organization permissions");
    }
  );
}
