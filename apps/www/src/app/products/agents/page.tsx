import {
  ArrowRight,
  Bot,
  GitBranch,
  Layers,
  Shield,
  Terminal,
  Zap,
} from "lucide-react";
import { Metadata } from "next";
import Link from "next/link";
import { Footer, Navbar } from "@/components/layout";

export const metadata: Metadata = {
  title: "AI Agents",
  description:
    "Dispatch up to 5 autonomous AI agents that claim tasks, write code, run tests, and create pull requests — each in an isolated git worktree.",
  alternates: {
    canonical: "https://locusai.dev/products/agents",
  },
  openGraph: {
    url: "https://locusai.dev/products/agents",
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "Locus AI Agents",
  applicationCategory: "DeveloperApplication",
  url: "https://locusai.dev/products/agents",
  description:
    "Dispatch up to 5 autonomous AI agents that claim tasks, write code, run tests, and create pull requests — each in an isolated git worktree.",
  author: {
    "@id": "https://locusai.dev/#organization",
  },
};

const capabilities = [
  {
    icon: <Layers className="h-4 w-4" />,
    title: "Parallel execution",
    description:
      "Run up to 5 agents simultaneously. Each agent claims a task from your sprint and works on it independently.",
    color: "text-cyan",
  },
  {
    icon: <GitBranch className="h-4 w-4" />,
    title: "Worktree isolation",
    description:
      "Every agent operates in its own git worktree. Parallel work never conflicts — each task gets a clean branch.",
    color: "text-violet",
  },
  {
    icon: <Zap className="h-4 w-4" />,
    title: "Auto push & PR",
    description:
      "Agents automatically commit, push to remote, and create branches. Review the output as pull requests.",
    color: "text-amber",
  },
  {
    icon: <Shield className="h-4 w-4" />,
    title: "Runs on your machine",
    description:
      "Code never leaves your infrastructure. Agents execute locally using your AI provider credentials.",
    color: "text-emerald",
  },
  {
    icon: <Bot className="h-4 w-4" />,
    title: "Claude & Codex",
    description:
      "Choose between Anthropic Claude (via Claude Code CLI) or OpenAI Codex as your agent provider.",
    color: "text-rose",
  },
  {
    icon: <Terminal className="h-4 w-4" />,
    title: "Graceful lifecycle",
    description:
      "Agents handle SIGINT/SIGTERM gracefully — worktrees are cleaned up and progress is saved on shutdown.",
    color: "text-cyan",
  },
];

const flags = [
  { flag: "--agents <N>", description: "Number of parallel agents (1–5)" },
  {
    flag: "--provider <name>",
    description: 'AI provider: "claude" or "codex"',
  },
  { flag: "--sprint <id>", description: "Target a specific sprint" },
  {
    flag: "--worktree",
    description: "Enable worktree isolation (auto when agents > 1)",
  },
  {
    flag: "--auto-push",
    description: "Auto-push branches to remote (default: true)",
  },
  { flag: "--model <name>", description: "Override the AI model" },
  { flag: "--skip-planning", description: "Skip the planning phase" },
  { flag: "--dir <path>", description: "Set the project directory" },
];

export default function AgentsPage() {
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
            <p className="text-xs font-medium tracking-[0.2em] uppercase text-cyan mb-4">
              AI Agents
            </p>
            <h1 className="text-4xl md:text-6xl font-bold tracking-tight text-white mb-6">
              Autonomous agents that ship code
            </h1>
            <p className="text-base md:text-lg text-muted-foreground max-w-xl mx-auto leading-relaxed">
              Dispatch parallel AI agents that claim tasks from your sprint,
              write code, run tests, and push branches — all in isolated git
              worktrees.
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
                  locus run
                </span>
              </div>
              <div className="p-5 md:p-6 space-y-0">
                <p>
                  <span className="text-violet/50">$ </span>
                  <span className="text-foreground">
                    locus run --agents 3 --provider claude
                  </span>
                </p>
                <p className="h-3" />
                <p className="text-cyan">
                  🚀 Starting 3 agent(s) in ~/dev/my-saas...
                </p>
                <p className="text-muted-foreground">
                  {"  "}Each task will run in an isolated worktree
                </p>
                <p className="text-muted-foreground">
                  {"  "}Branches will be committed and pushed to remote
                </p>
                <p className="h-3" />
                <p className="text-cyan">{"  "}● Agent spawned: agent-a1b2c3</p>
                <p className="text-cyan">
                  {"  "}● Claimed: Implement user auth
                </p>
                <p className="text-violet">
                  {"  "}● Agent spawned: agent-d4e5f6
                </p>
                <p className="text-violet">
                  {"  "}● Claimed: Add database migrations
                </p>
                <p className="text-amber">
                  {"  "}● Agent spawned: agent-g7h8i9
                </p>
                <p className="text-amber">{"  "}● Claimed: Create API docs</p>
                <p className="h-3" />
                <p className="text-emerald">
                  {"  "}✔ Completed: Implement user auth
                </p>
                <p className="text-emerald">
                  {"  "}✔ Completed: Add database migrations
                </p>
                <p className="text-emerald">
                  {"  "}✔ Completed: Create API docs
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Capabilities */}
        <section className="pb-28 relative">
          <div className="max-w-5xl px-6 mx-auto">
            <div className="glow-line-multi mb-16" />
            <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-white mb-12 text-center">
              How agents work
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {capabilities.map((cap) => (
                <div key={cap.title}>
                  <div
                    className={`flex h-8 w-8 items-center justify-center rounded-lg bg-white/[0.04] border border-white/[0.06] ${cap.color} mb-4`}
                  >
                    {cap.icon}
                  </div>
                  <h3 className="text-sm font-medium text-white mb-2">
                    {cap.title}
                  </h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {cap.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CLI flags */}
        <section className="pb-28 relative">
          <div className="max-w-2xl px-6 mx-auto">
            <h2 className="text-2xl font-bold tracking-tight text-white mb-8 text-center">
              Command reference
            </h2>
            <div className="rounded-xl border border-border/40 bg-[#060609] overflow-hidden">
              <div className="px-5 py-3 border-b border-border/20 bg-[#080810]">
                <code className="text-xs text-muted-foreground">
                  locus run [options]
                </code>
              </div>
              <div className="divide-y divide-border/10">
                {flags.map((f) => (
                  <div
                    key={f.flag}
                    className="flex items-start gap-4 px-5 py-3"
                  >
                    <code className="text-xs text-cyan font-mono shrink-0 min-w-[180px]">
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
              Start running agents
            </h2>
            <p className="text-muted-foreground max-w-md mx-auto text-sm mb-8 leading-relaxed">
              Install the CLI and dispatch your first agent in under a minute.
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
