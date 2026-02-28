import { ArrowRight, Globe, Shield, Users } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Footer, Navbar } from "@/components/layout";

export const metadata: Metadata = {
  title: "About",
  description:
    "Meet the team behind Locus — the GitHub-native AI engineering CLI. Learn about our mission, values, and the people building the future of AI-powered software delivery.",
  alternates: {
    canonical: "https://locusai.dev/about",
  },
  openGraph: {
    url: "https://locusai.dev/about",
  },
};

const values = [
  {
    icon: <Globe className="h-5 w-5" />,
    title: "Open Source First",
    description:
      "Every line of Locus is MIT-licensed. We believe developer tools should be transparent, auditable, and community-driven. No proprietary backends, no vendor lock-in.",
    color: "text-cyan",
  },
  {
    icon: <Shield className="h-5 w-5" />,
    title: "Privacy by Architecture",
    description:
      "Locus runs entirely on your machine. Your code, prompts, and credentials never touch our servers because we have no servers. GitHub is the only backend.",
    color: "text-emerald",
  },
  {
    icon: <Users className="h-5 w-5" />,
    title: "Developer Experience",
    description:
      "We build tools that fit into existing workflows, not tools that demand you change. GitHub-native means your team already knows the platform.",
    color: "text-violet",
  },
];

export default function AboutPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="flex-1">
        {/* Hero */}
        <section className="relative pt-36 pb-20 md:pt-44 md:pb-28 overflow-hidden">
          <div className="mesh-gradient-hero absolute inset-0" />
          <div className="max-w-4xl px-6 mx-auto relative text-center">
            <p className="text-xs font-medium tracking-[0.2em] uppercase text-violet mb-4">
              About
            </p>
            <h1 className="text-4xl md:text-6xl font-bold tracking-tight text-white mb-6">
              Building the unified interface for AI engineering
            </h1>
            <p className="text-base md:text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
              Locus is an open-source CLI that turns GitHub issues into shipped
              code. We believe AI agents should work inside your existing GitHub
              workflows — not replace them.
            </p>
          </div>
        </section>

        {/* Mission */}
        <section className="pb-20 relative">
          <div className="max-w-3xl px-6 mx-auto">
            <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-white mb-6">
              Our mission
            </h2>
            <div className="space-y-4 text-sm text-muted-foreground leading-relaxed">
              <p>
                AI coding agents are powerful, but they work in isolation. They
                generate code without knowing your sprint context, create PRs
                without linking to issues, and require different tooling for
                each provider.
              </p>
              <p>
                Locus solves this by providing a single CLI interface that works
                across Claude and Codex while keeping all execution state in
                GitHub-native objects: issues, milestones, labels, and pull
                requests.
              </p>
              <p>
                The result is AI-powered software delivery that your whole team
                can track, review, and iterate on — using tools they already
                know.
              </p>
            </div>
          </div>
        </section>

        {/* Values */}
        <section className="pb-28 relative">
          <div className="max-w-3xl px-6 mx-auto">
            <div className="glow-line-multi mb-16" />
            <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-white mb-10 text-center">
              What we believe
            </h2>
            <div className="space-y-10">
              {values.map((value) => (
                <div key={value.title} className="flex gap-5">
                  <div
                    className={`flex h-10 w-10 items-center justify-center rounded-xl bg-white/4 border border-white/6 ${value.color} shrink-0 mt-0.5`}
                  >
                    {value.icon}
                  </div>
                  <div>
                    <h3 className="text-base font-semibold text-white mb-2">
                      {value.title}
                    </h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {value.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="pb-28 relative">
          <div className="max-w-3xl px-6 mx-auto text-center">
            <h2 className="text-2xl font-bold tracking-tight text-white mb-3">
              Want to contribute?
            </h2>
            <p className="text-sm text-muted-foreground max-w-md mx-auto leading-relaxed mb-6">
              Locus is open source and welcomes contributions. Check out the
              contributing guide to get started.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-4">
              <Link
                href="https://github.com/asgarovf/locusai"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-sm font-medium bg-white text-background px-7 py-3 rounded-xl hover:bg-white/85 transition-colors"
              >
                View on GitHub
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
              <Link
                href="https://github.com/asgarovf/locusai/blob/master/CONTRIBUTING.md"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-sm font-medium text-white px-7 py-3 rounded-xl border border-border/60 hover:bg-white/6 hover:border-border transition-colors"
              >
                Contributing guide
              </Link>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
