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
        <td style="padding: 24px 0; text-align: center;">
          <!-- OTP Code Box -->
          <div style="display: inline-block; background-color: #f3f4f6; border: 2px solid #e5e7eb; border-radius: 12px; padding: 16px 32px;">
            <div style="color: #111827; font-size: 32px; font-weight: 700; letter-spacing: 6px; font-family: 'Courier New', monospace;">
              ${otp}
            </div>
          </div>
        </td>
      </tr>
      <tr>
        <td style="padding-top: 24px; padding-bottom: 24px;">
          <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #fef3c7; border-left: 4px solid #f59e0b; border-radius: 6px;">
            <tr>
              <td style="padding: 16px 20px;">
                <p style="margin: 0; color: #92400e; font-size: 14px; line-height: 1.5;">
                  <strong>⏱️ Time Sensitive:</strong> This code will expire in <strong>${expiryMinutes} minutes</strong>.
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
      <tr>
        <td style="padding-top: 24px; border-top: 1px solid #e5e7eb;">
          <p style="margin: 0 0 12px 0; color: #6b7280; font-size: 14px; line-height: 1.6;">
            <strong>Security Tips:</strong>
          </p>
          <ul style="margin: 0; padding-left: 20px; color: #6b7280; font-size: 14px; line-height: 1.6;">
            <li style="margin-bottom: 8px;">Never share this code with anyone</li>
            <li style="margin-bottom: 8px;">Locus will never ask for your verification code</li>
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
