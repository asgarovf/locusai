import { createEmailTemplate } from "./email-base.template";

export interface InvitationEmailData {
  inviterName: string;
  organizationName: string;
  token: string;
}

export function createInvitationEmail(data: InvitationEmailData): {
  subject: string;
  html: string;
  text: string;
} {
  const { inviterName, organizationName, token } = data;
  const invitationUrl = `https://locusai.dev/invite?token=${token}`;

  const content = `
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
      <tr>
        <td style="padding-bottom: 16px;">
          <p style="margin: 0 0 12px 0; color: #374151; font-size: 15px; line-height: 1.5;">
            <strong>${inviterName}</strong> has invited you to join their organization on Locus.
          </p>
          <p style="margin: 0; color: #374151; font-size: 15px; line-height: 1.5;">
            Locus is a local-first AI development platform that helps teams manage tasks, documentation, and CI coordination with AI agents.
          </p>
        </td>
      </tr>
      
      <!-- Organization Card -->
      <tr>
        <td style="padding: 16px 0;">
          <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background: linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%); border-radius: 8px; border: 1px solid #bbf7d0;">
            <tr>
              <td style="padding: 16px; text-align: center;">
                <div style="display: inline-block; width: 48px; height: 48px; background-color: #000000; border-radius: 10px; margin-bottom: 12px; line-height: 48px; text-align: center;">
                  <span style="color: #ffffff; font-size: 20px; font-weight: 700;">
                    ${organizationName.charAt(0).toUpperCase()}
                  </span>
                </div>
                <p style="margin: 0; color: #166534; font-size: 18px; font-weight: 600;">
                  ${organizationName}
                </p>
                <p style="margin: 4px 0 0 0; color: #15803d; font-size: 13px;">
                  Organization on Locus
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>

      <!-- What You'll Get -->
      <tr>
        <td style="padding: 16px 0;">
          <p style="margin: 0 0 12px 0; color: #111827; font-size: 16px; font-weight: 600;">
            What you'll get:
          </p>
          
          <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
            <tr>
              <td style="padding: 12px 0;">
                <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                  <tr>
                    <td style="width: 28px; vertical-align: top; padding-top: 2px;">
                      <span style="font-size: 18px;">📋</span>
                    </td>
                    <td style="padding-left: 12px;">
                      <p style="margin: 0; color: #374151; font-size: 14px; line-height: 1.5;">
                        <strong>Collaborative Task Management</strong> - Work together on projects with visual Kanban boards
                      </p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            
            <tr>
              <td style="padding: 12px 0;">
                <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                  <tr>
                    <td style="width: 28px; vertical-align: top; padding-top: 2px;">
                      <span style="font-size: 18px;">📝</span>
                    </td>
                    <td style="padding-left: 12px;">
                      <p style="margin: 0; color: #374151; font-size: 14px; line-height: 1.5;">
                        <strong>Shared Documentation</strong> - Access team docs, specs, and technical designs
                      </p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            
            <tr>
              <td style="padding: 12px 0;">
                <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                  <tr>
                    <td style="width: 28px; vertical-align: top; padding-top: 2px;">
                      <span style="font-size: 18px;">🤖</span>
                    </td>
                    <td style="padding-left: 12px;">
                      <p style="margin: 0; color: #374151; font-size: 14px; line-height: 1.5;">
                        <strong>AI Agent Integration</strong> - Let AI agents help build and manage your projects
                      </p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </td>
      </tr>

      <!-- CTA Button -->
      <tr>
        <td style="padding: 24px 0 16px 0; text-align: center;">
          <a href="${invitationUrl}" style="display: inline-block; background-color: #000000; color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 6px; font-size: 15px; font-weight: 600; box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);">
            Accept Invitation
          </a>
        </td>
      </tr>

      <!-- Expiry Notice -->
      <tr>
        <td style="padding-top: 24px;">
          <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #fef3c7; border-left: 4px solid #f59e0b; border-radius: 6px;">
            <tr>
              <td style="padding: 16px 20px;">
                <p style="margin: 0; color: #92400e; font-size: 14px; line-height: 1.5;">
                  <strong>⏱️ Note:</strong> This invitation will expire in <strong>7 days</strong>. Accept it soon to join the team!
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>

      <!-- Alternative Link -->
      <tr>
        <td style="padding-top: 24px; border-top: 1px solid #e5e7eb;">
          <p style="margin: 0; color: #6b7280; font-size: 14px; line-height: 1.6;">
            If the button doesn't work, copy and paste this link into your browser:
          </p>
          <p style="margin: 8px 0 0 0; word-break: break-all;">
            <a href="${invitationUrl}" style="color: #111827; text-decoration: underline; font-size: 13px;">
              ${invitationUrl}
            </a>
          </p>
        </td>
      </tr>
    </table>
  `;

  const html = createEmailTemplate({
    preheader: `${inviterName} invited you to join ${organizationName} on Locus`,
    title: "You're Invited! 🎉",
    content,
    footerText:
      "You're receiving this email because someone invited you to join their organization on Locus.",
  });

  const text = `
You're Invited to Join ${organizationName} on Locus!

${inviterName} has invited you to join their organization on Locus.

Locus is a local-first AI development platform that helps teams manage tasks, documentation, and CI coordination with AI agents.

Organization: ${organizationName}

What you'll get:
📋 Collaborative Task Management - Work together on projects with visual Kanban boards
📝 Shared Documentation - Access team docs, specs, and technical designs
🤖 AI Agent Integration - Let AI agents help build and manage your projects

Accept your invitation here:
${invitationUrl}

⏱️ Note: This invitation will expire in 7 days. Accept it soon to join the team!

---
Locus - Mission Control for Agentic Engineering
https://locusai.dev
  `.trim();

  return {
    subject: `You've been invited to join ${organizationName} on Locus`,
    html,
    text,
  };
}
