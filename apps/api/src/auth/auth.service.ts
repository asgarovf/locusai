import {
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
import { DataSource } from "typeorm";
import { EmailService } from "@/common/services/email.service";
import { Membership, Organization, User, Workspace } from "@/entities";
import { UsersService } from "@/users/users.service";
import { OtpService } from "./otp.service";

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly otpService: OtpService,
    private readonly emailService: EmailService,
    private readonly dataSource: DataSource
  ) {}

  async login(user: User): Promise<LoginResponse> {
    const payload = {
      email: user.email,
      sub: user.id,
      name: user.name,
      role: user.role,
    };

    // Fetch user's workspaces to get the current workspace ID and org ID
    const workspaces = await this.dataSource.query(
      `SELECT w.id, w.org_id as "orgId" FROM workspaces w
       INNER JOIN memberships m ON w.org_id = m.org_id
       WHERE m.user_id = $1
       ORDER BY w.created_at ASC
       LIMIT 1`,
      [user.id]
    );

    const workspaceId = workspaces[0]?.id ?? undefined;
    const orgId = workspaces[0]?.orgId ?? undefined;

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
      const orgSlug =
        orgName
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-|-$/g, "") +
        "-" +
        Math.random().toString(36).substring(2, 10);

      const org = manager.create(Organization, {
        name: orgName,
        slug: orgSlug,
      });
      await manager.save(org);

      const workspaceName = data.workspaceName || "General";
      const workspaceSlug =
        workspaceName
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-|-$/g, "") +
        "-" +
        Math.random().toString(36).substring(2, 10);

      const workspace = manager.create(Workspace, {
        orgId: org.id,
        name: workspaceName,
        slug: workspaceSlug,
      });
      await manager.save(workspace);

      const user = manager.create(User, {
        email: data.email,
        name: data.name,
        role: UserRole.USER,
        passwordHash: "OTP-AUTH-USER",
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

      return this.login(user);
    });
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
}
