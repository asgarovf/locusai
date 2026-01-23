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
  const invitationUrl = `https://app.locusai.dev/invite?token=${token}`;

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
      <!-- Organization Info -->
      <tr>
        <td style="padding: 16px 0;">
          <h2 style="margin: 0; color: #111827; font-size: 20px; font-weight: 600;">
            ${organizationName}
          </h2>
          <p style="margin: 4px 0 0 0; color: #6b7280; font-size: 14px;">
            Organization on Locus
          </p>
        </td>
      </tr>

      <!-- What You'll Get -->
      <tr>
        <td style="padding: 16px 0;">
          <p style="margin: 0 0 12px 0; color: #111827; font-size: 15px; font-weight: 600;">
            What you'll get:
          </p>
          <ul style="margin: 0; padding-left: 20px; color: #4b5563; font-size: 14px; line-height: 1.6;">
            <li style="margin-bottom: 8px;">
              <strong>Collaborative Task Management</strong> - Work together on projects with visual Kanban boards
            </li>
            <li style="margin-bottom: 8px;">
              <strong>Shared Documentation</strong> - Access team docs, specs, and technical designs
            </li>
            <li>
              <strong>AI Agent Integration</strong> - Let AI agents help build and manage your projects
            </li>
          </ul>
        </td>
      </tr>

      <!-- CTA Button -->
      <tr>
        <td style="padding: 24px 0 16px 0;">
          <a href="${invitationUrl}" style="display: inline-block; background-color: #111827; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 6px; font-size: 14px; font-weight: 500;">
            Accept Invitation
          </a>
        </td>
      </tr>

      <!-- Expiry Notice -->
      <tr>
        <td style="padding-top: 16px;">
          <p style="margin: 0; color: #6b7280; font-size: 13px; line-height: 1.5;">
            Note: This invitation will expire in 7 days.
          </p>
        </td>
      </tr>

      <!-- Alternative Link -->
      <tr>
        <td style="padding-top: 24px; border-top: 1px solid #e5e7eb;">
          <p style="margin: 0; color: #6b7280; font-size: 13px; line-height: 1.6;">
            Or copy and paste this link:
          </p>
          <p style="margin: 4px 0 0 0; word-break: break-all;">
            <a href="${invitationUrl}" style="color: #6b7280; text-decoration: underline; font-size: 13px;">
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
