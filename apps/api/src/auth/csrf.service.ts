import { Injectable } from "@nestjs/common";
import { createHmac, randomBytes } from "node:crypto";
import { TypedConfigService } from "@/config/config.service";

@Injectable()
export class CsrfService {
  private readonly algorithm = "sha256";

  constructor(private readonly configService: TypedConfigService) {}

  /**
   * Generate a cryptographically secure random secret for CSRF protection.
   * This secret is stored in an httpOnly cookie and used to sign tokens.
   */
  generateSecret(): string {
    return randomBytes(32).toString("hex");
  }

  /**
   * Generate a CSRF token using HMAC-SHA256.
   * The token is derived from the secret using the app's CSRF secret as the key.
   * This implements the double-submit cookie pattern.
   */
  generateToken(secret: string): string {
    const csrfSecret = this.configService.get("CSRF_SECRET");
    const hmac = createHmac(this.algorithm, csrfSecret);
    hmac.update(secret);
    return hmac.digest("hex");
  }

  /**
   * Validate a CSRF token against the stored secret.
   * Returns true if the token matches the expected value.
   */
  validateToken(token: string, secret: string): boolean {
    if (!token || !secret) {
      return false;
    }

    const expectedToken = this.generateToken(secret);

    // Use timing-safe comparison to prevent timing attacks
    if (token.length !== expectedToken.length) {
      return false;
    }

    let result = 0;
    for (let i = 0; i < token.length; i++) {
      result |= token.charCodeAt(i) ^ expectedToken.charCodeAt(i);
    }

    return result === 0;
  }
}
