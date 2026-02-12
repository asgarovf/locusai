import {
  ArrowRight,
  Bot,
  BrainCircuit,
  Code2,
  FolderSearch,
  Search,
  Settings,
  Terminal,
  Zap,
} from "lucide-react";
import { Metadata } from "next";
import Link from "next/link";
import { Footer, Navbar } from "@/components/layout";

export const metadata: Metadata = {
  title: "CLI Reference",
  description:
    "Complete command-line reference for Locus. Install, configure, and run AI agents from your terminal.",
  alternates: {
    canonical: "https://locusai.dev/cli",
  },
  openGraph: {
    url: "https://locusai.dev/cli",
  },
};

const commands = [
  {
    name: "locus run",
    description:
      "Spawn autonomous AI agents that claim sprint tasks and ship code in isolated worktrees.",
    icon: <Bot className="h-4 w-4" />,
    color: "text-cyan",
    flags: [
      "--agents <N>",
      "--provider <name>",
      "--sprint <id>",
      "--worktree",
      "--auto-push",
      "--model <name>",
      "--skip-planning",
    ],
    href: "/products/agents",
  },
  {
    name: "locus plan",
    description:
      "Run AI-powered planning meetings that break directives into sprint tasks.",
    icon: <BrainCircuit className="h-4 w-4" />,
    color: "text-violet",
    flags: [
      '"directive"',
      "--list",
      "--show <id>",
      "--approve <id>",
      "--reject <id>",
      "--feedback <text>",
      "--cancel <id>",
    ],
    href: "/products/planning",
  },
  {
    name: "locus review",
    description: "AI code review for GitHub PRs and local staged changes.",
    icon: <Search className="h-4 w-4" />,
    color: "text-amber",
    flags: ["local", "--provider <name>", "--model <name>", "--workspace <id>"],
    href: "/products/review",
  },
  {
    name: "locus exec",
    description:
      "Execute AI prompts with full repository context. Supports interactive REPL and session management.",
    icon: <Zap className="h-4 w-4" />,
    color: "text-rose",
    flags: [
      '"prompt"',
      "--interactive",
      "--session <id>",
      "--no-stream",
      "sessions list",
      "sessions show <id>",
      "sessions delete <id>",
      "sessions clear",
    ],
    href: null,
  },
  {
    name: "locus init",
    description:
      "Initialize Locus in the current directory. Creates .locus/ structure, config, and gitignore entries.",
    icon: <Code2 className="h-4 w-4" />,
    color: "text-emerald",
    flags: [],
    href: null,
  },
  {
    name: "locus index",
    description:
      "Index the codebase for AI context. Uses AI to summarize directory structure.",
    icon: <FolderSearch className="h-4 w-4" />,
    color: "text-cyan",
    flags: ["--model <name>", "--provider <name>", "--dir <path>"],
    href: null,
  },
  {
    name: "locus config",
    description:
      "Manage CLI settings — API keys, provider, model, and Telegram configuration.",
    icon: <Settings className="h-4 w-4" />,
    color: "text-violet",
    flags: ["setup", "show", "set <key> <value>", "remove"],
    href: null,
  },
  {
    name: "locus agents",
    description:
      "Manage agent worktrees — list active agents and clean up stale worktrees.",
    icon: <Bot className="h-4 w-4" />,
    color: "text-amber",
    flags: ["list", "clean", "clean --all"],
    href: null,
  },
  {
    name: "locus docs",
    description:
      "Sync workspace documents from the cloud to .locus/documents/.",
    icon: <Terminal className="h-4 w-4" />,
    color: "text-emerald",
    flags: ["sync"],
    href: null,
  },
];

export default function CliPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="flex-1">
        {/* Hero */}
        <section className="relative pt-36 pb-20 md:pt-44 md:pb-28 overflow-hidden">
          <div className="mesh-gradient-hero absolute inset-0" />
          <div className="max-w-4xl px-6 mx-auto relative text-center">
            <p className="text-xs font-medium tracking-[0.2em] uppercase text-cyan mb-4">
              CLI Reference
            </p>
            <h1 className="text-4xl md:text-6xl font-bold tracking-tight text-white mb-6">
              Every command at your fingertips
            </h1>
            <p className="text-base md:text-lg text-muted-foreground max-w-xl mx-auto leading-relaxed">
              The complete command-line reference for Locus. Install, configure,
              plan, and run AI agents — all from your terminal.
            </p>
          </div>
        </section>

        {/* Install */}
        <section className="pb-20 relative">
          <div className="max-w-3xl px-6 mx-auto">
            <h2 className="text-2xl font-bold tracking-tight text-white mb-6 text-center">
              Installation
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="rounded-xl border border-border/40 bg-[#040406] overflow-hidden font-mono text-[12px] leading-relaxed">
                <div className="px-4 py-2.5 border-b border-border/20 bg-[#080810]">
                  <span className="text-[10px] text-muted-foreground font-sans">
                    Quick install (recommended)
                  </span>
                </div>
                <div className="p-4">
                  <p>
                    <span className="text-violet/50">$ </span>
                    <span className="text-foreground">
                      curl -fsSL https://locusai.dev/install.sh | bash
                    </span>
                  </p>
                </div>
              </div>
              <div className="rounded-xl border border-border/40 bg-[#040406] overflow-hidden font-mono text-[12px] leading-relaxed">
                <div className="px-4 py-2.5 border-b border-border/20 bg-[#080810]">
                  <span className="text-[10px] text-muted-foreground font-sans">
                    npm / pnpm / yarn
                  </span>
                </div>
                <div className="p-4">
                  <p>
                    <span className="text-violet/50">$ </span>
                    <span className="text-foreground">
                      npm install -g @locusai/cli
                    </span>
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Commands */}
        <section className="pb-28 relative">
          <div className="max-w-3xl px-6 mx-auto">
            <div className="glow-line-multi mb-16" />
            <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-white mb-12 text-center">
              Commands
            </h2>
            <div className="space-y-4">
              {commands.map((cmd) => (
                <div
                  key={cmd.name}
                  className="rounded-xl border border-border/40 bg-[#060609] overflow-hidden"
                >
                  <div className="px-5 py-4">
                    <div className="flex items-center gap-3 mb-2">
                      <div
                        className={`flex h-7 w-7 items-center justify-center rounded-lg bg-white/[0.04] border border-white/[0.06] ${cmd.color}`}
                      >
                        {cmd.icon}
                      </div>
                      <code className="text-sm font-medium text-white font-mono">
                        {cmd.name}
                      </code>
                      {cmd.href && (
                        <Link
                          href={cmd.href}
                          className="ml-auto text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
                        >
                          Learn more
                          <ArrowRight className="h-2.5 w-2.5" />
                        </Link>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed mb-3 pl-10">
                      {cmd.description}
                    </p>
                    {cmd.flags.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 pl-10">
                        {cmd.flags.map((flag) => (
                          <code
                            key={flag}
                            className="text-[10px] px-2 py-0.5 rounded bg-white/[0.03] border border-border/30 text-muted-foreground font-mono"
                          >
                            {flag}
                          </code>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="pb-28 relative">
          <div className="max-w-3xl px-6 mx-auto text-center">
            <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-white mb-4">
              Ready to start?
            </h2>
            <p className="text-muted-foreground max-w-md mx-auto text-sm mb-8 leading-relaxed">
              Install the CLI and initialize Locus in your project.
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
