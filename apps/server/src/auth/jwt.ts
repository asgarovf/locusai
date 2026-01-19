/**
 * JWT Utilities
 *
 * Uses jsonwebtoken package for secure JWT handling.
 */

import type { JWTPayload } from "@locusai/shared";
import jwt from "jsonwebtoken";

export interface JWTOptions {
  /** Token expiration time in seconds (default: 24 hours) */
  expiresIn?: number;
}

/**
 * Generate a JWT token
 */
export function signJWT(
  payload: Omit<JWTPayload, "iat" | "exp">,
  secret: string,
  options: JWTOptions = {}
): string {
  const { expiresIn = 24 * 60 * 60 } = options; // Default 24 hours

  return jwt.sign(payload, secret, {
    expiresIn,
    algorithm: "HS256",
  });
}

export interface VerifyResult {
  valid: boolean;
  payload?: JWTPayload;
  error?: string;
}

/**
 * Verify and decode a JWT token
 */
export function verifyJWT(token: string, secret: string): VerifyResult {
  try {
    const payload = jwt.verify(token, secret, {
      algorithms: ["HS256"],
    }) as JWTPayload;

    return { valid: true, payload };
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      return { valid: false, error: "Token expired" };
    }
    if (error instanceof jwt.JsonWebTokenError) {
      return { valid: false, error: "Invalid token" };
    }
    return {
      valid: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Decode a JWT without verification (for debugging/logging)
 */
export function decodeJWT(token: string): JWTPayload | null {
  try {
    const decoded = jwt.decode(token);
    return decoded as JWTPayload | null;
  } catch {
    return null;
  }
}
