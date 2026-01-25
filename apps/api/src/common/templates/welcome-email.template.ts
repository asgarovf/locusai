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
      <!-- Workspace Info -->
      <tr>
        <td style="padding: 16px 0;">
          <h2 style="margin: 0 0 12px 0; color: #111827; font-size: 14px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">
            Your Workspace Details
          </h2>
          <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
            <tr>
              <td style="padding: 4px 0;">
                <p style="margin: 0; color: #4b5563; font-size: 14px;">
                  <span style="color: #6b7280;">Organization:</span> <span style="color: #111827; font-weight: 500;">${organizationName}</span>
                </p>
              </td>
            </tr>
            <tr>
              <td style="padding: 4px 0;">
                <p style="margin: 0; color: #4b5563; font-size: 14px;">
                  <span style="color: #6b7280;">Workspace:</span> <span style="color: #111827; font-weight: 500;">${workspaceName}</span>
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>

      <!-- Quick Start Guide -->
      <tr>
        <td style="padding: 24px 0;">
          <p style="margin: 0 0 16px 0; color: #111827; font-size: 16px; font-weight: 600;">
            Quick Start Guide
          </p>
          
          <ul style="margin: 0; padding-left: 20px; color: #4b5563; font-size: 14px; line-height: 1.6;">
            <li style="margin-bottom: 12px;">
              <strong style="color: #111827;">Create Your First Task</strong><br>
              Use the Kanban board to organize your work and track progress
            </li>
            <li style="margin-bottom: 12px;">
              <strong style="color: #111827;">Write Documentation</strong><br>
              Keep your technical docs and specs in one place
            </li>
            <li>
              <strong style="color: #111827;">Connect AI Agents</strong><br>
              Use MCP tools to let Claude, Cursor, and other agents manage your project
            </li>
          </ul>
        </td>
      </tr>

      <!-- CTA Button -->
      <tr>
        <td style="padding: 16px 0;">
          <a href="https://app.locusai.dev/board" style="display: inline-block; background-color: #111827; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 6px; font-size: 14px; font-weight: 500;">
            Open Dashboard
          </a>
        </td>
      </tr>

      <!-- Resources -->
      <tr>
        <td style="padding-top: 24px; border-top: 1px solid #e5e7eb;">
          <p style="margin: 0 0 8px 0; color: #6b7280; font-size: 13px; font-weight: 600;">
            Helpful Resources
          </p>
          <ul style="margin: 0; padding-left: 20px; color: #6b7280; font-size: 13px; line-height: 1.6;">
            <li style="margin-bottom: 4px;">
              <a href="https://locusai.dev/docs" style="color: #6b7280; text-decoration: underline;">Documentation</a>
            </li>
            <li style="margin-bottom: 4px;">
              <a href="https://github.com/asgarovf/locusai" style="color: #6b7280; text-decoration: underline;">GitHub</a>
            </li>
            <li>
              <a href="https://locusai.dev/docs/mcp" style="color: #6b7280; text-decoration: underline;">MCP Integration</a>
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

Get Started: https://app.locusai.dev/board

Helpful Resources:
- Documentation: https://locusai.dev/docs
- GitHub: https://github.com/asgarovf/locusai
- MCP Integration: https://locusai.dev/docs/mcp

---
Locus - Mission Control for AI Engineering Teams
https://locusai.dev
  `.trim();

  return {
    subject: "Welcome to Locus! 🎉",
    html,
    text,
  };
}
