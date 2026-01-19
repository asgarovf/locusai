/**
 * Auth Controller
 */

import type { Response } from "express";
import type { AuthService } from "../auth/auth.service.js";
import { NotFoundError, UnauthorizedError } from "../lib/errors.js";
import { ResponseBuilder } from "../lib/index.js";
import { asyncHandler } from "../middleware/index.js";
import {
  type CreateAPIKeyRequest,
  type LoginRequest,
  type RegisterRequest,
} from "../schemas/index.js";
import type { TypedRequest } from "../types/index.js";

export class AuthController {
  constructor(private authService: AuthService) {}

  /**
   * Register a new user
   */
  register = asyncHandler(
    async (req: TypedRequest<RegisterRequest>, res: Response) => {
      const { email, password, name } = req.body;
      const user = await this.authService.register({ email, password, name });

      ResponseBuilder.success(
        res,
        {
          user: {
            id: user.id,
            email: user.email,
            name: user.name,
          },
        },
        201
      );
    }
  );

  /**
   * Login and get token
   */
  login = asyncHandler(
    async (req: TypedRequest<LoginRequest>, res: Response) => {
      const { email, password } = req.body;
      const result = await this.authService.login({ email, password });

      ResponseBuilder.success(res, {
        token: result.token,
        user: result.user,
      });
    }
  );

  /**
   * Get current user info
   */
  me = asyncHandler(async (req: TypedRequest, res: Response) => {
    if (!req.auth) {
      throw new UnauthorizedError();
    }
    const { userId } = req.auth;
    const user = await this.authService.getUserById(userId);

    if (!user) {
      throw new NotFoundError("User");
    }

    ResponseBuilder.success(res, {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      avatarUrl: user.avatarUrl ?? null,
    });
  });

  /**
   * Create an API key
   */
  createAPIKey = asyncHandler(
    async (req: TypedRequest<CreateAPIKeyRequest>, res: Response) => {
      if (!req.auth) {
        throw new UnauthorizedError();
      }
      const { userId } = req.auth;
      const { projectId, name } = req.body;

      const apiKey = await this.authService.createAPIKey(
        userId,
        projectId,
        name
      );

      ResponseBuilder.success(
        res,
        {
          apiKey: {
            id: apiKey.id,
            name: apiKey.name,
            keyPrefix: apiKey.keyPrefix,
            key: apiKey.key,
            createdAt: apiKey.createdAt,
          },
          warning: "Save this API key now. You won't be able to see it again!",
        },
        201
      );
    }
  );

  /**
   * List API keys
   */
  listAPIKeys = asyncHandler(async (req: TypedRequest, res: Response) => {
    if (!req.auth) {
      throw new UnauthorizedError();
    }
    const { userId } = req.auth;
    const keys = await this.authService.listAPIKeys(userId);

    ResponseBuilder.success(res, {
      apiKeys: keys.map((k) => ({
        id: k.id,
        name: k.name,
        keyPrefix: k.keyPrefix,
        projectId: k.projectId,
        lastUsedAt: k.lastUsedAt,
        createdAt: k.createdAt,
      })),
    });
  });

  /**
   * Revoke an API key
   */
  revokeAPIKey = asyncHandler(async (req: TypedRequest, res: Response) => {
    if (!req.auth) {
      throw new UnauthorizedError();
    }
    const { userId } = req.auth;
    const keyId = req.params.id as string;

    const revoked = await this.authService.revokeAPIKey(userId, keyId);

    if (!revoked) {
      throw new NotFoundError("API key");
    }

    ResponseBuilder.message(res, "API key revoked");
  });
}
