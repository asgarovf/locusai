/**
 * Email Service
 *
 * Handles email sending using Resend API for OTP verification, team invitations, and welcome messages.
 */

import { Resend } from "resend";
import {
  type OtpEmailData,
  otpVerificationTemplate,
} from "../templates/emails/otp-verification.template.js";
import {
  type TeamInvitationEmailData,
  teamInvitationTemplate,
} from "../templates/emails/team-invitation.template.js";
import {
  type WelcomeEmailData,
  welcomeTemplate,
} from "../templates/emails/welcome.template.js";

export interface EmailServiceConfig {
  apiKey: string;
  fromEmail: string;
}

export class EmailService {
  private resend: Resend | null = null;
  private config: EmailServiceConfig;
  private isLocal: boolean;

  constructor(config: EmailServiceConfig, isLocal = false) {
    this.config = config;
    this.isLocal = isLocal;

    // Only initialize Resend in cloud mode
    if (!isLocal && config.apiKey) {
      this.resend = new Resend(config.apiKey);
    }
  }

  /**
   * Send OTP verification email
   */
  async sendOtpEmail(email: string, data: OtpEmailData): Promise<void> {
    if (this.isLocal) {
      console.log(
        `[LOCAL MODE] OTP Email to ${email}: Code ${data.otp} (expires in ${data.expiryMinutes} min)`
      );
      return;
    }

    if (!this.resend) {
      throw new Error("Email service not configured for cloud mode");
    }

    const template = otpVerificationTemplate(data);

    try {
      await this.resend.emails.send({
        from: this.config.fromEmail,
        to: email,
        subject: template.subject,
        html: template.html,
        text: template.text,
      });
    } catch (error) {
      console.error("Failed to send OTP email:", error);
      throw new Error("Failed to send verification email");
    }
  }

  /**
   * Send team invitation email
   */
  async sendInvitationEmail(
    email: string,
    data: TeamInvitationEmailData
  ): Promise<void> {
    if (this.isLocal) {
      console.log(
        `[LOCAL MODE] Invitation Email to ${email}: ${data.inviterName} invited you to ${data.workspaceName}`
      );
      return;
    }

    if (!this.resend) {
      throw new Error("Email service not configured for cloud mode");
    }

    const template = teamInvitationTemplate(data);

    try {
      await this.resend.emails.send({
        from: this.config.fromEmail,
        to: email,
        subject: template.subject,
        html: template.html,
        text: template.text,
      });
    } catch (error) {
      console.error("Failed to send invitation email:", error);
      throw new Error("Failed to send invitation email");
    }
  }

  /**
   * Send welcome email
   */
  async sendWelcomeEmail(email: string, data: WelcomeEmailData): Promise<void> {
    if (this.isLocal) {
      console.log(
        `[LOCAL MODE] Welcome Email to ${email}: Welcome ${data.userName} to ${data.organizationName}!`
      );
      return;
    }

    if (!this.resend) {
      throw new Error("Email service not configured for cloud mode");
    }

    const template = welcomeTemplate(data);

    try {
      await this.resend.emails.send({
        from: this.config.fromEmail,
        to: email,
        subject: template.subject,
        html: template.html,
        text: template.text,
      });
    } catch (error) {
      console.error("Failed to send welcome email:", error);
      // Don't throw for welcome email - it's not critical
      console.warn("Welcome email failed, but continuing registration");
    }
  }
}
