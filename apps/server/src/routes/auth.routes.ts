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
  CompleteRegistrationSchema,
  CreateAPIKeyRequestSchema,
  LoginRequestSchema,
  RegisterRequestSchema,
  RegisterWithOtpSchema,
  ResendOtpSchema,
  VerifyOtpSchema,
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

  // OTP-Based Authentication
  router.post(
    "/register-otp",
    validateBody(RegisterWithOtpSchema),
    controller.registerWithOtp
  );
  router.post(
    "/complete-registration",
    validateBody(CompleteRegistrationSchema),
    controller.completeRegistration
  );
  router.post(
    "/login-otp",
    validateBody(RegisterWithOtpSchema),
    controller.loginWithOtp
  );
  router.post(
    "/verify-login",
    validateBody(VerifyOtpSchema),
    controller.verifyLoginOtp
  );
  router.post(
    "/resend-otp",
    validateBody(ResendOtpSchema),
    controller.resendOtp
  );

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
