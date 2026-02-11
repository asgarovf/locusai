import {
  ArrowRight,
  Eye,
  GitBranch,
  Globe,
  HardDrive,
  Lock,
  Server,
  Shield,
  ShieldCheck,
} from "lucide-react";
import { Metadata } from "next";
import Link from "next/link";
import { Footer, Navbar } from "@/components/layout";

export const metadata: Metadata = {
  title: "Security",
  description:
    "How Locus keeps your code safe. Local execution, git worktree isolation, no cloud dependency, and full transparency.",
};

const principles = [
  {
    icon: <HardDrive className="h-5 w-5" />,
    title: "Runs entirely on your machine",
    description:
      "Locus agents execute locally using your own AI provider credentials. Your code, your prompts, and your output never pass through Locus servers. The CLI communicates with the Locus API only for workspace management — task assignments, sprint status, and plan approvals.",
    color: "text-cyan",
  },
  {
    icon: <GitBranch className="h-5 w-5" />,
    title: "Git worktree isolation",
    description:
      "Each agent runs in a separate git worktree under .locus-worktrees/. This means agents can't interfere with each other or with your working directory. If an agent produces bad output, the worktree is simply discarded — your main branch is never touched.",
    color: "text-violet",
  },
  {
    icon: <Lock className="h-5 w-5" />,
    title: "No arbitrary code execution",
    description:
      "The Telegram bot only accepts whitelisted commands — planning, reviewing, agent management, and pre-approved git/dev operations. There is no arbitrary shell access. Each command type has its own timeout to prevent runaway processes.",
    color: "text-emerald",
  },
  {
    icon: <Eye className="h-5 w-5" />,
    title: "Fully open source",
    description:
      "Every line of Locus is MIT-licensed and available on GitHub. You can audit the code, verify what data flows where, and modify anything. No black boxes, no proprietary backends processing your code.",
    color: "text-amber",
  },
  {
    icon: <Server className="h-5 w-5" />,
    title: "Self-host everything",
    description:
      "Deploy the full stack on your own infrastructure. The install script sets up agents and the Telegram bot as system services on your own servers. No dependency on hosted infrastructure beyond your chosen AI provider.",
    color: "text-rose",
  },
  {
    icon: <ShieldCheck className="h-5 w-5" />,
    title: "Credentials stay local",
    description:
      "API keys and tokens are stored in .locus/settings.json — a local file on your machine. Provider credentials (Claude, Codex) are managed by the respective CLI tools and never sent to Locus. The .locus/ directory is gitignored by default.",
    color: "text-cyan",
  },
];

const dataFlow = [
  {
    label: "Your code & prompts",
    destination: "Your AI provider (Claude / Codex)",
    note: "Direct. Never touches Locus servers.",
    color: "text-emerald",
  },
  {
    label: "Task status & sprint data",
    destination: "Locus API (app.locusai.dev)",
    note: "Workspace management only. No code content.",
    color: "text-violet",
  },
  {
    label: "PR reviews",
    destination: "GitHub (via gh CLI)",
    note: "Direct API calls from your machine.",
    color: "text-amber",
  },
  {
    label: "Telegram commands",
    destination: "Telegram Bot API",
    note: "Single authorized chat only.",
    color: "text-cyan",
  },
];

export default function SecurityPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="flex-1">
        {/* Hero */}
        <section className="relative pt-36 pb-20 md:pt-44 md:pb-28 overflow-hidden">
          <div className="mesh-gradient-hero absolute inset-0" />
          <div className="max-w-4xl px-6 mx-auto relative text-center">
            <p className="text-xs font-medium tracking-[0.2em] uppercase text-emerald mb-4">
              Security
            </p>
            <h1 className="text-4xl md:text-6xl font-bold tracking-tight text-white mb-6">
              Your code never leaves your machine
            </h1>
            <p className="text-base md:text-lg text-muted-foreground max-w-xl mx-auto leading-relaxed">
              Locus is designed with security-first principles. Local execution,
              git isolation, no cloud dependency, and full source transparency.
            </p>
          </div>
        </section>

        {/* Principles */}
        <section className="pb-28 relative">
          <div className="max-w-3xl px-6 mx-auto">
            <div className="space-y-12">
              {principles.map((principle) => (
                <div key={principle.title} className="flex gap-5">
                  <div
                    className={`flex h-10 w-10 items-center justify-center rounded-xl bg-white/[0.04] border border-white/[0.06] ${principle.color} shrink-0 mt-0.5`}
                  >
                    {principle.icon}
                  </div>
                  <div>
                    <h3 className="text-base font-semibold text-white mb-2">
                      {principle.title}
                    </h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {principle.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Data flow */}
        <section className="pb-28 relative">
          <div className="max-w-3xl px-6 mx-auto">
            <div className="glow-line-multi mb-16" />
            <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-white mb-4 text-center">
              Data flow
            </h2>
            <p className="text-sm text-muted-foreground text-center mb-10 max-w-lg mx-auto leading-relaxed">
              Here&apos;s exactly what data goes where when you use Locus.
            </p>
            <div className="rounded-xl border border-border/40 bg-[#060609] overflow-hidden">
              <div className="divide-y divide-border/10">
                {dataFlow.map((item) => (
                  <div key={item.label} className="px-5 py-4">
                    <div className="flex items-center gap-2 mb-1">
                      <Globe className="h-3 w-3 text-muted-foreground" />
                      <span className="text-xs font-medium text-white">
                        {item.label}
                      </span>
                      <ArrowRight className="h-3 w-3 text-muted-foreground" />
                      <span className={`text-xs font-medium ${item.color}`}>
                        {item.destination}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground pl-5">
                      {item.note}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Reporting */}
        <section className="pb-28 relative">
          <div className="max-w-3xl px-6 mx-auto text-center">
            <Shield className="h-8 w-8 text-emerald mx-auto mb-4" />
            <h2 className="text-2xl font-bold tracking-tight text-white mb-3">
              Found a vulnerability?
            </h2>
            <p className="text-sm text-muted-foreground max-w-md mx-auto leading-relaxed mb-6">
              We take security seriously. If you discover a vulnerability,
              please report it responsibly via GitHub Issues or contact us
              directly.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-4">
              <Link
                href="https://github.com/asgarovf/locusai/issues"
                target="_blank"
                className="inline-flex items-center gap-2 text-sm font-medium bg-white text-background px-7 py-3 rounded-xl hover:bg-white/85 transition-colors"
              >
                Report on GitHub
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
              <Link
                href="https://github.com/asgarovf/locusai"
                target="_blank"
                className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                View source code
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
