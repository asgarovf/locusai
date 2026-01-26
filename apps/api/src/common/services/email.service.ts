import { Injectable } from "@nestjs/common";
import { Resend } from "resend";
import { TypedConfigService } from "@/config/config.service";
import { AppLogger } from "../logger/logger.service";
import {
  createInvitationEmail,
  createOtpEmail,
  createWelcomeEmail,
  type InvitationEmailData,
  type OtpEmailData,
  type WelcomeEmailData,
} from "../templates";

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

  async sendOtpEmail(email: string, data: OtpEmailData) {
    const emailContent = createOtpEmail(data);

    if (!this.resend) {
      this.logger.log(
        `[Email Mock] Sending OTP ${data.otp} to ${email}`,
        "EmailService"
      );
      return;
    }

    await this.resend.emails.send({
      from: "Locus <noreply@locusai.team>",
      to: email,
      subject: emailContent.subject,
      html: emailContent.html,
      text: emailContent.text,
    });
  }

  async sendWelcomeEmail(email: string, data: WelcomeEmailData) {
    const emailContent = createWelcomeEmail(data);

    if (!this.resend) {
      this.logger.log(
        `[Email Mock] Sending Welcome email to ${email}`,
        "EmailService"
      );
      return;
    }

    await this.resend.emails.send({
      from: "Locus <noreply@locusai.team>",
      to: email,
      subject: emailContent.subject,
      html: emailContent.html,
      text: emailContent.text,
    });
  }

  async sendInvitationEmail(email: string, data: InvitationEmailData) {
    const emailContent = createInvitationEmail(data);

    if (!this.resend) {
      this.logger.log(
        `[Email Mock] Sending Invitation email to ${email} (Org: ${data.organizationName})`,
        "EmailService"
      );
      return;
    }

    await this.resend.emails.send({
      from: "Locus <noreply@locusai.team>",
      to: email,
      subject: emailContent.subject,
      html: emailContent.html,
      text: emailContent.text,
    });
  }
}
