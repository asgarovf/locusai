import * as crypto from "node:crypto";
import { Injectable } from "@nestjs/common";

export interface OAuthCodeData {
  userId: string;
  email: string;
  createdAt: number;
}

/**
 * Service for managing one-time OAuth authorization codes.
 * These codes are short-lived (60 seconds) and can only be used once.
 * This prevents tokens from appearing in URLs.
 */
@Injectable()
export class OAuthCodeService {
  private readonly codes = new Map<string, OAuthCodeData>();
  private readonly CODE_EXPIRY_MS = 60 * 1000; // 60 seconds

  /**
   * Generate a one-time authorization code for a user.
   * The code is cryptographically secure and expires after 60 seconds.
   */
  generateCode(userId: string, email: string): string {
    const code = crypto.randomBytes(32).toString("base64url");

    this.codes.set(code, {
      userId,
      email,
      createdAt: Date.now(),
    });

    // Schedule cleanup after expiry
    setTimeout(() => {
      this.codes.delete(code);
    }, this.CODE_EXPIRY_MS);

    return code;
  }

  /**
   * Validate and consume a one-time authorization code.
   * Returns the user data if valid, null otherwise.
   * The code is invalidated immediately after use (single-use).
   */
  validateAndConsumeCode(code: string): OAuthCodeData | null {
    const data = this.codes.get(code);

    if (!data) {
      return null;
    }

    // Check expiry
    if (Date.now() - data.createdAt > this.CODE_EXPIRY_MS) {
      this.codes.delete(code);
      return null;
    }

    // Consume the code (single-use)
    this.codes.delete(code);

    return data;
  }

  /**
   * Clean up expired codes (called periodically if needed).
   */
  cleanupExpiredCodes(): number {
    const now = Date.now();
    let cleaned = 0;

    for (const [code, data] of this.codes.entries()) {
      if (now - data.createdAt > this.CODE_EXPIRY_MS) {
        this.codes.delete(code);
        cleaned++;
      }
    }

    return cleaned;
  }
}
