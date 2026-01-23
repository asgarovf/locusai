# Email Templates

This directory contains branded email templates for Locus. All templates follow consistent design patterns and are optimized for maximum email client compatibility.

## 📧 Available Templates

### 1. OTP Email (`otp-email.template.ts`)
Sends verification codes for authentication.

**Features:**
- Large, prominent OTP code display
- Expiry time warning
- Security tips
- Monospace font for code readability

**Usage:**
```typescript
import { createOtpEmail } from '@/common/templates';

const emailContent = createOtpEmail({
  otp: '123456',
  expiryMinutes: 10
});
```

### 2. Welcome Email (`welcome-email.template.ts`)
Sent to new users after registration.

**Features:**
- Personalized greeting
- Workspace details card
- Quick start guide with numbered steps
- Call-to-action button
- Helpful resources links

**Usage:**
```typescript
import { createWelcomeEmail } from '@/common/templates';

const emailContent = createWelcomeEmail({
  userName: 'John Doe',
  organizationName: 'Acme Corp',
  workspaceName: 'General'
});
```

### 3. Invitation Email (`invitation-email.template.ts`)
Sent when users are invited to join an organization.

**Features:**
- Organization card with initial
- Feature highlights
- Prominent accept button
- Expiry notice (7 days)
- Alternative link fallback

**Usage:**
```typescript
import { createInvitationEmail } from '@/common/templates';

const emailContent = createInvitationEmail({
  inviterName: 'Jane Smith',
  organizationName: 'Acme Corp',
  token: 'abc123...'
});
```

## 🎨 Design System

### Colors
- **Primary Blue**: `#3b82f6` (gradient with `#2563eb`)
- **Background**: `#0a0a0a` (outer), `#ffffff` (content)
- **Text**: `#374151` (body), `#111827` (headings), `#6b7280` (muted)
- **Success**: `#f0fdf4` background with `#166534` text
- **Warning**: `#fef3c7` background with `#92400e` text

### Typography
- **Font Stack**: `-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif`
- **Headings**: 28px (h1), 18-20px (h2)
- **Body**: 16px (primary), 14px (secondary)

### Spacing
- **Container Width**: 600px (responsive on mobile)
- **Padding**: 40px (desktop), 20px (mobile)
- **Border Radius**: 12px (cards), 8px (buttons)

## 🏗 Architecture

### Base Template (`email-base.template.ts`)
All email templates extend the base template which provides:
- Consistent header with Locus branding
- Responsive container
- Footer with company info
- Email client compatibility fixes
- MSO (Outlook) conditional comments

### Template Structure
```
┌─────────────────────────────────┐
│         Header (Blue)           │
│  Logo + Title                   │
├─────────────────────────────────┤
│                                 │
│         Content Area            │
│  (Passed as parameter)          │
│                                 │
├─────────────────────────────────┤
│      Footer (Light Gray)        │
│  Footer text + Links            │
└─────────────────────────────────┘
```

## 📱 Email Client Compatibility

Templates are tested and optimized for:
- ✅ Gmail (Web, iOS, Android)
- ✅ Apple Mail (macOS, iOS)
- ✅ Outlook (Web, Desktop, Mobile)
- ✅ Yahoo Mail
- ✅ ProtonMail
- ✅ Thunderbird

### Compatibility Features
- Inline CSS (no external stylesheets)
- Table-based layout (not CSS Grid/Flexbox)
- MSO conditional comments for Outlook
- Responsive design with media queries
- Fallback fonts
- Alt text for images

## 🔧 Adding New Templates

1. Create a new file: `your-template.template.ts`
2. Define the data interface:
```typescript
export interface YourTemplateData {
  field1: string;
  field2: number;
}
```

3. Create the template function:
```typescript
import { createEmailTemplate } from "./email-base.template";

export function createYourTemplate(data: YourTemplateData): {
  subject: string;
  html: string;
  text: string;
} {
  const content = `
    <!-- Your HTML content here -->
  `;

  const html = createEmailTemplate({
    preheader: "Preview text",
    title: "Email Title",
    content,
  });

  const text = `Plain text version`;

  return { subject: "Email Subject", html, text };
}
```

4. Export from `index.ts`:
```typescript
export * from "./your-template.template";
```

5. Use in EmailService:
```typescript
import { createYourTemplate } from "../templates";

async sendYourEmail(email: string, data: YourTemplateData) {
  const emailContent = createYourTemplate(data);
  await this.resend.emails.send({
    from: "Locus <noreply@locusai.dev>",
    to: email,
    subject: emailContent.subject,
    html: emailContent.html,
    text: emailContent.text,
  });
}
```

## 🧪 Testing

To test email templates locally:

1. **Use Resend's preview mode** (if available)
2. **Send to test email accounts** across different providers
3. **Check responsive design** by resizing browser window
4. **Verify text version** is readable and well-formatted

## 📝 Best Practices

- ✅ Always provide both HTML and plain text versions
- ✅ Use inline styles (email clients strip `<style>` tags)
- ✅ Keep total email size under 100KB
- ✅ Use descriptive alt text for images
- ✅ Test across multiple email clients
- ✅ Include unsubscribe links for marketing emails
- ✅ Use preheader text for better inbox preview
- ❌ Don't use JavaScript
- ❌ Don't use external CSS files
- ❌ Don't use CSS Grid or Flexbox
- ❌ Don't use background images (limited support)

## 🔗 Resources

- [Email Client CSS Support](https://www.caniemail.com/)
- [Resend Documentation](https://resend.com/docs)
- [HTML Email Best Practices](https://www.campaignmonitor.com/dev-resources/guides/coding/)
