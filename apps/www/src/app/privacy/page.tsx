import { Metadata } from "next";
import Link from "next/link";
import { Footer, Navbar } from "@/components/layout";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description:
    "How Locus AI handles your data, what we collect, and how we protect your privacy.",
  alternates: {
    canonical: "https://locusai.dev/privacy",
  },
  openGraph: {
    url: "https://locusai.dev/privacy",
  },
};

export default function PrivacyPolicyPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="flex-1">
        {/* Hero */}
        <section className="relative pt-36 pb-20 md:pt-44 md:pb-28 overflow-hidden">
          <div className="mesh-gradient-hero absolute inset-0" />
          <div className="max-w-4xl px-6 mx-auto relative text-center">
            <p className="text-xs font-medium tracking-[0.2em] uppercase text-violet mb-4">
              Legal
            </p>
            <h1 className="text-4xl md:text-6xl font-bold tracking-tight text-white mb-6">
              Privacy Policy
            </h1>
            <p className="text-base md:text-lg text-muted-foreground max-w-xl mx-auto leading-relaxed">
              Last updated: January 29, 2026
            </p>
          </div>
        </section>

        {/* Content */}
        <section className="pb-28 relative">
          <div className="max-w-3xl px-6 mx-auto">
            <div className="space-y-12">
              <div>
                <h2 className="text-xl font-semibold text-white mb-4">
                  1. Introduction
                </h2>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Locus AI (&quot;Locus&quot;, &quot;we&quot;, &quot;us&quot;,
                  or &quot;our&quot;) operates the Locus platform, including the
                  cloud dashboard at app.locusai.dev, the CLI tools, and related
                  services. This Privacy Policy explains how we collect, use,
                  disclose, and safeguard your information when you use our
                  platform.
                </p>
              </div>

              <div>
                <h2 className="text-xl font-semibold text-white mb-4">
                  2. Information We Collect
                </h2>
                <div className="space-y-6">
                  <div>
                    <h3 className="text-base font-medium text-white mb-2">
                      Account Information
                    </h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      When you create an account, we collect your email address,
                      name, user role, organization name, and team size. If you
                      sign in via Google OAuth, we receive your name and email
                      address from Google.
                    </p>
                  </div>
                  <div>
                    <h3 className="text-base font-medium text-white mb-2">
                      Workspace and Project Data
                    </h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      We store workspace configurations, sprint definitions,
                      task specifications (titles, descriptions, priorities,
                      statuses, labels, acceptance criteria), documentation,
                      comments, and team collaboration data that you create
                      within the Locus dashboard.
                    </p>
                  </div>
                  <div>
                    <h3 className="text-base font-medium text-white mb-2">
                      Agent and Execution Metadata
                    </h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      When you run AI agents via the CLI, we collect agent
                      registration data, heartbeat status, task assignment
                      events, and pull request URLs. We do not collect your
                      source code, AI prompts, or AI-generated output &mdash;
                      these remain entirely on your local machine.
                    </p>
                  </div>
                  <div>
                    <h3 className="text-base font-medium text-white mb-2">
                      Usage Data
                    </h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      We may collect information about how you interact with our
                      platform, including pages visited, features used, and
                      general usage patterns. We use Google Analytics on our
                      marketing site for aggregated analytics.
                    </p>
                  </div>
                </div>
              </div>

              <div>
                <h2 className="text-xl font-semibold text-white mb-4">
                  3. Information We Do Not Collect
                </h2>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Locus is designed with a local-first architecture. The
                  following data never passes through Locus servers:
                </p>
                <ul className="mt-3 space-y-2 text-sm text-muted-foreground leading-relaxed list-disc list-inside">
                  <li>Your source code and repository contents</li>
                  <li>
                    AI provider credentials (Claude API keys, Codex API keys)
                  </li>
                  <li>AI prompts and AI-generated responses</li>
                  <li>Local file system contents accessed by agents</li>
                  <li>Git diffs, patches, or code review content</li>
                </ul>
              </div>

              <div>
                <h2 className="text-xl font-semibold text-white mb-4">
                  4. How We Use Your Information
                </h2>
                <ul className="space-y-2 text-sm text-muted-foreground leading-relaxed list-disc list-inside">
                  <li>
                    To provide and maintain the Locus platform and its features
                  </li>
                  <li>To manage your account and workspace access</li>
                  <li>
                    To coordinate task assignments and sprint planning between
                    your dashboard and local agents
                  </li>
                  <li>
                    To send transactional emails (verification codes, workspace
                    invitations)
                  </li>
                  <li>To improve and optimize the platform</li>
                  <li>To respond to support inquiries</li>
                </ul>
              </div>

              <div>
                <h2 className="text-xl font-semibold text-white mb-4">
                  5. Third-Party Services
                </h2>
                <p className="text-sm text-muted-foreground leading-relaxed mb-3">
                  Your use of the following third-party services is governed by
                  their respective privacy policies:
                </p>
                <ul className="space-y-2 text-sm text-muted-foreground leading-relaxed list-disc list-inside">
                  <li>
                    <strong className="text-white">AI Providers</strong>{" "}
                    (Anthropic Claude, OpenAI Codex) &mdash; Your code and
                    prompts are sent directly from your machine to your chosen
                    AI provider. Locus does not intermediate these requests.
                  </li>
                  <li>
                    <strong className="text-white">
                      GitHub / GitLab / Bitbucket
                    </strong>{" "}
                    &mdash; Git operations and PR creation happen directly
                    between your machine and your git provider.
                  </li>
                  <li>
                    <strong className="text-white">Google OAuth</strong> &mdash;
                    If you choose to sign in with Google, your authentication is
                    handled by Google&apos;s OAuth service.
                  </li>
                  <li>
                    <strong className="text-white">Telegram</strong> &mdash; If
                    you configure the Telegram bot integration, commands are
                    exchanged via the Telegram Bot API.
                  </li>
                  <li>
                    <strong className="text-white">Google Analytics</strong>{" "}
                    &mdash; We use Google Analytics on our marketing website for
                    aggregated usage statistics.
                  </li>
                </ul>
              </div>

              <div>
                <h2 className="text-xl font-semibold text-white mb-4">
                  6. Data Storage and Security
                </h2>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Cloud-stored data (account information, workspace data, task
                  metadata) is stored on secure infrastructure. We implement
                  appropriate technical and organizational measures to protect
                  your information. API keys for accessing the Locus API are
                  generated per-workspace and can be revoked at any time from
                  your dashboard settings.
                </p>
              </div>

              <div>
                <h2 className="text-xl font-semibold text-white mb-4">
                  7. Self-Hosting
                </h2>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Locus is open source and can be self-hosted. When you
                  self-host, all data remains on your own infrastructure and no
                  data is sent to Locus servers. This privacy policy applies
                  only to the hosted version of Locus at app.locusai.dev.
                </p>
              </div>

              <div>
                <h2 className="text-xl font-semibold text-white mb-4">
                  8. Data Retention
                </h2>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  We retain your account and workspace data for as long as your
                  account is active. You can delete your account and associated
                  data from your dashboard settings. Upon account deletion, your
                  personal data will be removed from our systems within 30 days.
                </p>
              </div>

              <div>
                <h2 className="text-xl font-semibold text-white mb-4">
                  9. Your Rights
                </h2>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  You have the right to access, correct, or delete your personal
                  information. You can manage most of this directly from your
                  dashboard settings. For additional requests, contact us via
                  GitHub Issues or email.
                </p>
              </div>

              <div>
                <h2 className="text-xl font-semibold text-white mb-4">
                  10. Changes to This Policy
                </h2>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  We may update this Privacy Policy from time to time. We will
                  notify you of any material changes by posting the new policy
                  on this page and updating the &quot;Last updated&quot; date.
                </p>
              </div>

              <div>
                <h2 className="text-xl font-semibold text-white mb-4">
                  11. Contact
                </h2>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  If you have questions about this Privacy Policy, please reach
                  out via{" "}
                  <Link
                    href="https://github.com/asgarovf/locusai/issues"
                    target="_blank"
                    className="text-violet hover:underline"
                  >
                    GitHub Issues
                  </Link>
                  .
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
