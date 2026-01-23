import { randomInt } from "node:crypto";
import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { TypedConfigService } from "@/config/config.service";
import { OtpVerification } from "@/entities/otp-verification.entity";

@Injectable()
export class OtpService {
  constructor(
    @InjectRepository(OtpVerification)
    private readonly otpRepository: Repository<OtpVerification>,
    private readonly configService: TypedConfigService
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
      where: { email, code, verified: false },
    });

    if (!otp) {
      return { valid: false, message: "Invalid or expired code" };
    }

    if (otp.expiresAt < new Date()) {
      return { valid: false, message: "Code has expired" };
    }

    otp.verified = true;
    await this.otpRepository.save(otp);

    return { valid: true };
  }

  async invalidateOtp(email: string): Promise<void> {
    await this.otpRepository.delete({ email });
  }
}
