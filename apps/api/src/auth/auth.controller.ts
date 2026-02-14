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
import {
  ApiBearerAuth,
  ApiBody,
  ApiOkResponse,
  ApiOperation,
  ApiResponse,
  ApiSecurity,
  ApiTags,
  ApiUnauthorizedResponse,
} from "@nestjs/swagger";
import { Throttle } from "@nestjs/throttler";
import { Request, Response } from "express";
import { ZodValidationPipe } from "@/common/pipes";
import {
  AuthApiKeyInfoDto,
  AuthUserDto,
  CompleteRegistrationRequestDto,
  LoginResponseDto,
  OtpRequestDto,
  SuccessResponseDto,
  VerifyOtpRequestDto,
} from "@/common/swagger/public-api.dto";
import { TypedConfigService } from "@/config/config.service";
import { AuthService } from "./auth.service";
import { GOOGLE_THROTTLE_TTL, THROTTLE_TTL } from "./constants";
import { CurrentUser, Public } from "./decorators";
import { extractIp, GoogleAuthGuard } from "./guards";
import { GoogleUser } from "./interfaces/google-user.interface";
import { IpReputationService } from "./services";

@ApiTags("Auth")
@Controller("auth")
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly configService: TypedConfigService,
    private readonly ipReputationService: IpReputationService
  ) {}

  @ApiOperation({ summary: "Get the authenticated user's profile" })
  @ApiBearerAuth("bearer")
  @ApiOkResponse({
    description: "Authenticated user profile",
    type: AuthUserDto,
  })
  @ApiUnauthorizedResponse({ description: "JWT authentication is required" })
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

  @ApiOperation({ summary: "Get API key authentication context" })
  @ApiSecurity("apiKey")
  @ApiOkResponse({
    description: "Current API key context information",
    type: AuthApiKeyInfoDto,
  })
  @ApiUnauthorizedResponse({
    description: "API key authentication is required",
  })
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

  @ApiOperation({ summary: "Delete the current authenticated account" })
  @ApiBearerAuth("bearer")
  @ApiOkResponse({
    description: "Account deleted",
    type: SuccessResponseDto,
  })
  @ApiUnauthorizedResponse({ description: "JWT authentication is required" })
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
  @Throttle({ default: { limit: 5, ttl: THROTTLE_TTL } })
  @UsePipes(new ZodValidationPipe(OtpRequestSchema))
  @ApiOperation({ summary: "Request OTP for a new account registration" })
  @ApiBody({ type: OtpRequestDto })
  @ApiOkResponse({
    description: "OTP request accepted",
    type: SuccessResponseDto,
  })
  @Post("register-otp")
  async registerOtp(@Body() data: OtpRequest) {
    return this.authService.requestRegisterOtp(data.email);
  }

  @Public()
  @Throttle({ default: { limit: 5, ttl: THROTTLE_TTL } })
  @UsePipes(new ZodValidationPipe(OtpRequestSchema))
  @ApiOperation({ summary: "Request OTP to log in to an existing account" })
  @ApiBody({ type: OtpRequestDto })
  @ApiOkResponse({
    description: "OTP request accepted",
    type: SuccessResponseDto,
  })
  @Post("login-otp")
  async loginOtp(@Req() req: Request, @Body() data: OtpRequest) {
    const ip = extractIp(req);
    this.ipReputationService.assertNotBlocked(ip);
    return this.authService.requestLoginOtp(data.email);
  }

  @Public()
  @Throttle({ default: { limit: 10, ttl: THROTTLE_TTL } })
  @UsePipes(new ZodValidationPipe(VerifyOtpSchema))
  @ApiOperation({ summary: "Verify OTP and complete login" })
  @ApiBody({ type: VerifyOtpRequestDto })
  @ApiOkResponse({
    description: "Login completed successfully",
    type: LoginResponseDto,
  })
  @Post("verify-login")
  async verifyLogin(
    @Req() req: Request,
    @Body() data: VerifyOtp
  ): Promise<LoginResponse> {
    const ip = extractIp(req);
    this.ipReputationService.assertNotBlocked(ip);
    try {
      return await this.authService.verifyOtpAndLogin(data.email, data.otp);
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        this.ipReputationService.recordFailedAttempt(ip, data.email);
      }
      throw error;
    }
  }

  @Public()
  @Throttle({ default: { limit: 10, ttl: THROTTLE_TTL } })
  @UsePipes(new ZodValidationPipe(CompleteRegistrationSchema))
  @ApiOperation({ summary: "Complete registration with OTP verification" })
  @ApiBody({ type: CompleteRegistrationRequestDto })
  @ApiOkResponse({
    description: "Registration completed and authenticated session returned",
    type: LoginResponseDto,
  })
  @Post("complete-registration")
  async completeRegistration(
    @Req() req: Request,
    @Body() data: CompleteRegistration
  ): Promise<LoginResponse> {
    const ip = extractIp(req);
    this.ipReputationService.assertNotBlocked(ip);
    try {
      return await this.authService.completeRegistration(data);
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        this.ipReputationService.recordFailedAttempt(ip, data.email);
      }
      throw error;
    }
  }

  // ============================================================================
  // Google OAuth
  // ============================================================================

  @Public()
  @Throttle({ default: { limit: 10, ttl: GOOGLE_THROTTLE_TTL } })
  @ApiOperation({ summary: "Start Google OAuth login flow" })
  @ApiResponse({
    status: 302,
    description: "Redirects to Google OAuth authorization",
  })
  @Get("google")
  @UseGuards(GoogleAuthGuard)
  async googleAuth() {
    // This method is just a placeholder for the Google OAuth redirect
    // Passport will handle the redirect
  }

  @Public()
  @ApiOperation({ summary: "Handle Google OAuth callback" })
  @ApiResponse({
    status: 302,
    description: "Redirects to frontend callback with token",
  })
  @Get("google/callback")
  @UseGuards(GoogleAuthGuard)
  async googleAuthRedirect(
    @Req() req: { user: GoogleUser },
    @Res() res: Response
  ) {
    const { token } = await this.authService.loginWithGoogle(req.user);
    const frontendUrl = this.configService.get("FRONTEND_URL");
    return res.redirect(`${frontendUrl}/callback?token=${token}`);
  }
}
