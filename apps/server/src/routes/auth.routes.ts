/**
 * Authentication Routes
 */

import { Router } from "express";
import type { AuthController } from "../controllers/auth.controller.js";
import {
  type AuthMiddlewareConfig,
  jwtAuth,
  validateBody,
} from "../middleware/index.js";
import {
  CreateAPIKeyRequestSchema,
  LoginRequestSchema,
  RegisterRequestSchema,
} from "../schemas/index.js";

export interface AuthRoutesConfig {
  controller: AuthController;
  authMiddlewareConfig: AuthMiddlewareConfig;
}

export function createAuthRouter(config: AuthRoutesConfig) {
  const router = Router();
  const { controller, authMiddlewareConfig } = config;

  router.post(
    "/register",
    validateBody(RegisterRequestSchema),
    controller.register
  );
  router.post("/login", validateBody(LoginRequestSchema), controller.login);
  router.get("/me", jwtAuth(authMiddlewareConfig), controller.me);

  // API Keys
  router.post(
    "/api-keys",
    jwtAuth(authMiddlewareConfig),
    validateBody(CreateAPIKeyRequestSchema),
    controller.createAPIKey
  );
  router.get(
    "/api-keys",
    jwtAuth(authMiddlewareConfig),
    controller.listAPIKeys
  );
  router.delete(
    "/api-keys/:id",
    jwtAuth(authMiddlewareConfig),
    controller.revokeAPIKey
  );

  return router;
}
