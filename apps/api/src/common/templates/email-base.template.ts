/**
 * Base email template with consistent branding
 * Uses inline styles for maximum email client compatibility
 */

export interface EmailTemplateOptions {
  preheader?: string;
  title: string;
  content: string;
  footerText?: string;
}

export function createEmailTemplate(options: EmailTemplateOptions): string {
  const {
    preheader = "",
    title,
    content,
    footerText = "You're receiving this email because you have an account with Locus.",
  } = options;

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>${title}</title>
  <!--[if mso]>
  <noscript>
    <xml>
      <o:OfficeDocumentSettings>
        <o:PixelsPerInch>96</o:PixelsPerInch>
      </o:OfficeDocumentSettings>
    </xml>
  </noscript>
  <![endif]-->
  <style>
    body {
      margin: 0;
      padding: 0;
      -webkit-text-size-adjust: 100%;
      -ms-text-size-adjust: 100%;
    }
    table {
      border-collapse: collapse;
      mso-table-lspace: 0pt;
      mso-table-rspace: 0pt;
    }
    img {
      border: 0;
      height: auto;
      line-height: 100%;
      outline: none;
      text-decoration: none;
      -ms-interpolation-mode: bicubic;
    }
    @media only screen and (max-width: 600px) {
      .container {
        width: 100% !important;
        padding: 20px !important;
      }
      .content {
        padding: 30px 20px !important;
      }
    }
  </style>
</head>
<body style="margin: 0; padding: 0; background-color: #0a0a0a; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
  <!-- Preheader text -->
  <div style="display: none; max-height: 0; overflow: hidden; mso-hide: all;">
    ${preheader}
  </div>

  <!-- Main container -->
  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #0a0a0a;">
    <tr>
      <td style="padding: 20px;">
        <!-- Email wrapper -->
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="600" class="container" style="margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
          
          <!-- Header with brand -->
          <tr>
            <td style="padding: 24px 24px 16px 24px; text-align: center;">
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                <tr>
                  <td style="text-align: center;">
                    <h1 style="margin: 0; color: #111827; font-size: 24px; font-weight: 600; line-height: 1.3;">
                      ${title}
                    </h1>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td class="content" style="padding: 24px;">
              ${content}
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f9fafb; padding: 24px; border-top: 1px solid #e5e7eb;">
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                <tr>
                  <td style="padding-bottom: 16px;">
                    <p style="margin: 0; color: #6b7280; font-size: 14px; line-height: 1.5;">
                      ${footerText}
                    </p>
                  </td>
                </tr>
                <tr>
                  <td>
                    <p style="margin: 0; color: #9ca3af; font-size: 12px; line-height: 1.5;">
                      <strong>Locus</strong> - Mission Control for Agentic Engineering<br>
                      <a href="https://locusai.dev" style="color: #111827; text-decoration: underline;">locusai.dev</a>
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}
