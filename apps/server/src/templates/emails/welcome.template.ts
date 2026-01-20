/**
 * Welcome Email Template
 */

export interface WelcomeEmailData {
  userName: string;
  organizationName: string;
  workspaceName: string;
}

export const welcomeTemplate = (data: WelcomeEmailData) => ({
  subject: `Welcome to Locus AI, ${data.userName}!`,
  html: `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Welcome to Locus AI</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.05);">
          <tr>
            <td style="padding: 40px;">
              <h1 style="margin: 0 0 24px 0; font-size: 28px; font-weight: 600; color: #111827;">Welcome to Locus AI! 🚀</h1>
              <p style="margin: 0 0 16px 0; font-size: 16px; line-height: 24px; color: #6b7280;">
                Hi <strong>${data.userName}</strong>,
              </p>
              <p style="margin: 0 0 16px 0; font-size: 16px; line-height: 24px; color: #6b7280;">
                Thanks for joining Locus AI! Your account has been successfully created, and your workspace <strong>${data.workspaceName}</strong> in <strong>${data.organizationName}</strong> is ready to go.
              </p>
              <p style="margin: 0 0 32px 0; font-size: 16px; line-height: 24px; color: #6b7280;">
                Locus AI helps you manage projects with AI-powered automation, intelligent task management, and seamless team collaboration.
              </p>
              
              <div style="background-color: #f9fafb; border-left: 4px solid #3b82f6; padding: 16px 20px; margin: 24px 0;">
                <h3 style="margin: 0 0 12px 0; font-size: 16px; font-weight: 600; color: #111827;">Quick Start Guide</h3>
                <ul style="margin: 0; padding-left: 20px; font-size: 14px; line-height: 22px; color: #6b7280;">
                  <li>Create your first sprint</li>
                  <li>Add tasks to your backlog</li>
                  <li>Invite team members to collaborate</li>
                  <li>Let AI agents help you execute tasks</li>
                </ul>
              </div>

              <p style="margin: 24px 0 0 0; font-size: 14px; line-height: 20px; color: #9ca3af;">
                If you have any questions or need help getting started, don't hesitate to reach out to our support team.
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
  text: `Welcome to Locus AI, ${data.userName}!\n\nThanks for joining Locus AI! Your account has been successfully created, and your workspace ${data.workspaceName} in ${data.organizationName} is ready to go.\n\nLocus AI helps you manage projects with AI-powered automation, intelligent task management, and seamless team collaboration.\n\nQuick Start Guide:\n- Create your first sprint\n- Add tasks to your backlog\n- Invite team members to collaborate\n- Let AI agents help you execute tasks\n\nIf you have any questions or need help getting started, don't hesitate to reach out to our support team.`,
});
