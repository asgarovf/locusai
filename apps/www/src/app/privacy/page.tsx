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
                  1. Introduction
                </h2>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Locus AI (&quot;Locus&quot;, &quot;we&quot;, &quot;us&quot;,
                  or &quot;our&quot;) develops the Locus CLI tool and this
                  website (locusai.dev). This Privacy Policy explains how we
                  handle your information. Locus is a local-first, GitHub-native
                  tool — it has no cloud backend, no user accounts, and no
                  server-side data storage.
                </p>
              </div>

              <div>
                <h2 className="text-xl font-semibold text-white mb-4">
                  2. Information We Do Not Collect
                </h2>
                <p className="text-sm text-muted-foreground leading-relaxed mb-3">
                  Locus is designed to be fully local. The following data never
                  passes through any Locus server:
                </p>
                <ul className="space-y-2 text-sm text-muted-foreground leading-relaxed list-disc list-inside">
                  <li>Your source code and repository contents</li>
                  <li>
                    AI provider credentials (Anthropic API keys, OpenAI API
                    keys)
                  </li>
                  <li>AI prompts and AI-generated responses</li>
                  <li>GitHub tokens or authentication data</li>
                  <li>Local file system contents accessed by agents</li>
                  <li>Git diffs, patches, or code review content</li>
                  <li>
                    Your GitHub issues, milestones, labels, or pull requests
                  </li>
                </ul>
              </div>

              <div>
                <h2 className="text-xl font-semibold text-white mb-4">
                  3. Information We May Collect
                </h2>
                <div className="space-y-6">
                  <div>
                    <h3 className="text-base font-medium text-white mb-2">
                      Website Analytics
                    </h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      We may use Google Analytics on this website (locusai.dev)
                      to collect aggregated, anonymous usage statistics such as
                      pages visited, referral sources, and general traffic
                      patterns. This data does not identify individual users.
                    </p>
                  </div>
                  <div>
                    <h3 className="text-base font-medium text-white mb-2">
                      npm Download Statistics
                    </h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      The CLI is distributed via npm. npm collects its own
                      download statistics, which are publicly available. We do
                      not control or have access to individual download data.
                    </p>
                  </div>
                </div>
              </div>

              <div>
                <h2 className="text-xl font-semibold text-white mb-4">
                  4. Third-Party Services
                </h2>
                <p className="text-sm text-muted-foreground leading-relaxed mb-3">
                  When you use Locus, your data flows directly between your
                  machine and these third-party services:
                </p>
                <ul className="space-y-2 text-sm text-muted-foreground leading-relaxed list-disc list-inside">
                  <li>
                    <strong className="text-white">AI Providers</strong>{" "}
                    (Anthropic Claude, OpenAI Codex) — Your code and prompts are
                    sent directly from your machine to your chosen AI provider.
                    Locus does not intermediate these requests.
                  </li>
                  <li>
                    <strong className="text-white">GitHub</strong> — Issues,
                    milestones, labels, and pull requests are managed via the
                    GitHub CLI (gh) directly from your machine.
                  </li>
                  <li>
                    <strong className="text-white">Google Analytics</strong> —
                    We use Google Analytics on this website for aggregated usage
                    statistics.
                  </li>
                </ul>
              </div>

              <div>
                <h2 className="text-xl font-semibold text-white mb-4">
                  5. Local Data Storage
                </h2>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Locus stores configuration and session data locally in the
                  .locus/ directory within your project. This includes project
                  settings, REPL session history, execution logs, and run state.
                  All of this data stays on your machine. The .locus/ directory
                  is gitignored by default for sensitive files like config.json.
                </p>
              </div>

              <div>
                <h2 className="text-xl font-semibold text-white mb-4">
                  6. Open Source
                </h2>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Locus is fully open source under the MIT License. You can
                  audit every line of code to verify exactly what data is
                  accessed and where it goes. There is no telemetry, no
                  analytics SDK, and no phone-home behavior in the CLI.
                </p>
              </div>

              <div>
                <h2 className="text-xl font-semibold text-white mb-4">
                  7. Changes to This Policy
                </h2>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  We may update this Privacy Policy from time to time. We will
                  notify you of any material changes by posting the new policy
                  on this page and updating the &quot;Last updated&quot; date.
                </p>
              </div>

              <div>
                <h2 className="text-xl font-semibold text-white mb-4">
                  8. Contact
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
