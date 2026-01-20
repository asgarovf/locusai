/**
 * Authentication Service
 *
 * Handles user registration, login, and session management using Drizzle ORM.
 * Supports both password-based (legacy/local) and OTP-based (cloud) authentication.
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
import {
  apiKeys,
  memberships,
  organizations,
  users,
  workspaces,
} from "../db/schema.js";
import { ConflictError, UnauthorizedError } from "../lib/errors.js";
import type { EmailService } from "../services/email.service.js";
import type { OtpService } from "../services/otp.service.js";
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

export interface OnboardingData {
  name: string;
  companyName?: string;
  teamSize?: string;
  userRole?: string;
}

export class AuthService {
  private db: DrizzleDB;
  private config: AuthServiceConfig;
  private otpService?: OtpService;
  private emailService?: EmailService;

  constructor(
    db: DrizzleDB,
    config: AuthServiceConfig,
    otpService?: OtpService,
    emailService?: EmailService
  ) {
    this.db = db;
    this.config = config;
    this.otpService = otpService;
    this.emailService = emailService;
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
   * Authenticate a user and return a JWT token (password-based, for local mode)
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

    // Check if user has a password (OTP-only users won't have one)
    if (!user.passwordHash) {
      throw new UnauthorizedError(
        "This account uses email verification. Please use the 'Continue with Email' option."
      );
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

  // ============================================================================
  // OTP-Based Authentication (Cloud Mode)
  // ============================================================================

  /**
   * Initiate registration with email - sends OTP
   */
  async registerWithEmailOtp(email: string): Promise<{ success: boolean }> {
    if (!this.otpService || !this.emailService) {
      throw new Error("OTP and Email services required for OTP-based auth");
    }

    // Check if user already exists
    const [existing] = await this.db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, email));

    if (existing) {
      throw new ConflictError("User with this email already exists");
    }

    // Generate and send OTP
    const { code, expiresAt } = await this.otpService.generateOtp(email);
    await this.emailService.sendOtpEmail(email, {
      otp: code,
      expiryMinutes: Math.round((expiresAt.getTime() - Date.now()) / 1000 / 60),
    });

    return { success: true };
  }

  /**
   * Complete registration after OTP verification
   */
  async verifyOtpAndCreateUser(
    email: string,
    otp: string,
    onboardingData: OnboardingData
  ): Promise<{ user: SharedUser; token: string }> {
    if (!this.otpService || !this.emailService) {
      throw new Error("OTP and Email services required for OTP-based auth");
    }

    // Verify OTP
    const verification = await this.otpService.verifyOtp(email, otp);
    if (!verification.valid) {
      throw new UnauthorizedError(verification.message || "Invalid OTP");
    }

    // Check if user already exists (race condition check)
    const [existing] = await this.db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, email));

    if (existing) {
      throw new ConflictError("User with this email already exists");
    }

    const userId = generateUUID();
    const orgId = generateUUID();
    const workspaceId = generateUUID();
    const now = new Date();

    // Create organization
    const orgName =
      onboardingData.companyName || `${onboardingData.name}'s Workspace`;
    const orgSlug = orgName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");

    await this.db.insert(organizations).values({
      id: orgId,
      name: orgName,
      slug: orgSlug,
      avatarUrl: null,
      createdAt: now,
      updatedAt: now,
    });

    // Create default workspace
    await this.db.insert(workspaces).values({
      id: workspaceId,
      orgId,
      name: "Default Workspace",
      slug: "default",
      createdAt: now,
      updatedAt: now,
    });

    // Create user
    await this.db.insert(users).values({
      id: userId,
      email,
      name: onboardingData.name,
      role: "USER",
      passwordHash: null, // No password for OTP-based users
      companyName: onboardingData.companyName,
      teamSize: onboardingData.teamSize,
      userRole: onboardingData.userRole,
      onboardingCompleted: true,
      emailVerified: true,
      avatarUrl: null,
      createdAt: now,
      updatedAt: now,
    });

    // Add user as organization owner
    await this.db.insert(memberships).values({
      id: generateUUID(),
      userId,
      orgId,
      role: "OWNER",
      createdAt: now,
    });

    // Invalidate OTP
    await this.otpService.invalidateOtp(email);

    // Send welcome email
    await this.emailService.sendWelcomeEmail(email, {
      userName: onboardingData.name,
      organizationName: orgName,
      workspaceName: "Default Workspace",
    });

    // Generate JWT token
    const token = signJWT(
      {
        sub: userId,
        email,
        name: onboardingData.name,
        role: "USER",
      },
      this.config.jwtSecret,
      { expiresIn: this.config.tokenExpiresIn }
    );

    return {
      user: {
        id: userId,
        email,
        name: onboardingData.name,
        avatarUrl: null,
        role: "USER" as UserRole,
        createdAt: now.getTime(),
        updatedAt: now.getTime(),
      },
      token,
    };
  }

  /**
   * Login with email OTP (for returning users)
   */
  async loginWithEmailOtp(email: string): Promise<{ success: boolean }> {
    if (!this.otpService || !this.emailService) {
      throw new Error("OTP and Email services required for OTP-based auth");
    }

    // Check if user exists
    const [user] = await this.db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, email));

    if (!user) {
      throw new UnauthorizedError("No account found with this email");
    }

    // Generate and send OTP
    const { code, expiresAt } = await this.otpService.generateOtp(email);
    await this.emailService.sendOtpEmail(email, {
      otp: code,
      expiryMinutes: Math.round((expiresAt.getTime() - Date.now()) / 1000 / 60),
    });

    return { success: true };
  }

  /**
   * Verify login OTP and return token
   */
  async verifyLoginOtp(
    email: string,
    otp: string
  ): Promise<{ user: SharedUser; token: string }> {
    if (!this.otpService) {
      throw new Error("OTP service required for OTP-based auth");
    }

    // Verify OTP
    const verification = await this.otpService.verifyOtp(email, otp);
    if (!verification.valid) {
      throw new UnauthorizedError(verification.message || "Invalid OTP");
    }

    // Get user
    const [user] = await this.db
      .select()
      .from(users)
      .where(eq(users.email, email));

    if (!user) {
      throw new UnauthorizedError("User not found");
    }

    // Invalidate OTP
    await this.otpService.invalidateOtp(email);

    // Generate JWT token
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
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        avatarUrl: user.avatarUrl,
        role: user.role as UserRole,
        createdAt: user.createdAt.getTime(),
        updatedAt: user.updatedAt.getTime(),
      },
      token,
    };
  }

  /**
   * Resend OTP code
   */
  async resendOtp(email: string): Promise<{ success: boolean }> {
    if (!this.otpService || !this.emailService) {
      throw new Error("OTP and Email services required");
    }

    // Generate new OTP
    const { code, expiresAt } = await this.otpService.generateOtp(email);
    await this.emailService.sendOtpEmail(email, {
      otp: code,
      expiryMinutes: Math.round((expiresAt.getTime() - Date.now()) / 1000 / 60),
    });

    return { success: true };
  }
}
