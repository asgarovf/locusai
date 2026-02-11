import { Metadata } from "next";
import Link from "next/link";
import { Footer, Navbar } from "@/components/layout";

export const metadata: Metadata = {
  title: "Terms of Service",
  description:
    "Terms and conditions for using the Locus AI platform and related services.",
};

export default function TermsOfServicePage() {
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
              Terms of Service
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
                  1. Acceptance of Terms
                </h2>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  By accessing or using the Locus AI platform
                  (&quot;Service&quot;), including the cloud dashboard at
                  app.locusai.dev, the CLI tools, and related services, you
                  agree to be bound by these Terms of Service
                  (&quot;Terms&quot;). If you do not agree to these Terms, do
                  not use the Service.
                </p>
              </div>

              <div>
                <h2 className="text-xl font-semibold text-white mb-4">
                  2. Description of Service
                </h2>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Locus is an AI-native project management platform for
                  engineering teams. The Service provides cloud-based sprint
                  planning and task coordination, local AI agent execution via
                  CLI tools, code review capabilities, and integrations with
                  third-party services. Locus is open source and available under
                  the MIT License.
                </p>
              </div>

              <div>
                <h2 className="text-xl font-semibold text-white mb-4">
                  3. Account Registration
                </h2>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  You must create an account to use certain features of the
                  Service. You are responsible for maintaining the
                  confidentiality of your account credentials and for all
                  activity that occurs under your account. You agree to provide
                  accurate and complete information when registering and to keep
                  your account information up to date.
                </p>
              </div>

              <div>
                <h2 className="text-xl font-semibold text-white mb-4">
                  4. Acceptable Use
                </h2>
                <p className="text-sm text-muted-foreground leading-relaxed mb-3">
                  You agree not to:
                </p>
                <ul className="space-y-2 text-sm text-muted-foreground leading-relaxed list-disc list-inside">
                  <li>
                    Use the Service for any unlawful purpose or in violation of
                    any applicable laws
                  </li>
                  <li>
                    Attempt to gain unauthorized access to the Service or its
                    related systems
                  </li>
                  <li>
                    Interfere with or disrupt the integrity or performance of
                    the Service
                  </li>
                  <li>
                    Use the Service to transmit malicious code, malware, or
                    harmful content
                  </li>
                  <li>
                    Resell, sublicense, or redistribute access to the hosted
                    Service without authorization
                  </li>
                  <li>
                    Abuse API rate limits or attempt to circumvent usage
                    restrictions
                  </li>
                </ul>
              </div>

              <div>
                <h2 className="text-xl font-semibold text-white mb-4">
                  5. Your Content and Data
                </h2>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  You retain all rights to your content, including source code,
                  tasks, documentation, and other materials you create or
                  upload. By using the Service, you grant Locus a limited
                  license to store and process your workspace data solely for
                  the purpose of providing the Service. Source code processed by
                  AI agents remains on your local machine and is never
                  transmitted to Locus servers.
                </p>
              </div>

              <div>
                <h2 className="text-xl font-semibold text-white mb-4">
                  6. AI Agent Execution
                </h2>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  AI agents run locally on your machine using your own AI
                  provider credentials. You are responsible for the output
                  generated by AI agents, including any code changes, pull
                  requests, or commits. You should review all agent-generated
                  output before merging or deploying. Locus is not responsible
                  for the quality, correctness, or security of AI-generated
                  code.
                </p>
              </div>

              <div>
                <h2 className="text-xl font-semibold text-white mb-4">
                  7. Third-Party Services
                </h2>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  The Service integrates with third-party services including AI
                  providers (Anthropic, OpenAI), git hosting platforms (GitHub,
                  GitLab, Bitbucket), and messaging platforms (Telegram). Your
                  use of these services is governed by their respective terms
                  and privacy policies. Locus is not responsible for the
                  availability, accuracy, or practices of third-party services.
                </p>
              </div>

              <div>
                <h2 className="text-xl font-semibold text-white mb-4">
                  8. API Keys and Credentials
                </h2>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  You are responsible for safeguarding your Locus API keys and
                  any third-party credentials used with the Service. API keys
                  should be treated as sensitive information. You can revoke and
                  regenerate API keys from your workspace settings at any time.
                  Locus is not liable for unauthorized use resulting from
                  compromised credentials.
                </p>
              </div>

              <div>
                <h2 className="text-xl font-semibold text-white mb-4">
                  9. Open Source License
                </h2>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  The Locus software is released under the MIT License. You are
                  free to use, modify, and distribute the software in accordance
                  with the license terms. These Terms of Service apply
                  specifically to the hosted Service at app.locusai.dev. If you
                  self-host Locus, the MIT License governs your use of the
                  software.
                </p>
              </div>

              <div>
                <h2 className="text-xl font-semibold text-white mb-4">
                  10. Limitation of Liability
                </h2>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  The Service is provided &quot;as is&quot; and &quot;as
                  available&quot; without warranties of any kind, either express
                  or implied. To the fullest extent permitted by law, Locus
                  shall not be liable for any indirect, incidental, special,
                  consequential, or punitive damages, including but not limited
                  to loss of profits, data, or business opportunities arising
                  from your use of the Service.
                </p>
              </div>

              <div>
                <h2 className="text-xl font-semibold text-white mb-4">
                  11. Account Termination
                </h2>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  You may delete your account at any time from your dashboard
                  settings. We reserve the right to suspend or terminate
                  accounts that violate these Terms. Upon termination, your
                  right to use the Service ceases immediately. Data associated
                  with terminated accounts will be deleted in accordance with
                  our{" "}
                  <Link href="/privacy" className="text-violet hover:underline">
                    Privacy Policy
                  </Link>
                  .
                </p>
              </div>

              <div>
                <h2 className="text-xl font-semibold text-white mb-4">
                  12. Changes to These Terms
                </h2>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  We may update these Terms from time to time. We will notify
                  you of any material changes by posting the updated Terms on
                  this page and updating the &quot;Last updated&quot; date.
                  Continued use of the Service after changes constitutes
                  acceptance of the revised Terms.
                </p>
              </div>

              <div>
                <h2 className="text-xl font-semibold text-white mb-4">
                  13. Contact
                </h2>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  If you have questions about these Terms, please reach out via{" "}
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
