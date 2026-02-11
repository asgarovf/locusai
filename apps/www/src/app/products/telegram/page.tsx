import {
  ArrowRight,
  Bot,
  GitBranch,
  Lock,
  Play,
  Terminal,
  Timer,
} from "lucide-react";
import { Metadata } from "next";
import Link from "next/link";
import { Footer, Navbar } from "@/components/layout";

export const metadata: Metadata = {
  title: "Telegram Bot",
  description:
    "Remote control your Locus agents, plan sprints, run tasks, and execute git commands — all from Telegram.",
};

const commandGroups = [
  {
    title: "Planning",
    color: "text-violet",
    commands: [
      { cmd: "/plan <directive>", desc: "Start a planning meeting" },
      { cmd: "/plans", desc: "List pending plans" },
      { cmd: "/approve <id>", desc: "Approve a plan and create sprint" },
      { cmd: "/reject <id> <feedback>", desc: "Reject with feedback" },
      { cmd: "/cancel <id>", desc: "Cancel a plan" },
    ],
  },
  {
    title: "Execution",
    color: "text-cyan",
    commands: [
      { cmd: "/run", desc: "Start agents on sprint tasks" },
      { cmd: "/stop", desc: "Stop all running processes" },
      { cmd: "/exec <prompt>", desc: "One-shot AI execution" },
      { cmd: "/tasks", desc: "List active tasks" },
    ],
  },
  {
    title: "Git & Dev",
    color: "text-amber",
    commands: [
      { cmd: "/git status", desc: "Show working tree status" },
      { cmd: "/git diff", desc: "View staged/unstaged changes" },
      { cmd: "/git pr list", desc: "List open pull requests" },
      { cmd: "/dev build", desc: "Run build command" },
      { cmd: "/dev test", desc: "Run test suite" },
      { cmd: "/dev lint", desc: "Run linter" },
    ],
  },
  {
    title: "Status",
    color: "text-emerald",
    commands: [
      { cmd: "/status", desc: "Show running processes" },
      { cmd: "/agents", desc: "List agent worktrees" },
    ],
  },
];

const features = [
  {
    icon: <Lock className="h-4 w-4" />,
    title: "Single-chat authorization",
    description:
      "Only responds to your configured chat ID. No unauthorized access to your development environment.",
    color: "text-emerald",
  },
  {
    icon: <Terminal className="h-4 w-4" />,
    title: "Whitelisted commands",
    description:
      "Only pre-approved commands can be executed. No arbitrary shell access — just the tools you need.",
    color: "text-cyan",
  },
  {
    icon: <Timer className="h-4 w-4" />,
    title: "Per-command timeouts",
    description:
      "Git commands: 60s, dev commands: 5min, exec: 10min. Long-running operations are safely bounded.",
    color: "text-amber",
  },
  {
    icon: <Play className="h-4 w-4" />,
    title: "Runs as a service",
    description:
      "Installs as a systemd service (Linux) or LaunchAgent (macOS). Starts on boot, runs continuously.",
    color: "text-violet",
  },
  {
    icon: <Bot className="h-4 w-4" />,
    title: "Full CLI access",
    description:
      "Plan sprints, run agents, review code, and execute prompts — everything the CLI can do, from your phone.",
    color: "text-rose",
  },
  {
    icon: <GitBranch className="h-4 w-4" />,
    title: "Git operations",
    description:
      "Status, diff, commit, push, PR creation — run whitelisted git and gh commands remotely.",
    color: "text-foreground",
  },
];

export default function TelegramPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="flex-1">
        {/* Hero */}
        <section className="relative pt-36 pb-20 md:pt-44 md:pb-28 overflow-hidden">
          <div className="mesh-gradient-hero absolute inset-0" />
          <div className="max-w-4xl px-6 mx-auto relative text-center">
            <p className="text-xs font-medium tracking-[0.2em] uppercase text-emerald mb-4">
              Telegram Bot
            </p>
            <h1 className="text-4xl md:text-6xl font-bold tracking-tight text-white mb-6">
              Your dev environment, in your pocket
            </h1>
            <p className="text-base md:text-lg text-muted-foreground max-w-xl mx-auto leading-relaxed">
              Remote control your Locus agents, plan sprints, review code, and
              run git commands — all from Telegram. Set it up once, manage
              everything from anywhere.
            </p>
          </div>
        </section>

        {/* Setup */}
        <section className="pb-24 relative">
          <div className="max-w-3xl px-6 mx-auto">
            <h2 className="text-2xl font-bold tracking-tight text-white mb-8 text-center">
              Quick setup
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
                <p className="text-muted-foreground">
                  # Install the Telegram bot package
                </p>
                <p>
                  <span className="text-violet/50">$ </span>
                  <span className="text-foreground">
                    npm install -g @locusai/telegram
                  </span>
                </p>
                <p className="h-3" />
                <p className="text-muted-foreground"># Configure the bot</p>
                <p>
                  <span className="text-violet/50">$ </span>
                  <span className="text-foreground">
                    locus telegram setup --token &lt;BOT_TOKEN&gt; --chat-id
                    &lt;CHAT_ID&gt;
                  </span>
                </p>
                <p className="h-3" />
                <p className="text-muted-foreground">
                  # Start the bot (runs as a service)
                </p>
                <p>
                  <span className="text-violet/50">$ </span>
                  <span className="text-foreground">locus-telegram</span>
                </p>
                <p className="h-3" />
                <p className="text-emerald">
                  ✔ Telegram bot connected and listening
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Commands */}
        <section className="pb-28 relative">
          <div className="max-w-4xl px-6 mx-auto">
            <div className="glow-line-multi mb-16" />
            <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-white mb-12 text-center">
              Available commands
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {commandGroups.map((group) => (
                <div
                  key={group.title}
                  className="rounded-xl border border-border/40 bg-[#060609] overflow-hidden"
                >
                  <div className="px-5 py-3 border-b border-border/20 bg-[#080810]">
                    <h3
                      className={`text-xs font-medium tracking-widest uppercase ${group.color}`}
                    >
                      {group.title}
                    </h3>
                  </div>
                  <div className="divide-y divide-border/10">
                    {group.commands.map((c) => (
                      <div
                        key={c.cmd}
                        className="flex items-start gap-3 px-5 py-2.5"
                      >
                        <code className="text-xs text-foreground/90 font-mono shrink-0">
                          {c.cmd}
                        </code>
                        <span className="text-xs text-muted-foreground ml-auto text-right">
                          {c.desc}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Features */}
        <section className="pb-28 relative">
          <div className="max-w-5xl px-6 mx-auto">
            <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-white mb-12 text-center">
              Secure by design
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {features.map((feat) => (
                <div key={feat.title}>
                  <div
                    className={`flex h-8 w-8 items-center justify-center rounded-lg bg-white/[0.04] border border-white/[0.06] ${feat.color} mb-4`}
                  >
                    {feat.icon}
                  </div>
                  <h3 className="text-sm font-medium text-white mb-2">
                    {feat.title}
                  </h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {feat.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="pb-28 relative">
          <div className="max-w-3xl px-6 mx-auto text-center">
            <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-white mb-4">
              Manage your agents from anywhere
            </h2>
            <p className="text-muted-foreground max-w-md mx-auto text-sm mb-8 leading-relaxed">
              Set up the Telegram bot and control your entire development
              workflow from your phone.
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
