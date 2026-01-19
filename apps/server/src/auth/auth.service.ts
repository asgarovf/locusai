/**
 * Authentication Service
 *
 * Handles user registration, login, and session management using Drizzle ORM.
 */

import type {
  APIKeyCreateResponse,
  LoginRequest,
  LoginResponse,
  RegisterRequest,
  User as SharedUser,
  UserRole,
} from "@locusai/shared";
import { eq } from "drizzle-orm";
import type { DrizzleDB } from "../db/drizzle.js";
import { apiKeys, users } from "../db/schema.js";
import { ConflictError, UnauthorizedError } from "../lib/errors.js";
import { signJWT } from "./jwt.js";
import {
  generateAPIKey,
  generateUUID,
  hashAPIKey,
  hashPassword,
  verifyPassword,
} from "./password.js";

export interface AuthServiceConfig {
  jwtSecret: string;
  tokenExpiresIn?: number; // seconds
}

export class AuthService {
  private db: DrizzleDB;
  private config: AuthServiceConfig;

  constructor(db: DrizzleDB, config: AuthServiceConfig) {
    this.db = db;
    this.config = config;
  }

  /**
   * Register a new user
   */
  async register(data: RegisterRequest): Promise<SharedUser> {
    const { email, password, name } = data;

    // Check if user already exists
    const [existing] = await this.db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, email));

    if (existing) {
      throw new ConflictError("User with this email already exists");
    }

    const id = generateUUID();
    const passwordHash = await hashPassword(password);
    const now = new Date();

    await this.db.insert(users).values({
      id,
      email,
      name,
      role: "USER",
      passwordHash,
      createdAt: now,
      updatedAt: now,
    });

    return {
      id,
      email,
      name,
      avatarUrl: null,
      role: "USER" as UserRole,
      createdAt: now.getTime(),
      updatedAt: now.getTime(),
    };
  }

  /**
   * Authenticate a user and return a JWT token
   */
  async login(data: LoginRequest): Promise<LoginResponse> {
    const { email, password } = data;

    const [user] = await this.db
      .select()
      .from(users)
      .where(eq(users.email, email));

    if (!user) {
      throw new UnauthorizedError("Invalid email or password");
    }

    const isValid = await verifyPassword(password, user.passwordHash);

    if (!isValid) {
      throw new UnauthorizedError("Invalid email or password");
    }

    const token = signJWT(
      {
        sub: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
      this.config.jwtSecret,
      { expiresIn: this.config.tokenExpiresIn }
    );

    return {
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
    };
  }

  /**
   * Get user by ID
   */
  async getUserById(id: string): Promise<SharedUser | null> {
    const [user] = await this.db.select().from(users).where(eq(users.id, id));

    if (!user) return null;

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      avatarUrl: user.avatarUrl,
      role: user.role as UserRole,
      createdAt: user.createdAt.getTime(),
      updatedAt: user.updatedAt.getTime(),
    };
  }

  /**
   * Create an API key for a project
   */
  async createAPIKey(
    userId: string,
    projectId: string,
    name: string
  ): Promise<APIKeyCreateResponse> {
    const id = generateUUID();
    const { key, prefix } = generateAPIKey();
    const keyHash = await hashAPIKey(key);
    const now = new Date();

    await this.db.insert(apiKeys).values({
      id,
      userId,
      projectId,
      name,
      keyPrefix: prefix,
      keyHash,
      createdAt: now,
    });

    return {
      id,
      name,
      keyPrefix: prefix,
      key, // Only returned at creation time
      createdAt: now.getTime(),
    };
  }

  /**
   * Validate an API key and return its associated data
   */
  async validateAPIKey(
    key: string
  ): Promise<{ userId: string; projectId: string; keyId: string } | null> {
    const keyHash = await hashAPIKey(key);

    const [apiKey] = await this.db
      .select()
      .from(apiKeys)
      .where(eq(apiKeys.keyHash, keyHash));

    if (!apiKey) return null;

    // Check expiration
    if (apiKey.expiresAt && apiKey.expiresAt.getTime() < Date.now()) {
      return null;
    }

    // Update last used timestamp
    await this.db
      .update(apiKeys)
      .set({ lastUsedAt: new Date() })
      .where(eq(apiKeys.id, apiKey.id));

    return {
      userId: apiKey.userId,
      projectId: apiKey.projectId,
      keyId: apiKey.id,
    };
  }

  /**
   * List API keys for a user (without the actual key values)
   */
  async listAPIKeys(userId: string): Promise<
    Array<{
      id: string;
      name: string;
      keyPrefix: string;
      projectId: string;
      lastUsedAt: number | null;
      createdAt: number;
    }>
  > {
    const keys = await this.db
      .select()
      .from(apiKeys)
      .where(eq(apiKeys.userId, userId));

    // biome-ignore lint/suspicious/noExplicitAny: DB mapping
    return keys.map((k: any) => ({
      id: k.id,
      name: k.name,
      keyPrefix: k.keyPrefix,
      projectId: k.projectId,
      lastUsedAt: k.lastUsedAt?.getTime() ?? null,
      createdAt: k.createdAt.getTime(),
    }));
  }

  /**
   * Revoke an API key
   */
  async revokeAPIKey(_userId: string, keyId: string): Promise<boolean> {
    const result = await this.db
      .delete(apiKeys)
      .where(eq(apiKeys.id, keyId))
      .returning({ id: apiKeys.id });

    return result.length > 0;
  }
}
