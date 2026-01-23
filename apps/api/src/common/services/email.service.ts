import { Injectable } from "@nestjs/common";
import { Resend } from "resend";
import { TypedConfigService } from "@/config/config.service";
import { AppLogger } from "../logger/logger.service";

@Injectable()
export class EmailService {
  private resend: Resend | null = null;

  constructor(
    private configService: TypedConfigService,
    private logger: AppLogger
  ) {
    const apiKey = this.configService.get("RESEND_API_KEY");
    if (apiKey) {
      this.resend = new Resend(apiKey);
    }
  }

  async sendOtpEmail(
    email: string,
    data: { otp: string; expiryMinutes: number }
  ) {
    if (!this.resend) {
      this.logger.log(
        `[Email Mock] Sending OTP ${data.otp} to ${email}`,
        "EmailService"
      );
      return;
    }

    await this.resend.emails.send({
      from: "Locus <noreply@locusai.dev>",
      to: email,
      subject: "Your verification code",
      text: `Your verification code is ${data.otp}. It will expire in ${data.expiryMinutes} minutes.`,
    });
  }

  async sendWelcomeEmail(
    email: string,
    data: { userName: string; organizationName: string; workspaceName: string }
  ) {
    if (!this.resend) {
      this.logger.log(
        `[Email Mock] Sending Welcome email to ${email}`,
        "EmailService"
      );
      return;
    }

    await this.resend.emails.send({
      from: "Locus <noreply@locusai.dev>",
      to: email,
      subject: "Welcome to Locus!",
      text: `Hello ${data.userName}, welcome to Locus! Your organization ${data.organizationName} and workspace ${data.workspaceName} are ready.`,
    });
  }

  async sendInvitationEmail(
    email: string,
    data: {
      inviterName: string;
      organizationName: string;
      token: string;
    }
  ) {
    if (!this.resend) {
      this.logger.log(
        `[Email Mock] Sending Invitation email to ${email} (Org: ${data.organizationName})`,
        "EmailService"
      );
      return;
    }

    const invitationUrl = `https://locusai.dev/invite?token=${data.token}`;

    await this.resend.emails.send({
      from: "Locus <noreply@locusai.dev>",
      to: email,
      subject: `You've been invited to join ${data.organizationName}`,
      text: `Hello, ${data.inviterName} has invited you to join ${data.organizationName} on Locus. Accept the invitation here: ${invitationUrl}`,
    });
  }
}
