/**
 * Team Invitation Email Template
 */

export interface TeamInvitationEmailData {
  inviterName: string;
  workspaceName: string;
  organizationName: string;
  inviteUrl: string;
}

export const teamInvitationTemplate = (data: TeamInvitationEmailData) => ({
  subject: `${data.inviterName} invited you to join ${data.organizationName}`,
  html: `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Team Invitation</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.05);">
          <tr>
            <td style="padding: 40px;">
              <h1 style="margin: 0 0 24px 0; font-size: 28px; font-weight: 600; color: #111827;">You've been invited! 🎉</h1>
              <p style="margin: 0 0 16px 0; font-size: 16px; line-height: 24px; color: #6b7280;">
                <strong>${data.inviterName}</strong> has invited you to join <strong>${data.workspaceName}</strong> in <strong>${data.organizationName}</strong> on Locus AI.
              </p>
              <p style="margin: 0 0 32px 0; font-size: 16px; line-height: 24px; color: #6b7280;">
                Locus AI is an AI-powered project management and development platform that helps teams ship faster with intelligent automation.
              </p>
             
              <table width="100%" cellpadding="0" cellspacing="0" style="margin: 32px 0;">
                <tr>
                  <td align="center">
                    <a href="${data.inviteUrl}" style="display: inline-block; padding: 14px 32px; background-color: #3b82f6; color: #ffffff; text-decoration: none; border-radius: 6px; font-size: 16px; font-weight: 600;">
                      Accept Invitation
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin: 24px 0 0 0; font-size: 14px; line-height: 20px; color: #9ca3af;">
                If you don't want to join this workspace, you can safely ignore this email.
              </p>
              
              <p style="margin: 16px 0 0 0; font-size: 12px; line-height: 18px; color: #9ca3af;">
                If the button doesn't work, copy and paste this URL into your browser:<br/>
                <span style="color: #3b82f6;">${data.inviteUrl}</span>
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
  text: `${data.inviterName} invited you to join ${data.organizationName}\n\n${data.inviterName} has invited you to join ${data.workspaceName} in ${data.organizationName} on Locus AI.\n\nLocus AI is an AI-powered project management and development platform that helps teams ship faster with intelligent automation.\n\nAccept the invitation by visiting:\n${data.inviteUrl}\n\nIf you don't want to join this workspace, you can safely ignore this email.`,
});
