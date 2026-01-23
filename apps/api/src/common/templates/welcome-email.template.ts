import { createEmailTemplate } from "./email-base.template";

export interface WelcomeEmailData {
  userName: string;
  organizationName: string;
  workspaceName: string;
}

export function createWelcomeEmail(data: WelcomeEmailData): {
  subject: string;
  html: string;
  text: string;
} {
  const { userName, organizationName, workspaceName } = data;

  const content = `
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
      <tr>
        <td style="padding-bottom: 20px;">
          <p style="margin: 0 0 12px 0; color: #374151; font-size: 15px; line-height: 1.6;">
            Hi <strong>${userName}</strong>,
          </p>
          <p style="margin: 0; color: #374151; font-size: 15px; line-height: 1.6;">
            Welcome to <strong>Locus</strong>! 🎉 We're excited to have you on board. Your workspace is ready and you can start building with AI agents right away.
          </p>
        </td>
      </tr>
      
      <!-- Workspace Info Card -->
      <tr>
        <td style="padding: 16px 0;">
          <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #f9fafb; border-radius: 8px; border: 1px solid #e5e7eb;">
            <tr>
              <td style="padding: 16px;">
                <p style="margin: 0 0 12px 0; color: #111827; font-size: 13px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">
                  Your Workspace Details
                </p>
                <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                  <tr>
                    <td style="padding: 4px 0;">
                      <p style="margin: 0; color: #4b5563; font-size: 13px;">
                        <strong>Organization:</strong> <span style="color: #111827; font-weight: 600;">${organizationName}</span>
                      </p>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding: 4px 0;">
                      <p style="margin: 0; color: #4b5563; font-size: 13px;">
                        <strong>Workspace:</strong> <span style="color: #111827; font-weight: 600;">${workspaceName}</span>
                      </p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </td>
      </tr>

      <!-- Quick Start Guide -->
      <tr>
        <td style="padding: 24px 0;">
          <p style="margin: 0 0 16px 0; color: #111827; font-size: 18px; font-weight: 600;">
            🚀 Quick Start Guide
          </p>
          
          <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
            <tr>
              <td style="padding: 16px 0;">
                <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                  <tr>
                    <td style="width: 32px; vertical-align: top; padding-top: 2px;">
                      <div style="width: 24px; height: 24px; background-color: #000000; border-radius: 50%; color: #ffffff; text-align: center; line-height: 24px; font-size: 12px; font-weight: 600;">1</div>
                    </td>
                    <td style="padding-left: 12px;">
                      <p style="margin: 0 0 4px 0; color: #111827; font-size: 15px; font-weight: 600;">
                        Create Your First Task
                      </p>
                      <p style="margin: 0; color: #6b7280; font-size: 14px; line-height: 1.5;">
                        Use the Kanban board to organize your work and track progress
                      </p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            
            <tr>
              <td style="padding: 16px 0;">
                <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                  <tr>
                    <td style="width: 32px; vertical-align: top; padding-top: 2px;">
                      <div style="width: 24px; height: 24px; background-color: #000000; border-radius: 50%; color: #ffffff; text-align: center; line-height: 24px; font-size: 12px; font-weight: 600;">2</div>
                    </td>
                    <td style="padding-left: 12px;">
                      <p style="margin: 0 0 4px 0; color: #111827; font-size: 15px; font-weight: 600;">
                        Write Documentation
                      </p>
                      <p style="margin: 0; color: #6b7280; font-size: 14px; line-height: 1.5;">
                        Keep your technical docs and specs in one place
                      </p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            
            <tr>
              <td style="padding: 16px 0;">
                <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                  <tr>
                    <td style="width: 32px; vertical-align: top; padding-top: 2px;">
                      <div style="width: 24px; height: 24px; background-color: #000000; border-radius: 50%; color: #ffffff; text-align: center; line-height: 24px; font-size: 12px; font-weight: 600;">3</div>
                    </td>
                    <td style="padding-left: 12px;">
                      <p style="margin: 0 0 4px 0; color: #111827; font-size: 15px; font-weight: 600;">
                        Connect AI Agents
                      </p>
                      <p style="margin: 0; color: #6b7280; font-size: 14px; line-height: 1.5;">
                        Use MCP tools to let Claude, Cursor, and other agents manage your project
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
          <a href="https://locusai.dev/board" style="display: inline-block; background-color: #000000; color: #ffffff; text-decoration: none; padding: 12px 28px; border-radius: 6px; font-size: 15px; font-weight: 600; box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);">
            Open Dashboard
          </a>
        </td>
      </tr>

      <!-- Resources -->
      <tr>
        <td style="padding-top: 24px; border-top: 1px solid #e5e7eb;">
          <p style="margin: 0 0 12px 0; color: #6b7280; font-size: 14px; line-height: 1.6;">
            <strong>Helpful Resources:</strong>
          </p>
          <ul style="margin: 0; padding-left: 20px; color: #6b7280; font-size: 14px; line-height: 1.6;">
            <li style="margin-bottom: 8px;">
              <a href="https://locusai.dev/docs" style="color: #111827; text-decoration: underline;">Documentation</a> - Learn how to use Locus
            </li>
            <li style="margin-bottom: 8px;">
              <a href="https://github.com/asgarovf/locusai" style="color: #111827; text-decoration: underline;">GitHub</a> - View source code and contribute
            </li>
            <li>
              <a href="https://locusai.dev/docs/mcp" style="color: #111827; text-decoration: underline;">MCP Integration</a> - Connect your AI agents
            </li>
          </ul>
        </td>
      </tr>
    </table>
  `;

  const html = createEmailTemplate({
    preheader: `Welcome to Locus! Your workspace ${workspaceName} is ready.`,
    title: "Welcome to Locus! 🎉",
    content,
    footerText:
      "You're receiving this email because you just created a Locus account.",
  });

  const text = `
Welcome to Locus!

Hi ${userName},

Welcome to Locus! 🎉 We're excited to have you on board. Your workspace is ready and you can start building with AI agents right away.

Your Workspace Details:
- Organization: ${organizationName}
- Workspace: ${workspaceName}

Quick Start Guide:

1. Create Your First Task
   Use the Kanban board to organize your work and track progress

2. Write Documentation
   Keep your technical docs and specs in one place

3. Connect AI Agents
   Use MCP tools to let Claude, Cursor, and other agents manage your project

Get Started: https://locusai.dev/board

Helpful Resources:
- Documentation: https://locusai.dev/docs
- GitHub: https://github.com/asgarovf/locusai
- MCP Integration: https://locusai.dev/docs/mcp

---
Locus - Mission Control for Agentic Engineering
https://locusai.dev
  `.trim();

  return {
    subject: "Welcome to Locus! 🎉",
    html,
    text,
  };
}
