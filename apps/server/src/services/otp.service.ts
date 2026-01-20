/**
 * OTP Service
 *
 * Handles OTP generation, validation, and cleanup for email verification.
 */

import { desc, eq, lt } from "drizzle-orm";
import { generateUUID } from "../auth/password.js";
import type { DrizzleDB } from "../db/drizzle.js";
import { otpVerification } from "../db/schema.js";

export interface OtpServiceConfig {
  otpLength?: number;
  expiryMinutes?: number;
  maxAttempts?: number;
}

export class OtpService {
  private db: DrizzleDB;
  private config: Required<OtpServiceConfig>;

  constructor(db: DrizzleDB, config: OtpServiceConfig = {}) {
    this.db = db;
    this.config = {
      otpLength: config.otpLength ?? 6,
      expiryMinutes: config.expiryMinutes ?? 10,
      maxAttempts: config.maxAttempts ?? 3,
    };
  }

  /**
   * Generate a random OTP code
   */
  private generateOtpCode(): string {
    const digits = "0123456789";
    let otp = "";
    for (let i = 0; i < this.config.otpLength; i++) {
      otp += digits[Math.floor(Math.random() * digits.length)];
    }
    return otp;
  }

  /**
   * Create and store a new OTP for an email address
   */
  async generateOtp(email: string): Promise<{ code: string; expiresAt: Date }> {
    const code = this.generateOtpCode();
    const now = new Date();
    const expiresAt = new Date(
      now.getTime() + this.config.expiryMinutes * 60 * 1000
    );

    // Invalidate any existing OTPs for this email
    await this.db
      .delete(otpVerification)
      .where(eq(otpVerification.email, email));

    // Create new OTP record
    const id = generateUUID();
    await this.db.insert(otpVerification).values({
      id,
      email,
      code,
      expiresAt,
      verified: false,
      attempts: 0,
      createdAt: now,
    });

    return { code, expiresAt };
  }

  /**
   * Verify an OTP code for an email address
   */
  async verifyOtp(
    email: string,
    code: string
  ): Promise<{ valid: boolean; message?: string }> {
    const [record] = await this.db
      .select()
      .from(otpVerification)
      .where(eq(otpVerification.email, email))
      .orderBy(desc(otpVerification.createdAt))
      .limit(1);

    if (!record) {
      return { valid: false, message: "No OTP found for this email" };
    }

    if (record.verified) {
      return { valid: false, message: "OTP already used" };
    }

    if (new Date() > new Date(record.expiresAt)) {
      return { valid: false, message: "OTP has expired" };
    }

    if (record.attempts >= this.config.maxAttempts) {
      return {
        valid: false,
        message: "Maximum verification attempts exceeded",
      };
    }

    // Increment attempts
    await this.db
      .update(otpVerification)
      .set({ attempts: record.attempts + 1 })
      .where(eq(otpVerification.id, record.id));

    if (record.code !== code) {
      return { valid: false, message: "Invalid OTP code" };
    }

    // Mark as verified
    await this.db
      .update(otpVerification)
      .set({ verified: true })
      .where(eq(otpVerification.id, record.id));

    return { valid: true };
  }

  /**
   * Invalidate all OTPs for an email address
   */
  async invalidateOtp(email: string): Promise<void> {
    await this.db
      .delete(otpVerification)
      .where(eq(otpVerification.email, email));
  }

  /**
   * Clean up expired OTPs (should be run periodically)
   */
  async cleanupExpiredOtps(): Promise<number> {
    const now = new Date();
    const result = await this.db
      .delete(otpVerification)
      .where(lt(otpVerification.expiresAt, now))
      .returning({ id: otpVerification.id });

    return result.length;
  }
}
