import { createEmailTemplate } from "./email-base.template";

export interface OtpEmailData {
  otp: string;
  expiryMinutes: number;
}

export function createOtpEmail(data: OtpEmailData): {
  subject: string;
  html: string;
  text: string;
} {
  const { otp, expiryMinutes } = data;

  const content = `
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
      <tr>
        <td style="padding-bottom: 24px;">
          <p style="margin: 0; color: #374151; font-size: 15px; line-height: 1.6;">
            Use the verification code below to complete your authentication:
          </p>
        </td>
      </tr>
      <tr>
        <td style="padding: 16px 0;">
          <!-- OTP Code Box -->
          <div style="font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace; font-size: 32px; font-weight: 700; letter-spacing: 6px; color: #111827;">
            ${otp}
          </div>
        </td>
      </tr>
      <tr>
        <td style="padding-top: 16px; padding-bottom: 24px;">
          <p style="margin: 0; color: #6b7280; font-size: 14px; line-height: 1.5;">
            This code will expire in ${expiryMinutes} minutes.
          </p>
        </td>
      </tr>
      <tr>
        <td style="padding-top: 24px; border-top: 1px solid #e5e7eb;">
          <p style="margin: 0 0 12px 0; color: #6b7280; font-size: 14px; line-height: 1.6;">
            <strong>Security Tips:</strong>
          </p>
          <ul style="margin: 0; padding-left: 20px; color: #6b7280; font-size: 14px; line-height: 1.6;">
            <li style="margin-bottom: 4px;">Never share this code with anyone</li>
            <li style="margin-bottom: 4px;">Locus will never ask for your verification code</li>
            <li>If you didn't request this code, please ignore this email</li>
          </ul>
        </td>
      </tr>
    </table>
  `;

  const html = createEmailTemplate({
    preheader: `Your verification code is ${otp}`,
    title: "Verification Code",
    content,
  });

  const text = `
Your Locus Verification Code

Your verification code is: ${otp}

This code will expire in ${expiryMinutes} minutes.

Security Tips:
- Never share this code with anyone
- Locus will never ask for your verification code
- If you didn't request this code, please ignore this email

---
Locus - Mission Control for Agentic Engineering
https://locusai.dev
  `.trim();

  return {
    subject: "Your Locus verification code",
    html,
    text,
  };
}
