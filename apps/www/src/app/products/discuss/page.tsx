import {
  ArrowRight,
  BookOpen,
  BrainCircuit,
  Lightbulb,
  MessageSquare,
  Terminal,
  Zap,
} from "lucide-react";
import { Metadata } from "next";
import Link from "next/link";
import { Footer, Navbar } from "@/components/layout";

export const metadata: Metadata = {
  title: "AI Discussions",
  description:
    "Start interactive AI discussions with full project context. The system extracts structured insights — decisions, requirements, ideas, and concerns — as the conversation progresses.",
  alternates: {
    canonical: "https://locusai.dev/products/discuss",
  },
  openGraph: {
    url: "https://locusai.dev/products/discuss",
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "Locus AI Discussions",
  applicationCategory: "DeveloperApplication",
  url: "https://locusai.dev/products/discuss",
  description:
    "Start interactive AI discussions with full project context. The system extracts structured insights — decisions, requirements, ideas, and concerns — as the conversation progresses.",
  author: {
    "@id": "https://locusai.dev/#organization",
  },
};

const features = [
  {
    icon: <MessageSquare className="h-4 w-4" />,
    title: "Interactive REPL",
    description:
      "Have back-and-forth conversations with AI in a REPL-style interface. Type your thoughts, get informed responses, and iterate on ideas.",
    color: "text-emerald",
  },
  {
    icon: <Lightbulb className="h-4 w-4" />,
    title: "Insight extraction",
    description:
      "The system automatically extracts structured insights — decisions, requirements, ideas, concerns, and learnings — as the conversation progresses.",
    color: "text-amber",
  },
  {
    icon: <BrainCircuit className="h-4 w-4" />,
    title: "Project-aware context",
    description:
      "Discussions have full access to your project structure, codebase index, and workspace documents for informed conversations.",
    color: "text-violet",
  },
  {
    icon: <BookOpen className="h-4 w-4" />,
    title: "Session management",
    description:
      "List, show, archive, or delete discussions. Your conversation history is saved locally for future reference.",
    color: "text-cyan",
  },
  {
    icon: <Zap className="h-4 w-4" />,
    title: "Summary generation",
    description:
      "Type 'summary' to generate a final summary of the discussion with all extracted insights compiled into a structured document.",
    color: "text-rose",
  },
  {
    icon: <Terminal className="h-4 w-4" />,
    title: "Streaming responses",
    description:
      "AI responses stream in real-time, so you can start reading immediately while the full response is being generated.",
    color: "text-cyan",
  },
];

const flags = [
  {
    flag: '"topic"',
    description: "Start a new discussion on the given topic",
  },
  { flag: "--list", description: "List all discussions" },
  { flag: "--show <id>", description: "Show a discussion's details" },
  { flag: "--archive <id>", description: "Archive a discussion" },
  { flag: "--delete <id>", description: "Delete a discussion" },
  { flag: "--model <name>", description: "Override the AI model" },
  {
    flag: "--provider <name>",
    description: 'AI provider: "claude" or "codex"',
  },
];

export default function DiscussPage() {
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
            <p className="text-xs font-medium tracking-[0.2em] uppercase text-emerald mb-4">
              AI Discussions
            </p>
            <h1 className="text-4xl md:text-6xl font-bold tracking-tight text-white mb-6">
              Think through problems before writing code
            </h1>
            <p className="text-base md:text-lg text-muted-foreground max-w-xl mx-auto leading-relaxed">
              Start interactive AI discussions with full project context. The
              system extracts structured insights as the conversation
              progresses, building a knowledge base for your project.
            </p>
          </div>
        </section>

        {/* Terminal demo */}
        <section className="pb-24 relative">
          <div className="max-w-3xl px-6 mx-auto">
            <div className="rounded-xl border border-border/40 bg-[#040406] overflow-hidden font-mono text-[12px] md:text-[13px] leading-relaxed">
              <div className="flex items-center gap-2 px-4 py-3 border-b border-border/20 bg-[#080810]">
                <div className="flex gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-rose/50" />
                  <div className="w-2 h-2 rounded-full bg-amber/50" />
                  <div className="w-2 h-2 rounded-full bg-emerald/50" />
                </div>
                <span className="text-[10px] text-muted-foreground font-sans flex items-center gap-1.5 mx-auto">
                  <Terminal className="w-2.5 h-2.5" />
                  locus discuss
                </span>
              </div>
              <div className="p-5 md:p-6 space-y-0">
                <p>
                  <span className="text-violet/50">$ </span>
                  <span className="text-foreground">
                    locus discuss &quot;How should we handle auth tokens?&quot;
                  </span>
                </p>
                <p className="h-3" />
                <p className="text-emerald">
                  🧠 Starting discussion with project context...
                </p>
                <p className="h-3" />
                <p className="text-foreground">
                  {"  "}You: Should we use JWT or session cookies?
                </p>
                <p className="text-muted-foreground">
                  {"  "}AI: Given your NestJS backend with the existing Passport
                  setup, I&apos;d recommend short-lived JWTs with refresh
                  tokens...
                </p>
                <p className="h-3" />
                <p className="text-emerald">
                  {"  "}💡 Insight: Use short-lived JWTs with refresh tokens
                </p>
                <p className="text-emerald">
                  {"  "}💡 Insight: Store refresh tokens in httpOnly cookies
                </p>
                <p className="h-3" />
                <p className="text-foreground">{"  "}You: summary</p>
                <p className="text-muted-foreground">
                  {"  "}Generating final summary...
                </p>
                <p className="text-emerald">
                  {"  "}✔ Discussion saved with 2 insights extracted
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Features */}
        <section className="pb-28 relative">
          <div className="max-w-5xl px-6 mx-auto">
            <div className="glow-line-multi mb-16" />
            <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-white mb-12 text-center">
              How discussions work
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {features.map((feature) => (
                <div key={feature.title}>
                  <div
                    className={`flex h-8 w-8 items-center justify-center rounded-lg bg-white/[0.04] border border-white/[0.06] ${feature.color} mb-4`}
                  >
                    {feature.icon}
                  </div>
                  <h3 className="text-sm font-medium text-white mb-2">
                    {feature.title}
                  </h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {feature.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* REPL commands */}
        <section className="pb-28 relative">
          <div className="max-w-2xl px-6 mx-auto">
            <h2 className="text-2xl font-bold tracking-tight text-white mb-8 text-center">
              REPL commands
            </h2>
            <div className="rounded-xl border border-border/40 bg-[#060609] overflow-hidden mb-10">
              <div className="divide-y divide-border/10">
                <div className="flex items-start gap-4 px-5 py-3">
                  <code className="text-xs text-emerald font-mono shrink-0 min-w-[120px]">
                    summary
                  </code>
                  <span className="text-xs text-muted-foreground">
                    Generate final summary and end the discussion
                  </span>
                </div>
                <div className="flex items-start gap-4 px-5 py-3">
                  <code className="text-xs text-emerald font-mono shrink-0 min-w-[120px]">
                    insights
                  </code>
                  <span className="text-xs text-muted-foreground">
                    Show all extracted insights so far
                  </span>
                </div>
                <div className="flex items-start gap-4 px-5 py-3">
                  <code className="text-xs text-emerald font-mono shrink-0 min-w-[120px]">
                    exit / quit
                  </code>
                  <span className="text-xs text-muted-foreground">
                    Save and exit the discussion
                  </span>
                </div>
                <div className="flex items-start gap-4 px-5 py-3">
                  <code className="text-xs text-emerald font-mono shrink-0 min-w-[120px]">
                    help
                  </code>
                  <span className="text-xs text-muted-foreground">
                    Show available REPL commands
                  </span>
                </div>
              </div>
            </div>

            <h2 className="text-2xl font-bold tracking-tight text-white mb-8 text-center">
              Command reference
            </h2>
            <div className="rounded-xl border border-border/40 bg-[#060609] overflow-hidden">
              <div className="px-5 py-3 border-b border-border/20 bg-[#080810]">
                <code className="text-xs text-muted-foreground">
                  locus discuss [options]
                </code>
              </div>
              <div className="divide-y divide-border/10">
                {flags.map((f) => (
                  <div
                    key={f.flag}
                    className="flex items-start gap-4 px-5 py-3"
                  >
                    <code className="text-xs text-emerald font-mono shrink-0 min-w-[180px]">
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
              Start a discussion
            </h2>
            <p className="text-muted-foreground max-w-md mx-auto text-sm mb-8 leading-relaxed">
              Think through architecture, design, and implementation decisions
              with AI before writing a single line of code.
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
