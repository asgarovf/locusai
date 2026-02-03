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
  Get,
  Post,
  Req,
  Res,
  UnauthorizedException,
  UseGuards,
  UsePipes,
} from "@nestjs/common";
import type { Request, Response } from "express";
import { AuditLog, CustomThrottle, byEmail, byIp } from "@/common/decorators";
import { ZodValidationPipe } from "@/common/pipes";
import { TypedConfigService } from "@/config/config.service";
import { AuthService } from "./auth.service";
import { CookieService, REFRESH_TOKEN_COOKIE } from "./cookie.service";
import { CsrfService } from "./csrf.service";
import { CurrentUser, Public } from "./decorators";
import { ExchangeCode, ExchangeCodeSchema } from "./dto";
import { GoogleAuthGuard } from "./guards";
import { GoogleUser } from "./interfaces/google-user.interface";
import { IpBlockService } from "./ip-block.service";
import { OAuthCodeService } from "./oauth-code.service";

@Controller("auth")
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly configService: TypedConfigService,
    private readonly cookieService: CookieService,
    private readonly csrfService: CsrfService,
    private readonly oauthCodeService: OAuthCodeService,
    private readonly ipBlockService: IpBlockService
  ) {}

  @Get("me")
  @AuditLog("PROFILE_ACCESS", "auth")
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
  @AuditLog("API_KEY_ACCESS", "auth")
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

  // ============================================================================
  // OTP-Based Authentication (Cloud Mode)
  // ============================================================================

  @Public()
  @UsePipes(new ZodValidationPipe(OtpRequestSchema))
  @Post("register-otp")
  @CustomThrottle({ limit: 5, ttl: 60 * 60 * 1000, keyGenerator: byEmail() })
  @AuditLog("REGISTER_OTP_REQUEST", "auth")
  async registerOtp(@Body() data: OtpRequest) {
    return this.authService.requestRegisterOtp(data.email);
  }

  @Public()
  @UsePipes(new ZodValidationPipe(OtpRequestSchema))
  @Post("login-otp")
  @CustomThrottle({ limit: 5, ttl: 60 * 60 * 1000, keyGenerator: byEmail() })
  @AuditLog("LOGIN_OTP_REQUEST", "auth")
  async loginOtp(@Body() data: OtpRequest) {
    return this.authService.requestLoginOtp(data.email);
  }

  @Public()
  @UsePipes(new ZodValidationPipe(VerifyOtpSchema))
  @Post("verify-login")
  @CustomThrottle({ limit: 10, ttl: 60 * 60 * 1000, keyGenerator: byEmail() })
  @AuditLog("LOGIN_VERIFY", "auth")
  async verifyLogin(
    @Body() data: VerifyOtp,
    @Req() req: Request
  ): Promise<LoginResponse> {
    const ipAddress = this.extractIpAddress(req);

    try {
      const result = await this.authService.verifyOtpAndLogin(data.email, data.otp);
      // On successful login, reset failed attempts for this IP
      if (ipAddress) {
        await this.ipBlockService.resetFailedAttempts(ipAddress);
      }
      return result;
    } catch (error) {
      // Record failed attempt for this IP
      if (ipAddress) {
        await this.ipBlockService.recordFailedAttempt(ipAddress);
      }
      throw error;
    }
  }

  @Public()
  @UsePipes(new ZodValidationPipe(CompleteRegistrationSchema))
  @Post("complete-registration")
  @CustomThrottle({ limit: 5, ttl: 60 * 60 * 1000, keyGenerator: byIp() })
  @AuditLog("USER_REGISTRATION", "auth")
  async completeRegistration(
    @Body() data: CompleteRegistration
  ): Promise<LoginResponse> {
    return this.authService.completeRegistration(data);
  }

  // ============================================================================
  // Google OAuth
  // ============================================================================

  @Public()
  @Get("google")
  @UseGuards(GoogleAuthGuard)
  @AuditLog("GOOGLE_AUTH_INIT", "auth")
  async googleAuth() {
    // This method is just a placeholder for the Google OAuth redirect
    // Passport will handle the redirect
  }

  @Public()
  @Get("google/callback")
  @UseGuards(GoogleAuthGuard)
  @AuditLog("GOOGLE_AUTH_CALLBACK", "auth")
  async googleAuthRedirect(
    @Req() req: { user: GoogleUser },
    @Res() res: Response
  ) {
    // Process Google user (create or find existing)
    const user = await this.authService.processGoogleUser(req.user);

    // Generate a one-time authorization code instead of a JWT token
    const code = this.oauthCodeService.generateCode(user.id, user.email);

    // Redirect to frontend with only the authorization code (no sensitive tokens in URL)
    const frontendUrl = this.configService.get("FRONTEND_URL");
    return res.redirect(`${frontendUrl}/callback?code=${code}`);
  }

  /**
   * Exchange a one-time authorization code for authentication cookies.
   * This completes the OAuth flow securely by setting httpOnly cookies
   * instead of returning tokens in the response body or URL.
   */
  @Public()
  @Post("exchange-code")
  @UsePipes(new ZodValidationPipe(ExchangeCodeSchema))
  @CustomThrottle({ limit: 10, ttl: 60 * 1000, keyGenerator: byIp() })
  @AuditLog("OAUTH_CODE_EXCHANGE", "auth")
  async exchangeCode(
    @Body() data: ExchangeCode,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response
  ) {
    const ipAddress = this.extractIpAddress(req);

    // Validate and consume the one-time code
    const codeData = this.oauthCodeService.validateAndConsumeCode(data.code);

    if (!codeData) {
      // Record failed attempt for invalid code
      if (ipAddress) {
        await this.ipBlockService.recordFailedAttempt(ipAddress);
      }
      throw new UnauthorizedException(
        "Invalid or expired authorization code. Please try logging in again."
      );
    }

    // Get the user from the database
    const user = await this.authService.getUserById(codeData.userId);
    if (!user) {
      throw new UnauthorizedException("User not found");
    }

    // Reset failed attempts on successful code exchange
    if (ipAddress) {
      await this.ipBlockService.resetFailedAttempts(ipAddress);
    }

    // Create token pair and set cookies
    const metadata = {
      userAgent: req.headers["user-agent"],
      ipAddress: req.ip || req.socket?.remoteAddress,
    };

    const tokens = await this.authService.createTokenPair(user, metadata);
    this.cookieService.setAuthCookies(
      res,
      tokens.accessToken,
      tokens.refreshToken
    );

    // Fetch user workspace info for response
    const workspaces = await this.authService.getUserWorkspaces(user.id);
    const workspaceId = workspaces[0]?.id ?? undefined;

    let orgId: string | undefined;
    if (workspaceId) {
      const workspace = await this.authService.getWorkspaceOrgId(workspaceId);
      orgId = workspace?.orgId;
    }

    // Return user info (no tokens in response body)
    return {
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
  // Cookie-Based Token Management
  // ============================================================================

  /**
   * Get a CSRF token for frontend applications.
   * Implements double-submit cookie pattern:
   * - Sets csrf_token cookie (readable by JavaScript)
   * - Sets csrf_secret cookie (httpOnly, server-side validation)
   * - Returns token in response body for immediate use
   */
  @Public()
  @Get("csrf-token")
  getCsrfToken(@Res({ passthrough: true }) res: Response): { csrfToken: string } {
    const secret = this.csrfService.generateSecret();
    const token = this.csrfService.generateToken(secret);

    this.cookieService.setCsrfCookies(res, token, secret);

    return { csrfToken: token };
  }

  /**
   * Refresh access token using refresh token from cookie.
   * Implements token rotation: old refresh token is invalidated and new pair issued.
   */
  @Public()
  @Post("refresh")
  @AuditLog("TOKEN_REFRESH", "auth")
  async refresh(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const refreshToken = req.cookies?.[REFRESH_TOKEN_COOKIE];

    if (!refreshToken) {
      throw new UnauthorizedException("No refresh token provided");
    }

    const metadata = {
      userAgent: req.headers["user-agent"],
      ipAddress: req.ip || req.socket?.remoteAddress,
    };

    const tokens = await this.authService.refreshTokens(refreshToken, metadata);
    this.cookieService.setAuthCookies(
      res,
      tokens.accessToken,
      tokens.refreshToken
    );

    return { success: true };
  }

  /**
   * Logout: revoke refresh token and clear auth cookies.
   */
  @Post("logout")
  @AuditLog("USER_LOGOUT", "auth")
  async logout(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
    @CurrentUser() _authUser: AuthenticatedUser
  ) {
    // Revoke the refresh token if present
    const refreshToken = req.cookies?.[REFRESH_TOKEN_COOKIE];
    if (refreshToken) {
      await this.authService.revokeRefreshToken(refreshToken);
    }

    // Clear all auth cookies
    this.cookieService.clearAuthCookies(res);

    return { success: true };
  }

  /**
   * Logout from all devices: revoke all refresh tokens for the user.
   */
  @Post("logout-all")
  @AuditLog("USER_LOGOUT_ALL", "auth")
  async logoutAll(
    @Res({ passthrough: true }) res: Response,
    @CurrentUser() authUser: AuthenticatedUser
  ) {
    if (!isJwtUser(authUser)) {
      throw new UnauthorizedException(
        "This endpoint requires user authentication"
      );
    }

    await this.authService.revokeAllUserRefreshTokens(authUser.id);
    this.cookieService.clearAuthCookies(res);

    return { success: true };
  }

  private extractIpAddress(request: Request): string | undefined {
    // Check X-Forwarded-For header first (for proxied requests)
    const forwardedFor = request.headers["x-forwarded-for"];
    if (forwardedFor) {
      const ips = Array.isArray(forwardedFor)
        ? forwardedFor[0]
        : forwardedFor.split(",")[0];
      return ips?.trim();
    }

    // Fall back to request.ip or socket remote address
    return request.ip || request.socket?.remoteAddress;
  }
}
