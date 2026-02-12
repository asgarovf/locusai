import {
  ArrowRight,
  Bug,
  FileText,
  Github,
  Lock,
  Search,
  Terminal,
  Zap,
} from "lucide-react";
import { Metadata } from "next";
import Link from "next/link";
import { Footer, Navbar } from "@/components/layout";

export const metadata: Metadata = {
  title: "Code Review",
  description:
    "Automated AI code review for GitHub pull requests and local staged changes. Catches bugs, security issues, and style violations.",
  alternates: {
    canonical: "https://locusai.dev/products/review",
  },
  openGraph: {
    url: "https://locusai.dev/products/review",
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "Locus Code Review",
  applicationCategory: "DeveloperApplication",
  url: "https://locusai.dev/products/review",
  description:
    "Automated AI code review for GitHub pull requests and local staged changes. Catches bugs, security issues, and style violations.",
  author: {
    "@id": "https://locusai.dev/#organization",
  },
};

const modes = [
  {
    title: "PR Review",
    description:
      "Automatically finds unreviewed Locus-created PRs on GitHub and reviews them. Posts comments directly to your pull requests.",
    command: "locus review",
    output: [
      "🔍 Found 2 unreviewed PR(s). Starting reviewer...",
      "",
      "  Reviewing PR #42: Add user authentication",
      "  ✔ Review posted to GitHub",
      "",
      "  Reviewing PR #43: Database migrations",
      "  ✔ Review posted to GitHub",
    ],
    color: "text-amber",
  },
  {
    title: "Local Review",
    description:
      "Review your staged git changes locally without pushing to GitHub. Generates a detailed markdown report saved to your project.",
    command: "locus review local",
    output: [
      "🔍 Reviewing staged changes...",
      "",
      "  Analyzing 4 files, 127 lines changed",
      "",
      "  ✔ Review complete!",
      "  Report saved to: .locus/reviews/review-2026-02-11.md",
    ],
    color: "text-cyan",
  },
];

const detects = [
  {
    icon: <Bug className="h-4 w-4" />,
    title: "Bugs & logic errors",
    description:
      "Catches potential bugs, off-by-one errors, null pointer issues, and incorrect logic before they reach production.",
    color: "text-rose",
  },
  {
    icon: <Lock className="h-4 w-4" />,
    title: "Security vulnerabilities",
    description:
      "Flags SQL injection, XSS, command injection, exposed secrets, and other OWASP top 10 vulnerabilities.",
    color: "text-amber",
  },
  {
    icon: <Zap className="h-4 w-4" />,
    title: "Performance issues",
    description:
      "Identifies N+1 queries, unnecessary re-renders, memory leaks, and inefficient algorithms.",
    color: "text-cyan",
  },
  {
    icon: <FileText className="h-4 w-4" />,
    title: "Code quality",
    description:
      "Reviews naming conventions, code duplication, missing error handling, and adherence to project patterns.",
    color: "text-violet",
  },
  {
    icon: <Github className="h-4 w-4" />,
    title: "GitHub integration",
    description:
      "Uses the GitHub CLI to discover PRs and post review comments directly. No webhook setup required.",
    color: "text-foreground",
  },
  {
    icon: <Search className="h-4 w-4" />,
    title: "Context-aware",
    description:
      "Reviews understand your full codebase context — not just the diff. The AI knows your patterns and conventions.",
    color: "text-emerald",
  },
];

const flags = [
  { flag: "locus review", description: "Review open Locus PRs on GitHub" },
  {
    flag: "locus review local",
    description: "Review staged changes locally",
  },
  { flag: "--provider <name>", description: '"claude" or "codex"' },
  { flag: "--model <name>", description: "Override the AI model" },
  { flag: "--workspace <id>", description: "Target workspace" },
  { flag: "--dir <path>", description: "Project directory" },
];

export default function ReviewPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <Navbar />
      <main className="flex-1">
        {/* Hero */}
        <section className="relative pt-36 pb-20 md:pt-44 md:pb-28 overflow-hidden">
          <div className="mesh-gradient-hero absolute inset-0" />
          <div className="max-w-4xl px-6 mx-auto relative text-center">
            <p className="text-xs font-medium tracking-[0.2em] uppercase text-amber mb-4">
              Code Review
            </p>
            <h1 className="text-4xl md:text-6xl font-bold tracking-tight text-white mb-6">
              AI review for every change
            </h1>
            <p className="text-base md:text-lg text-muted-foreground max-w-xl mx-auto leading-relaxed">
              Get instant AI-powered code review on GitHub pull requests and
              local staged changes. Catches bugs, security issues, and style
              violations before they reach production.
            </p>
          </div>
        </section>

        {/* Two modes */}
        <section className="pb-28 relative">
          <div className="max-w-3xl px-6 mx-auto space-y-16">
            {modes.map((mode) => (
              <div key={mode.title}>
                <h3 className="text-xl font-bold text-white mb-2">
                  {mode.title}
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed mb-5 max-w-lg">
                  {mode.description}
                </p>
                <div className="rounded-xl border border-border/40 bg-[#040406] overflow-hidden font-mono text-[12px] md:text-[13px] leading-relaxed">
                  <div className="flex items-center gap-2 px-4 py-2.5 border-b border-border/20 bg-[#080810]">
                    <div className="flex gap-1.5">
                      <div className="w-2 h-2 rounded-full bg-rose/50" />
                      <div className="w-2 h-2 rounded-full bg-amber/50" />
                      <div className="w-2 h-2 rounded-full bg-emerald/50" />
                    </div>
                    <span className="text-[10px] text-muted-foreground font-sans flex items-center gap-1.5 mx-auto">
                      <Terminal className="w-2.5 h-2.5" />
                      terminal
                    </span>
                  </div>
                  <div className="p-5">
                    <p>
                      <span className="text-violet/50">$ </span>
                      <span className="text-foreground">{mode.command}</span>
                    </p>
                    <p className="h-3" />
                    {mode.output.map((line, i) => (
                      <p
                        key={i}
                        className={
                          !line
                            ? "h-3"
                            : line.startsWith("  ✔")
                              ? "text-emerald"
                              : line.startsWith("🔍")
                                ? mode.color
                                : "text-muted-foreground"
                        }
                      >
                        {line}
                      </p>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* What it detects */}
        <section className="pb-28 relative">
          <div className="max-w-5xl px-6 mx-auto">
            <div className="glow-line-multi mb-16" />
            <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-white mb-12 text-center">
              What it reviews
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {detects.map((item) => (
                <div key={item.title}>
                  <div
                    className={`flex h-8 w-8 items-center justify-center rounded-lg bg-white/[0.04] border border-white/[0.06] ${item.color} mb-4`}
                  >
                    {item.icon}
                  </div>
                  <h3 className="text-sm font-medium text-white mb-2">
                    {item.title}
                  </h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {item.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Command reference */}
        <section className="pb-28 relative">
          <div className="max-w-2xl px-6 mx-auto">
            <h2 className="text-2xl font-bold tracking-tight text-white mb-8 text-center">
              Command reference
            </h2>
            <div className="rounded-xl border border-border/40 bg-[#060609] overflow-hidden">
              <div className="px-5 py-3 border-b border-border/20 bg-[#080810]">
                <code className="text-xs text-muted-foreground">
                  locus review [options]
                </code>
              </div>
              <div className="divide-y divide-border/10">
                {flags.map((f) => (
                  <div
                    key={f.flag}
                    className="flex items-start gap-4 px-5 py-3"
                  >
                    <code className="text-xs text-amber font-mono shrink-0 min-w-[200px]">
                      {f.flag}
                    </code>
                    <span className="text-xs text-muted-foreground">
                      {f.description}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="pb-28 relative">
          <div className="max-w-3xl px-6 mx-auto text-center">
            <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-white mb-4">
              Never ship unreviewed code
            </h2>
            <p className="text-muted-foreground max-w-md mx-auto text-sm mb-8 leading-relaxed">
              Set up automated review for your PRs in minutes.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-4">
              <Link
                href="https://app.locusai.dev/register"
                className="inline-flex items-center gap-2 text-sm font-medium bg-white text-background px-7 py-3 rounded-xl hover:bg-white/85 transition-colors"
              >
                Get Started
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
              <Link
                href="https://docs.locusai.dev"
                className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                Read the docs
                <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
