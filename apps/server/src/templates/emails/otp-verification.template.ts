/**
 * OTP Verification Email Template
 */

export interface OtpEmailData {
  otp: string;
  expiryMinutes: number;
}

export const otpVerificationTemplate = (data: OtpEmailData) => ({
  subject: "Verify your email - Locus AI",
  html: `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Verify your email</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.05);">
          <tr>
            <td style="padding: 40px;">
              <h1 style="margin: 0 0 24px 0; font-size: 28px; font-weight: 600; color: #111827;">Verify your email</h1>
              <p style="margin: 0 0 24px 0; font-size: 16px; line-height: 24px; color: #6b7280;">
                You're almost ready to start using Locus AI. Use the code below to verify your email address and complete your registration.
              </p>
             
              <table width="100%" cellpadding="0" cellspacing="0" style="margin: 32px 0;">
                <tr>
                  <td align="center" style="background-color: #f9fafb; border-radius: 8px; padding: 24px;">
                    <div style="font-size: 36px; font-weight: 700; letter-spacing: 8px; color: #111827; font-family: 'Courier New', monospace;">
                      ${data.otp}
                    </div>
                  </td>
                </tr>
              </table>

              <p style="margin: 24px 0 0 0; font-size: 14px; line-height: 20px; color: #9ca3af;">
                This code will expire in ${data.expiryMinutes} minutes. If you didn't request this code, please ignore this email.
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding: 24px 40px; background-color: #f9fafb; border-top: 1px solid #e5e7eb; border-radius: 0 0 8px 8px;">
              <p style="margin: 0; font-size: 12px; line-height: 18px; color: #9ca3af; text-align: center;">
                © ${new Date().getFullYear()} Locus AI. All rights reserved.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `,
  text: `Verify your email - Locus AI\n\nYou're almost ready to start using Locus AI. Use the code below to verify your email address:\n\n${data.otp}\n\nThis code will expire in ${data.expiryMinutes} minutes. If you didn't request this code, please ignore this email.`,
});
