import { randomInt } from "node:crypto";
import { SecurityAuditEventType } from "@locusai/shared";
import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { SecurityAuditService } from "@/common/services/security-audit.service";
import { TypedConfigService } from "@/config/config.service";
import { OtpVerification } from "@/entities/otp-verification.entity";

const MAX_OTP_ATTEMPTS = 5;

@Injectable()
export class OtpService {
  constructor(
    @InjectRepository(OtpVerification)
    private readonly otpRepository: Repository<OtpVerification>,
    private readonly configService: TypedConfigService,
    private readonly securityAuditService: SecurityAuditService
  ) {}

  async generateOtp(email: string): Promise<{ code: string; expiresAt: Date }> {
    // Invalidate old OTPs for this email
    await this.otpRepository.delete({ email });

    // Generate a secure 6-digit code
    const code = randomInt(100000, 999999).toString();
    const expiresInMinutes = this.configService.get("OTP_EXPIRES_IN_MINUTES");
    const expiresAt = new Date(Date.now() + expiresInMinutes * 60 * 1000);

    const otp = this.otpRepository.create({
      email,
      code,
      expiresAt,
    });

    await this.otpRepository.save(otp);
    return { code, expiresAt };
  }

  async verifyOtp(
    email: string,
    code: string
  ): Promise<{ valid: boolean; message?: string }> {
    const otp = await this.otpRepository.findOne({
      where: { email, verified: false },
    });

    if (!otp) {
      await this.securityAuditService.log({
        eventType: SecurityAuditEventType.OTP_VERIFY_FAILURE,
        email,
        metadata: { reason: "No OTP found" },
      });
      return { valid: false, message: "Invalid or expired code" };
    }

    if (otp.attempts >= MAX_OTP_ATTEMPTS) {
      await this.securityAuditService.log({
        eventType: SecurityAuditEventType.OTP_BRUTE_FORCE_LOCKOUT,
        email,
        metadata: { attempts: otp.attempts },
      });
      return {
        valid: false,
        message: "Too many attempts. Please request a new code.",
      };
    }

    if (otp.expiresAt < new Date()) {
      await this.securityAuditService.log({
        eventType: SecurityAuditEventType.OTP_VERIFY_FAILURE,
        email,
        metadata: { reason: "Code expired" },
      });
      return { valid: false, message: "Code has expired" };
    }

    if (otp.code !== code) {
      otp.attempts += 1;
      await this.otpRepository.save(otp);

      if (otp.attempts >= MAX_OTP_ATTEMPTS) {
        await this.securityAuditService.log({
          eventType: SecurityAuditEventType.OTP_BRUTE_FORCE_LOCKOUT,
          email,
          metadata: { attempts: otp.attempts },
        });
        return {
          valid: false,
          message: "Too many attempts. Please request a new code.",
        };
      }

      await this.securityAuditService.log({
        eventType: SecurityAuditEventType.OTP_VERIFY_FAILURE,
        email,
        metadata: { reason: "Invalid code", attempts: otp.attempts },
      });
      return { valid: false, message: "Invalid or expired code" };
    }

    otp.verified = true;
    await this.otpRepository.save(otp);

    await this.securityAuditService.log({
      eventType: SecurityAuditEventType.OTP_VERIFY_SUCCESS,
      email,
    });

    return { valid: true };
  }

  async invalidateOtp(email: string): Promise<void> {
    await this.otpRepository.delete({ email });
  }
}
