import { Metadata } from "next";
import Link from "next/link";
import { Footer, Navbar } from "@/components/layout";

export const metadata: Metadata = {
  title: "Terms of Service",
  description:
    "Terms and conditions for using the Locus AI CLI tool and related services.",
  alternates: {
    canonical: "https://locusai.dev/terms",
  },
  openGraph: {
    url: "https://locusai.dev/terms",
  },
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
              Last updated: February 24, 2026
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
                  By using the Locus AI CLI tool (&quot;Software&quot;),
                  including the npm package, documentation, and this website,
                  you agree to be bound by these Terms of Service
                  (&quot;Terms&quot;). If you do not agree to these Terms, do
                  not use the Software.
                </p>
              </div>

              <div>
                <h2 className="text-xl font-semibold text-white mb-4">
                  2. Description of Software
                </h2>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Locus is a GitHub-native AI engineering CLI tool. It helps
                  developers plan sprints, execute tasks with AI agents, review
                  code, and iterate on feedback — all using GitHub as the
                  backend. The Software runs entirely on your local machine and
                  has no cloud backend or server-side component. Locus is open
                  source and available under the MIT License.
                </p>
              </div>

              <div>
                <h2 className="text-xl font-semibold text-white mb-4">
                  3. No Account Required
                </h2>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Locus does not require account registration. Authentication is
                  handled via the GitHub CLI (gh auth login) and your AI
                  provider credentials. You are responsible for securing your
                  own GitHub tokens and AI provider API keys.
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
                    Use the Software for any unlawful purpose or in violation of
                    any applicable laws
                  </li>
                  <li>
                    Use the Software to generate malicious code, malware, or
                    harmful content
                  </li>
                  <li>
                    Abuse GitHub API rate limits or attempt to circumvent usage
                    restrictions
                  </li>
                  <li>
                    Misrepresent AI-generated code as entirely human-written in
                    contexts where disclosure is required
                  </li>
                </ul>
              </div>

              <div>
                <h2 className="text-xl font-semibold text-white mb-4">
                  5. Your Content and Data
                </h2>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  You retain all rights to your content, including source code,
                  GitHub issues, and other materials. The Software processes
                  your data locally on your machine. Your code is sent directly
                  to your chosen AI provider (Anthropic or OpenAI) — Locus does
                  not intermediate, store, or have access to this data.
                </p>
              </div>

              <div>
                <h2 className="text-xl font-semibold text-white mb-4">
                  6. AI Agent Output
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
                  The Software interacts with third-party services including AI
                  providers (Anthropic, OpenAI) and GitHub. Your use of these
                  services is governed by their respective terms and privacy
                  policies. Locus is not responsible for the availability,
                  accuracy, or practices of third-party services.
                </p>
              </div>

              <div>
                <h2 className="text-xl font-semibold text-white mb-4">
                  8. Open Source License
                </h2>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  The Locus software is released under the MIT License. You are
                  free to use, modify, and distribute the software in accordance
                  with the license terms. These Terms of Service apply to the
                  use of the Software and this website.
                </p>
              </div>

              <div>
                <h2 className="text-xl font-semibold text-white mb-4">
                  9. Limitation of Liability
                </h2>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  The Software is provided &quot;as is&quot; and &quot;as
                  available&quot; without warranties of any kind, either express
                  or implied. To the fullest extent permitted by law, Locus
                  shall not be liable for any indirect, incidental, special,
                  consequential, or punitive damages, including but not limited
                  to loss of profits, data, or business opportunities arising
                  from your use of the Software.
                </p>
              </div>

              <div>
                <h2 className="text-xl font-semibold text-white mb-4">
                  10. Changes to These Terms
                </h2>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  We may update these Terms from time to time. We will notify
                  you of any material changes by posting the updated Terms on
                  this page and updating the &quot;Last updated&quot; date.
                </p>
              </div>

              <div>
                <h2 className="text-xl font-semibold text-white mb-4">
                  11. Contact
                </h2>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  If you have questions about these Terms, please reach out via{" "}
                  <Link
                    href="https://github.com/asgarovf/locusai/issues"
                    target="_blank"
                    rel="noopener noreferrer"
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
