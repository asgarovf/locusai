import { Injectable } from "@nestjs/common";
import type { CookieOptions, Response } from "express";
import { TypedConfigService } from "@/config/config.service";

export const ACCESS_TOKEN_COOKIE = "access_token";
export const REFRESH_TOKEN_COOKIE = "refresh_token";
export const CSRF_TOKEN_COOKIE = "csrf_token";
export const CSRF_SECRET_COOKIE = "csrf_secret";

@Injectable()
export class CookieService {
  constructor(private readonly configService: TypedConfigService) {}

  private isProduction(): boolean {
    return this.configService.get("NODE_ENV") === "production";
  }

  private getBaseCookieOptions(): CookieOptions {
    const domain = this.configService.get("COOKIE_DOMAIN");
    return {
      httpOnly: true,
      secure: this.isProduction(),
      sameSite: "strict",
      ...(domain && { domain }),
    };
  }

  /**
   * Set the access token cookie.
   * - HttpOnly: true (prevents XSS access)
   * - Secure: true in production (HTTPS only)
   * - SameSite: Strict (prevents CSRF)
   * - Path: / (available for all API routes)
   */
  setAccessTokenCookie(res: Response, token: string): void {
    const expiresInMinutes = this.configService.get(
      "ACCESS_TOKEN_EXPIRES_IN_MINUTES"
    );
    const maxAge = expiresInMinutes * 60 * 1000; // Convert to milliseconds

    res.cookie(ACCESS_TOKEN_COOKIE, token, {
      ...this.getBaseCookieOptions(),
      path: "/",
      maxAge,
    });
  }

  /**
   * Set the refresh token cookie.
   * - HttpOnly: true (prevents XSS access)
   * - Secure: true in production (HTTPS only)
   * - SameSite: Strict (prevents CSRF)
   * - Path: /api/auth/refresh (only sent to refresh endpoint)
   */
  setRefreshTokenCookie(res: Response, token: string): void {
    const expiresInDays = this.configService.get("REFRESH_TOKEN_EXPIRES_IN_DAYS");
    const maxAge = expiresInDays * 24 * 60 * 60 * 1000; // Convert to milliseconds

    res.cookie(REFRESH_TOKEN_COOKIE, token, {
      ...this.getBaseCookieOptions(),
      path: "/api/auth/refresh",
      maxAge,
    });
  }

  /**
   * Clear both authentication cookies.
   * Used during logout.
   */
  clearAuthCookies(res: Response): void {
    const domain = this.configService.get("COOKIE_DOMAIN");
    const baseOptions: CookieOptions = {
      httpOnly: true,
      secure: this.isProduction(),
      sameSite: "strict",
      ...(domain && { domain }),
    };

    res.clearCookie(ACCESS_TOKEN_COOKIE, {
      ...baseOptions,
      path: "/",
    });

    res.clearCookie(REFRESH_TOKEN_COOKIE, {
      ...baseOptions,
      path: "/api/auth/refresh",
    });
  }

  /**
   * Set both access and refresh token cookies.
   * Convenience method for login flows.
   */
  setAuthCookies(
    res: Response,
    accessToken: string,
    refreshToken: string
  ): void {
    this.setAccessTokenCookie(res, accessToken);
    this.setRefreshTokenCookie(res, refreshToken);
  }

  /**
   * Set CSRF cookies using double-submit cookie pattern.
   * - csrf_token: httpOnly: false (accessible by JavaScript for header submission)
   * - csrf_secret: httpOnly: true (server-side only, used to validate token)
   */
  setCsrfCookies(res: Response, token: string, secret: string): void {
    const domain = this.configService.get("COOKIE_DOMAIN");
    const secure = this.isProduction();

    // Token cookie - readable by JavaScript to include in request headers
    res.cookie(CSRF_TOKEN_COOKIE, token, {
      httpOnly: false,
      secure,
      sameSite: "strict",
      path: "/",
      ...(domain && { domain }),
    });

    // Secret cookie - httpOnly, used server-side to validate the token
    res.cookie(CSRF_SECRET_COOKIE, secret, {
      httpOnly: true,
      secure,
      sameSite: "strict",
      path: "/",
      ...(domain && { domain }),
    });
  }

  /**
   * Clear CSRF cookies.
   * Used during logout.
   */
  clearCsrfCookies(res: Response): void {
    const domain = this.configService.get("COOKIE_DOMAIN");
    const baseOptions: CookieOptions = {
      secure: this.isProduction(),
      sameSite: "strict",
      path: "/",
      ...(domain && { domain }),
    };

    res.clearCookie(CSRF_TOKEN_COOKIE, {
      ...baseOptions,
      httpOnly: false,
    });

    res.clearCookie(CSRF_SECRET_COOKIE, {
      ...baseOptions,
      httpOnly: true,
    });
  }
}
