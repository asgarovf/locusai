import * as crypto from "node:crypto";
import {
  ApiKeyAuthUser,
  CompleteRegistration,
  LoginResponse,
  MembershipRole,
  UserRole,
} from "@locusai/shared";
import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { InjectRepository } from "@nestjs/typeorm";
import { DataSource, LessThan, Repository } from "typeorm";
import { EmailService } from "@/common/services/email.service";
import { TypedConfigService } from "@/config/config.service";
import { ApiKey } from "@/entities/api-key.entity";
import { Membership } from "@/entities/membership.entity";
import { Organization } from "@/entities/organization.entity";
import { RefreshToken } from "@/entities/refresh-token.entity";
import { User } from "@/entities/user.entity";
import { Workspace } from "@/entities/workspace.entity";
import { UsersService } from "@/users/users.service";
import { GoogleUser } from "./interfaces/google-user.interface";
import { OtpService } from "./otp.service";

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

export interface RefreshTokenMetadata {
  userAgent?: string;
  ipAddress?: string;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly otpService: OtpService,
    private readonly emailService: EmailService,
    private readonly dataSource: DataSource,
    private readonly configService: TypedConfigService,

    @InjectRepository(ApiKey)
    private readonly apiKeyRepository: Repository<ApiKey>,

    @InjectRepository(RefreshToken)
    private readonly refreshTokenRepository: Repository<RefreshToken>
  ) {}

  async validateApiKey(apiKey: string): Promise<ApiKeyAuthUser> {
    const hash = crypto.createHash("sha256").update(apiKey).digest("hex");

    const keyRecord = await this.apiKeyRepository.findOne({
      where: { keyHash: hash, active: true },
      relations: ["organization"],
    });

    if (!keyRecord) {
      throw new UnauthorizedException("Invalid API key");
    }

    // Update last used time (throttle to once per minute to save DB writes)
    const oneMinuteAgo = new Date(Date.now() - 60 * 1000);
    if (!keyRecord.lastUsedAt || keyRecord.lastUsedAt < oneMinuteAgo) {
      keyRecord.lastUsedAt = new Date();
      await this.apiKeyRepository.save(keyRecord);
    }

    return {
      authType: "api_key",
      apiKeyId: keyRecord.id,
      apiKeyName: keyRecord.name,
      orgId: keyRecord.organizationId || undefined,
      workspaceId: keyRecord.workspaceId || undefined,
    };
  }

  async login(
    user: User,
    context?: { workspaceId?: string; orgId?: string }
  ): Promise<LoginResponse> {
    const payload = {
      email: user.email,
      sub: user.id,
      name: user.name,
      role: user.role,
    };

    let { workspaceId, orgId } = context || {};

    if (!workspaceId) {
      // Fetch user's workspaces to get the current workspace ID and org ID
      const workspaces = await this.dataSource.query(
        `SELECT w.id, w.org_id as "orgId" FROM workspaces w
         INNER JOIN memberships m ON w.org_id = m.org_id
         WHERE m.user_id = $1
         ORDER BY w.created_at ASC
         LIMIT 1`,
        [user.id]
      );

      workspaceId = workspaces[0]?.id ?? undefined;
      orgId = workspaces[0]?.orgId ?? undefined;
    }

    return {
      token: this.jwtService.sign(payload),
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        avatarUrl: user.avatarUrl,
        onboardingCompleted: user.onboardingCompleted,
        emailVerified: user.emailVerified,
        companyName: user.companyName ?? undefined,
        teamSize: user.teamSize ?? undefined,
        userRole: user.userRole ?? undefined,
        workspaceId,
        orgId,
        createdAt: user.createdAt.getTime(),
        updatedAt: user.updatedAt.getTime(),
      },
    };
  }

  // ============================================================================
  // OTP-Based Authentication (Cloud Mode)
  // ============================================================================

  async requestLoginOtp(email: string): Promise<{ success: boolean }> {
    const user = await this.usersService.findByEmail(email);
    if (!user) {
      throw new UnauthorizedException("User not found. Please register first.");
    }

    const { code, expiresAt } = await this.otpService.generateOtp(email);
    const expiryMinutes = Math.round(
      (expiresAt.getTime() - Date.now()) / 1000 / 60
    );

    await this.emailService.sendOtpEmail(email, {
      otp: code,
      expiryMinutes,
    });

    return { success: true };
  }

  async requestRegisterOtp(email: string): Promise<{ success: boolean }> {
    const existing = await this.usersService.findByEmail(email);
    if (existing) {
      throw new ConflictException("User with this email already exists");
    }

    const { code, expiresAt } = await this.otpService.generateOtp(email);
    const expiryMinutes = Math.round(
      (expiresAt.getTime() - Date.now()) / 1000 / 60
    );

    await this.emailService.sendOtpEmail(email, {
      otp: code,
      expiryMinutes,
    });

    return { success: true };
  }

  async verifyOtpAndLogin(email: string, code: string): Promise<LoginResponse> {
    const verification = await this.otpService.verifyOtp(email, code);
    if (!verification.valid) {
      throw new UnauthorizedException(verification.message);
    }

    const user = await this.usersService.findByEmail(email);
    if (!user) {
      throw new UnauthorizedException("User not found. Please register first.");
    }

    await this.otpService.invalidateOtp(email);
    return this.login(user);
  }

  async completeRegistration(
    data: CompleteRegistration
  ): Promise<LoginResponse> {
    const verification = await this.otpService.verifyOtp(data.email, data.otp);
    if (!verification.valid) {
      throw new UnauthorizedException(verification.message);
    }

    const existing = await this.usersService.findByEmail(data.email);
    if (existing) {
      throw new ConflictException("User with this email already exists");
    }

    return await this.dataSource.transaction(async (manager) => {
      const orgName = data.companyName || `${data.name}'s Organization`;

      const org = manager.create(Organization, {
        name: orgName,
      });
      await manager.save(org);

      const workspaceName = data.workspaceName || "General";

      const workspace = manager.create(Workspace, {
        orgId: org.id,
        name: workspaceName,
      });
      await manager.save(workspace);

      const user = manager.create(User, {
        email: data.email,
        name: data.name,
        role: UserRole.USER,
        companyName: data.companyName,
        teamSize: data.teamSize,
        userRole: data.userRole,
        onboardingCompleted: true,
        emailVerified: true,
      });
      await manager.save(user);

      const membership = manager.create(Membership, {
        userId: user.id,
        orgId: org.id,
        role: MembershipRole.OWNER,
      });
      await manager.save(membership);

      await this.otpService.invalidateOtp(data.email);

      await this.emailService.sendWelcomeEmail(data.email, {
        userName: data.name,
        organizationName: orgName,
        workspaceName: workspaceName,
      });

      return this.login(user, {
        workspaceId: workspace.id,
        orgId: org.id,
      });
    });
  }

  async loginWithGoogle(googleUser: GoogleUser): Promise<LoginResponse> {
    const user = await this.processGoogleUser(googleUser);
    return this.login(user);
  }

  /**
   * Process a Google OAuth user - find existing user or create a new one.
   * This method is separated from loginWithGoogle to support the one-time code flow.
   */
  async processGoogleUser(googleUser: GoogleUser): Promise<User> {
    let user = await this.usersService.findByEmail(googleUser.email);

    if (!user) {
      // Create new user for first-time Google login
      user = await this.dataSource.transaction(async (manager) => {
        const name = `${googleUser.firstName} ${googleUser.lastName}`.trim();
        const orgName = `${name}'s Organization`;

        const org = manager.create(Organization, {
          name: orgName,
        });
        await manager.save(org);

        const workspace = manager.create(Workspace, {
          orgId: org.id,
          name: "General",
        });
        await manager.save(workspace);

        const newUser = manager.create(User, {
          email: googleUser.email,
          name: name,
          avatarUrl: googleUser.picture,
          role: UserRole.USER,
          onboardingCompleted: false, // Redirect to onboarding on frontend
          emailVerified: true, // Google verifies email
        });
        await manager.save(newUser);

        const membership = manager.create(Membership, {
          userId: newUser.id,
          orgId: org.id,
          role: MembershipRole.OWNER,
        });
        await manager.save(membership);

        return newUser;
      });
    }

    return user;
  }

  async getUserWorkspaces(userId: string): Promise<Array<{ id: string }>> {
    return this.dataSource.query(
      `SELECT w.id FROM workspaces w
       INNER JOIN memberships m ON w.org_id = m.org_id
       WHERE m.user_id = $1
       ORDER BY w.created_at ASC`,
      [userId]
    );
  }

  async getWorkspaceOrgId(
    workspaceId: string
  ): Promise<{ orgId: string } | null> {
    const result = await this.dataSource.query(
      `SELECT org_id as "orgId" FROM workspaces WHERE id = $1`,
      [workspaceId]
    );
    return result[0] || null;
  }

  async getUserById(userId: string): Promise<User | null> {
    return this.usersService.findById(userId);
  }

  // ============================================================================
  // Refresh Token Management (Cookie-based Auth)
  // ============================================================================

  /**
   * Generate a cryptographically secure refresh token
   */
  private generateRefreshTokenValue(): string {
    return crypto.randomBytes(64).toString("base64url");
  }

  /**
   * Hash a refresh token for secure storage
   */
  private hashRefreshToken(token: string): string {
    return crypto.createHash("sha256").update(token).digest("hex");
  }

  /**
   * Create a new access token (short-lived JWT)
   */
  createAccessToken(user: User): string {
    const expiresInMinutes = this.configService.get(
      "ACCESS_TOKEN_EXPIRES_IN_MINUTES"
    );
    const payload = {
      email: user.email,
      sub: user.id,
      name: user.name,
      role: user.role,
    };
    return this.jwtService.sign(payload, { expiresIn: `${expiresInMinutes}m` });
  }

  /**
   * Create and store a new refresh token
   */
  async createRefreshToken(
    user: User,
    metadata?: RefreshTokenMetadata
  ): Promise<string> {
    const tokenValue = this.generateRefreshTokenValue();
    const tokenHash = this.hashRefreshToken(tokenValue);
    const expiresInDays = this.configService.get("REFRESH_TOKEN_EXPIRES_IN_DAYS");
    const expiresAt = new Date(
      Date.now() + expiresInDays * 24 * 60 * 60 * 1000
    );

    const refreshToken = this.refreshTokenRepository.create({
      tokenHash,
      userId: user.id,
      expiresAt,
      userAgent: metadata?.userAgent || null,
      ipAddress: metadata?.ipAddress || null,
    });

    await this.refreshTokenRepository.save(refreshToken);
    return tokenValue;
  }

  /**
   * Create both access and refresh tokens for a user
   */
  async createTokenPair(
    user: User,
    metadata?: RefreshTokenMetadata
  ): Promise<TokenPair> {
    const accessToken = this.createAccessToken(user);
    const refreshToken = await this.createRefreshToken(user, metadata);
    return { accessToken, refreshToken };
  }

  /**
   * Validate and refresh tokens using a refresh token
   * Implements token rotation for security
   */
  async refreshTokens(
    refreshTokenValue: string,
    metadata?: RefreshTokenMetadata
  ): Promise<TokenPair> {
    const tokenHash = this.hashRefreshToken(refreshTokenValue);

    const storedToken = await this.refreshTokenRepository.findOne({
      where: { tokenHash },
      relations: ["user"],
    });

    if (!storedToken) {
      throw new UnauthorizedException("Invalid refresh token");
    }

    if (storedToken.revoked) {
      // Potential token reuse detected - revoke all tokens for this user
      await this.revokeAllUserRefreshTokens(storedToken.userId);
      throw new UnauthorizedException(
        "Refresh token has been revoked. Please log in again."
      );
    }

    if (storedToken.expiresAt < new Date()) {
      throw new UnauthorizedException("Refresh token has expired");
    }

    // Revoke the current token (rotation)
    storedToken.revoked = true;
    storedToken.revokedAt = new Date();
    await this.refreshTokenRepository.save(storedToken);

    // Create new token pair
    return this.createTokenPair(storedToken.user, metadata);
  }

  /**
   * Revoke a specific refresh token (e.g., on logout)
   */
  async revokeRefreshToken(refreshTokenValue: string): Promise<void> {
    const tokenHash = this.hashRefreshToken(refreshTokenValue);
    await this.refreshTokenRepository.update(
      { tokenHash },
      { revoked: true, revokedAt: new Date() }
    );
  }

  /**
   * Revoke all refresh tokens for a user (e.g., on password change)
   */
  async revokeAllUserRefreshTokens(userId: string): Promise<void> {
    await this.refreshTokenRepository.update(
      { userId, revoked: false },
      { revoked: true, revokedAt: new Date() }
    );
  }

  /**
   * Clean up expired refresh tokens (call periodically via cron)
   */
  async cleanupExpiredRefreshTokens(): Promise<number> {
    const result = await this.refreshTokenRepository.delete({
      expiresAt: LessThan(new Date()),
    });
    return result.affected || 0;
  }
}
