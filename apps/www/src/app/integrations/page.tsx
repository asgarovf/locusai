import {
  ArrowRight,
  Bot,
  Box,
  Code2,
  GitBranch,
  Github,
  MessageSquare,
  Terminal,
} from "lucide-react";
import { Metadata } from "next";
import Link from "next/link";
import { Footer, Navbar } from "@/components/layout";

export const metadata: Metadata = {
  title: "Integrations",
  description:
    "Locus works with Claude, Codex, GitHub, Telegram, and more. Bring your own AI provider and tools.",
};

const integrations = [
  {
    name: "Claude",
    description:
      "Anthropic's Claude models via Claude Code CLI. The default AI provider for all Locus agents, planning, review, and exec commands. Supports model selection with --model flag.",
    icon: <Bot className="h-5 w-5" />,
    color: "text-violet",
    setup: "claude login",
    tag: "AI Provider",
    tagColor: "text-violet bg-violet/10 border-violet/20",
  },
  {
    name: "Codex",
    description:
      "OpenAI Codex as an alternative AI provider. Switch between Claude and Codex with the --provider flag. All commands support both providers.",
    icon: <Code2 className="h-5 w-5" />,
    color: "text-emerald",
    setup: "locus config set provider codex",
    tag: "AI Provider",
    tagColor: "text-emerald bg-emerald/10 border-emerald/20",
  },
  {
    name: "GitHub",
    description:
      "Deep integration via the GitHub CLI (gh). Agents create branches and push code. Code review posts comments directly to pull requests. PR management from the Telegram bot.",
    icon: <Github className="h-5 w-5" />,
    color: "text-foreground",
    setup: "gh auth login",
    tag: "Version Control",
    tagColor: "text-foreground bg-white/[0.06] border-white/[0.1]",
  },
  {
    name: "Git",
    description:
      "Git worktree isolation for parallel agents. Each agent gets its own worktree so concurrent tasks never conflict. Auto-commit and push on task completion.",
    icon: <GitBranch className="h-5 w-5" />,
    color: "text-amber",
    setup: "git init",
    tag: "Version Control",
    tagColor: "text-amber bg-amber/10 border-amber/20",
  },
  {
    name: "Telegram",
    description:
      "Remote control your entire Locus workflow from Telegram. Plan sprints, run agents, review code, and execute git commands from anywhere.",
    icon: <MessageSquare className="h-5 w-5" />,
    color: "text-cyan",
    setup: "npm install -g @locusai/telegram",
    tag: "Remote Control",
    tagColor: "text-cyan bg-cyan/10 border-cyan/20",
  },
  {
    name: "Bun",
    description:
      "Locus uses Bun as the package manager and runtime for self-hosted deployments. The install script sets up Bun automatically.",
    icon: <Box className="h-5 w-5" />,
    color: "text-rose",
    setup: "curl -fsSL https://bun.sh/install | bash",
    tag: "Runtime",
    tagColor: "text-rose bg-rose/10 border-rose/20",
  },
];

export default function IntegrationsPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="flex-1">
        {/* Hero */}
        <section className="relative pt-36 pb-20 md:pt-44 md:pb-28 overflow-hidden">
          <div className="mesh-gradient-hero absolute inset-0" />
          <div className="max-w-4xl px-6 mx-auto relative text-center">
            <p className="text-xs font-medium tracking-[0.2em] uppercase text-amber mb-4">
              Integrations
            </p>
            <h1 className="text-4xl md:text-6xl font-bold tracking-tight text-white mb-6">
              Works with your stack
            </h1>
            <p className="text-base md:text-lg text-muted-foreground max-w-xl mx-auto leading-relaxed">
              Locus integrates with the tools you already use. Bring your own AI
              provider, connect GitHub, and control everything from Telegram.
            </p>
          </div>
        </section>

        {/* Integrations list */}
        <section className="pb-28 relative">
          <div className="max-w-3xl px-6 mx-auto">
            <div className="space-y-5">
              {integrations.map((item) => (
                <div
                  key={item.name}
                  className="rounded-xl border border-border/40 bg-[#060609] overflow-hidden"
                >
                  <div className="p-6">
                    <div className="flex items-start gap-4">
                      <div
                        className={`flex h-10 w-10 items-center justify-center rounded-xl bg-white/[0.04] border border-white/[0.06] ${item.color} shrink-0`}
                      >
                        {item.icon}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2.5 mb-2">
                          <h3 className="text-base font-semibold text-white">
                            {item.name}
                          </h3>
                          <span
                            className={`text-[10px] font-medium px-2 py-0.5 rounded-full border ${item.tagColor}`}
                          >
                            {item.tag}
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground leading-relaxed mb-3">
                          {item.description}
                        </p>
                        <div className="rounded-lg bg-[#040406] border border-border/30 px-3 py-2 inline-flex items-center gap-2">
                          <Terminal className="h-3 w-3 text-muted-foreground shrink-0" />
                          <code className="text-[11px] text-muted-foreground font-mono">
                            {item.setup}
                          </code>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Provider comparison */}
        <section className="pb-28 relative">
          <div className="max-w-2xl px-6 mx-auto">
            <div className="glow-line-multi mb-16" />
            <h2 className="text-2xl font-bold tracking-tight text-white mb-8 text-center">
              Switching providers
            </h2>
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
              <div className="p-5 space-y-0">
                <p className="text-muted-foreground"># Use Claude (default)</p>
                <p>
                  <span className="text-violet/50">$ </span>
                  <span className="text-foreground">
                    locus run --provider claude --model opus
                  </span>
                </p>
                <p className="h-3" />
                <p className="text-muted-foreground"># Switch to Codex</p>
                <p>
                  <span className="text-violet/50">$ </span>
                  <span className="text-foreground">
                    locus run --provider codex
                  </span>
                </p>
                <p className="h-3" />
                <p className="text-muted-foreground">
                  # Set default provider globally
                </p>
                <p>
                  <span className="text-violet/50">$ </span>
                  <span className="text-foreground">
                    locus config set provider codex
                  </span>
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="pb-28 relative">
          <div className="max-w-3xl px-6 mx-auto text-center">
            <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-white mb-4">
              Get started with your tools
            </h2>
            <p className="text-muted-foreground max-w-md mx-auto text-sm mb-8 leading-relaxed">
              Install Locus and connect your AI provider in minutes.
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
                Full documentation
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
