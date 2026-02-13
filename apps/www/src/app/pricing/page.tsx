import {
  ArrowRight,
  Bot,
  BrainCircuit,
  Check,
  Code2,
  GitBranch,
  MessageSquare,
  Search,
  Server,
  Terminal,
  Zap,
} from "lucide-react";
import { Metadata } from "next";
import Link from "next/link";
import { Footer, Navbar } from "@/components/layout";

export const metadata: Metadata = {
  title: "Pricing",
  description:
    "Locus is free and open source. Run AI agents locally with no usage limits, no hidden costs.",
  alternates: {
    canonical: "https://locusai.dev/pricing",
  },
  openGraph: {
    url: "https://locusai.dev/pricing",
  },
};

const features = [
  { icon: <Bot className="h-4 w-4" />, text: "Autonomous AI agent" },
  {
    icon: <BrainCircuit className="h-4 w-4" />,
    text: "AI-powered sprint planning",
  },
  { icon: <Search className="h-4 w-4" />, text: "Automated code review" },
  {
    icon: <MessageSquare className="h-4 w-4" />,
    text: "Telegram bot integration",
  },
  { icon: <Server className="h-4 w-4" />, text: "Self-hosting on your infra" },
  { icon: <Terminal className="h-4 w-4" />, text: "Interactive exec & REPL" },
  {
    icon: <GitBranch className="h-4 w-4" />,
    text: "Single-branch git workflow",
  },
  { icon: <Code2 className="h-4 w-4" />, text: "Claude & Codex providers" },
  { icon: <Zap className="h-4 w-4" />, text: "Session management" },
];

const faqs = [
  {
    q: "Is Locus really free?",
    a: "Yes. Locus is open source under the MIT license. The CLI, agents, sprint planning, code review, and Telegram bot are all free to use with no limits.",
  },
  {
    q: "What do I need to run Locus?",
    a: "You need Node.js 18+, a git repository, and an AI provider (Claude Code CLI or OpenAI Codex). Locus runs entirely on your machine — no cloud required.",
  },
  {
    q: "Will there be paid plans in the future?",
    a: "We may introduce optional cloud features like hosted dashboards, team collaboration, and managed infrastructure. The core CLI and agents will always remain free and open source.",
  },
  {
    q: "Do I need a Locus account?",
    a: "A free Locus account gives you access to the cloud dashboard for project management and task coordination. The CLI works standalone without an account for local workflows.",
  },
  {
    q: "What AI providers does Locus support?",
    a: "Locus supports Claude (via Claude Code CLI) and OpenAI Codex. You bring your own AI provider credentials — Locus doesn't proxy or charge for AI usage.",
  },
];

export default function PricingPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="flex-1">
        {/* Hero */}
        <section className="relative pt-36 pb-20 md:pt-44 md:pb-28 overflow-hidden">
          <div className="mesh-gradient-hero absolute inset-0" />
          <div className="max-w-4xl px-6 mx-auto relative text-center">
            <p className="text-xs font-medium tracking-[0.2em] uppercase text-emerald mb-4">
              Pricing
            </p>
            <h1 className="text-4xl md:text-6xl font-bold tracking-tight text-white mb-6">
              Good news — it&apos;s free
            </h1>
            <p className="text-base md:text-lg text-muted-foreground max-w-xl mx-auto leading-relaxed">
              Locus is open source and completely free. No usage limits, no
              hidden costs, no credit card required. Just install and start
              shipping.
            </p>
          </div>
        </section>

        {/* Pricing card */}
        <section className="pb-24 relative">
          <div className="max-w-lg px-6 mx-auto">
            <div className="relative rounded-2xl border border-border/40 bg-[#060609] overflow-hidden">
              {/* Animated border glow */}
              <div className="absolute inset-0 rounded-2xl animated-gradient-border" />

              <div className="relative p-8 md:p-10">
                {/* Header */}
                <div className="flex items-baseline gap-3 mb-2">
                  <span className="text-5xl font-bold text-white">$0</span>
                </div>
                <p className="text-sm text-muted-foreground mb-8">
                  Everything included. No tiers, no limits.
                </p>

                {/* Features */}
                <div className="space-y-3.5 mb-10">
                  {features.map((feature) => (
                    <div key={feature.text} className="flex items-center gap-3">
                      <div className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald/10 text-emerald shrink-0">
                        <Check className="h-3 w-3" />
                      </div>
                      <span className="text-sm text-foreground/90">
                        {feature.text}
                      </span>
                    </div>
                  ))}
                </div>

                {/* CTA */}
                <Link
                  href="https://app.locusai.dev/register"
                  className="flex items-center justify-center gap-2 w-full text-sm font-medium bg-white text-background px-7 py-3 rounded-xl hover:bg-white/85 transition-colors"
                >
                  Get Started
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
                <p className="text-center text-xs text-muted-foreground mt-3">
                  No credit card required
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Open source note */}
        <section className="pb-24 relative">
          <div className="max-w-3xl px-6 mx-auto text-center">
            <div className="glow-line-multi mb-16" />
            <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-white mb-4">
              Open source, always
            </h2>
            <p className="text-muted-foreground max-w-lg mx-auto text-sm md:text-base leading-relaxed mb-8">
              Locus is MIT-licensed and community-driven. You can run it on your
              own infrastructure, modify the source code, and contribute
              features. Your code never leaves your machine.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-4">
              <Link
                href="https://github.com/asgarovf/locusai"
                target="_blank"
                className="inline-flex items-center gap-2 text-sm font-medium text-white px-6 py-2.5 rounded-xl border border-border/60 hover:bg-white/[0.06] hover:border-border transition-colors"
              >
                View on GitHub
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

        {/* FAQs */}
        <section className="pb-28 relative">
          <div className="max-w-2xl px-6 mx-auto">
            <h2 className="text-2xl font-bold tracking-tight text-white mb-10 text-center">
              Frequently asked questions
            </h2>
            <div className="space-y-6">
              {faqs.map((faq) => (
                <div
                  key={faq.q}
                  className="border-b border-border/20 pb-6 last:border-0"
                >
                  <h3 className="text-sm font-medium text-white mb-2">
                    {faq.q}
                  </h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {faq.a}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
