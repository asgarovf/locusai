import {
  AuthenticatedUser,
  CompleteRegistration,
  CompleteRegistrationSchema,
  isJwtUser,
  LoginResponse,
  OtpRequest,
  OtpRequestSchema,
  VerifyOtp,
  VerifyOtpSchema,
} from "@locusai/shared";
import {
  Body,
  Controller,
  Delete,
  Get,
  Post,
  Req,
  Res,
  UnauthorizedException,
  UseGuards,
  UsePipes,
} from "@nestjs/common";
import { Request, Response } from "express";
import { ZodValidationPipe } from "@/common/pipes";
import { TypedConfigService } from "@/config/config.service";
import { AuthService, RequestContext } from "./auth.service";
import { CurrentUser, Public } from "./decorators";
import { GoogleAuthGuard } from "./guards";
import { GoogleUser } from "./interfaces/google-user.interface";

@Controller("auth")
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly configService: TypedConfigService
  ) {}

  private extractRequestContext(req: Request): RequestContext {
    return {
      ip: req.ip,
      userAgent: req.headers["user-agent"],
      requestId: req.requestId,
    };
  }

  @Get("me")
  async getProfile(@CurrentUser() authUser: AuthenticatedUser) {
    // This endpoint only works for JWT-authenticated users
    if (!isJwtUser(authUser)) {
      throw new UnauthorizedException(
        "This endpoint requires user authentication, not API key"
      );
    }

    // Fetch full user from database
    const user = await this.authService.getUserById(authUser.id);
    if (!user) {
      throw new UnauthorizedException("User not found");
    }

    // Fetch user's first workspace and organization ID
    const workspaces = await this.authService.getUserWorkspaces(user.id);
    const workspaceId = workspaces[0]?.id ?? undefined;

    // Get the org ID from the first workspace
    let orgId: string | undefined;
    if (workspaceId) {
      const workspace = await this.authService.getWorkspaceOrgId(workspaceId);
      orgId = workspace?.orgId;
    }

    return {
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
    };
  }

  @Get("api-key")
  async getApiKeyInfo(@CurrentUser() authUser: AuthenticatedUser) {
    // This endpoint only works for API Key authenticated users
    if (isJwtUser(authUser)) {
      throw new UnauthorizedException(
        "This endpoint requires API Key authentication"
      );
    }

    return {
      authType: "api_key",
      workspaceId: authUser.workspaceId,
      orgId: authUser.orgId,
      apiKeyName: authUser.apiKeyName,
    };
  }

  @Delete("account")
  async deleteAccount(@CurrentUser() authUser: AuthenticatedUser) {
    if (!isJwtUser(authUser)) {
      throw new UnauthorizedException(
        "This endpoint requires user authentication, not API key"
      );
    }

    await this.authService.deleteAccount(authUser.id);
    return { success: true };
  }

  // ============================================================================
  // OTP-Based Authentication (Cloud Mode)
  // ============================================================================

  @Public()
  @UsePipes(new ZodValidationPipe(OtpRequestSchema))
  @Post("register-otp")
  async registerOtp(@Req() req: Request, @Body() data: OtpRequest) {
    return this.authService.requestRegisterOtp(
      data.email,
      this.extractRequestContext(req)
    );
  }

  @Public()
  @UsePipes(new ZodValidationPipe(OtpRequestSchema))
  @Post("login-otp")
  async loginOtp(@Req() req: Request, @Body() data: OtpRequest) {
    return this.authService.requestLoginOtp(
      data.email,
      this.extractRequestContext(req)
    );
  }

  @Public()
  @UsePipes(new ZodValidationPipe(VerifyOtpSchema))
  @Post("verify-login")
  async verifyLogin(
    @Req() req: Request,
    @Body() data: VerifyOtp
  ): Promise<LoginResponse> {
    return this.authService.verifyOtpAndLogin(
      data.email,
      data.otp,
      this.extractRequestContext(req)
    );
  }

  @Public()
  @UsePipes(new ZodValidationPipe(CompleteRegistrationSchema))
  @Post("complete-registration")
  async completeRegistration(
    @Req() req: Request,
    @Body() data: CompleteRegistration
  ): Promise<LoginResponse> {
    return this.authService.completeRegistration(
      data,
      this.extractRequestContext(req)
    );
  }

  // ============================================================================
  // Google OAuth
  // ============================================================================

  @Public()
  @Get("google")
  @UseGuards(GoogleAuthGuard)
  async googleAuth() {
    // This method is just a placeholder for the Google OAuth redirect
    // Passport will handle the redirect
  }

  @Public()
  @Get("google/callback")
  @UseGuards(GoogleAuthGuard)
  async googleAuthRedirect(
    @Req() req: Request & { user: GoogleUser },
    @Res() res: Response
  ) {
    const { token } = await this.authService.loginWithGoogle(
      req.user,
      this.extractRequestContext(req)
    );
    const frontendUrl = this.configService.get("FRONTEND_URL");
    return res.redirect(`${frontendUrl}/callback?token=${token}`);
  }
}
