import {
  ArrowRight,
  Clock,
  Cloud,
  Cpu,
  Lock,
  Server,
  Terminal,
  Wrench,
} from "lucide-react";
import { Metadata } from "next";
import Link from "next/link";
import { Footer, Navbar } from "@/components/layout";

export const metadata: Metadata = {
  title: "Self-Hosting",
  description:
    "Deploy Locus agents on your own servers for 24/7 availability. One-command setup for Ubuntu, Debian, and macOS.",
};

const installs = [
  { label: "Git, curl, jq, htop, tmux", color: "text-muted-foreground" },
  { label: "GitHub CLI (gh)", color: "text-muted-foreground" },
  { label: "Node.js 22+", color: "text-muted-foreground" },
  { label: "Bun package manager", color: "text-muted-foreground" },
  { label: "Claude Code CLI", color: "text-muted-foreground" },
  { label: "Locus CLI (@locusai/cli)", color: "text-cyan" },
  { label: "Locus Telegram Bot (@locusai/telegram)", color: "text-emerald" },
];

const features = [
  {
    icon: <Terminal className="h-4 w-4" />,
    title: "One-command setup",
    description:
      "A single curl command installs everything — Node.js, CLI, Telegram bot, and system services. Works on Ubuntu, Debian, and macOS.",
    color: "text-cyan",
  },
  {
    icon: <Clock className="h-4 w-4" />,
    title: "24/7 availability",
    description:
      "Agents and the Telegram bot run as system services that start on boot. No need to keep a terminal open.",
    color: "text-violet",
  },
  {
    icon: <Lock className="h-4 w-4" />,
    title: "Your infrastructure",
    description:
      "Code stays on your servers. No data sent to third parties. Bring your own AI provider credentials.",
    color: "text-emerald",
  },
  {
    icon: <Server className="h-4 w-4" />,
    title: "Systemd & LaunchAgent",
    description:
      "Automatically configures systemd services (Linux) or LaunchAgents (macOS) for the Telegram bot.",
    color: "text-amber",
  },
  {
    icon: <Wrench className="h-4 w-4" />,
    title: "Non-interactive mode",
    description:
      "Pass all configuration via flags for fully automated provisioning. Perfect for CI/CD and infrastructure-as-code.",
    color: "text-rose",
  },
  {
    icon: <Cloud className="h-4 w-4" />,
    title: "VPS ready",
    description:
      "Runs on any VPS, cloud instance, or bare-metal server. Minimal resource requirements — just Node.js and git.",
    color: "text-cyan",
  },
];

export default function SelfHostingPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="flex-1">
        {/* Hero */}
        <section className="relative pt-36 pb-20 md:pt-44 md:pb-28 overflow-hidden">
          <div className="mesh-gradient-hero absolute inset-0" />
          <div className="max-w-4xl px-6 mx-auto relative text-center">
            <p className="text-xs font-medium tracking-[0.2em] uppercase text-rose mb-4">
              Self-Hosting
            </p>
            <h1 className="text-4xl md:text-6xl font-bold tracking-tight text-white mb-6">
              Deploy agents on your own servers
            </h1>
            <p className="text-base md:text-lg text-muted-foreground max-w-xl mx-auto leading-relaxed">
              One-command setup for Ubuntu, Debian, and macOS. Run agents 24/7
              with system services, manage everything via Telegram.
            </p>
          </div>
        </section>

        {/* Install commands */}
        <section className="pb-24 relative">
          <div className="max-w-3xl px-6 mx-auto">
            <h2 className="text-2xl font-bold tracking-tight text-white mb-8 text-center">
              Install in one command
            </h2>

            {/* Interactive */}
            <div className="rounded-xl border border-border/40 bg-[#040406] overflow-hidden font-mono text-[12px] md:text-[13px] leading-relaxed mb-6">
              <div className="flex items-center gap-2 px-4 py-2.5 border-b border-border/20 bg-[#080810]">
                <div className="flex gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-rose/50" />
                  <div className="w-2 h-2 rounded-full bg-amber/50" />
                  <div className="w-2 h-2 rounded-full bg-emerald/50" />
                </div>
                <span className="text-[10px] text-muted-foreground font-sans flex items-center gap-1.5 mx-auto">
                  <Terminal className="w-2.5 h-2.5" />
                  Interactive mode
                </span>
              </div>
              <div className="p-5">
                <p className="text-muted-foreground">
                  # Auto-detects OS, prompts for configuration
                </p>
                <p>
                  <span className="text-violet/50">$ </span>
                  <span className="text-foreground">
                    curl -fsSL https://locusai.dev/install.sh | bash
                  </span>
                </p>
              </div>
            </div>

            {/* Non-interactive */}
            <div className="rounded-xl border border-border/40 bg-[#040406] overflow-hidden font-mono text-[12px] md:text-[13px] leading-relaxed">
              <div className="flex items-center gap-2 px-4 py-2.5 border-b border-border/20 bg-[#080810]">
                <div className="flex gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-rose/50" />
                  <div className="w-2 h-2 rounded-full bg-amber/50" />
                  <div className="w-2 h-2 rounded-full bg-emerald/50" />
                </div>
                <span className="text-[10px] text-muted-foreground font-sans flex items-center gap-1.5 mx-auto">
                  <Terminal className="w-2.5 h-2.5" />
                  Non-interactive mode
                </span>
              </div>
              <div className="p-5">
                <p className="text-muted-foreground">
                  # Fully automated — pass all config via flags
                </p>
                <p>
                  <span className="text-violet/50">$ </span>
                  <span className="text-foreground">
                    curl -fsSL https://locusai.dev/install.sh | bash -s -- \
                  </span>
                </p>
                <p className="text-foreground pl-4">
                  --repo &quot;https://github.com/user/project&quot; \
                </p>
                <p className="text-foreground pl-4">
                  --api-key &quot;locus-api-key&quot; \
                </p>
                <p className="text-foreground pl-4">
                  --telegram-token &quot;bot123:ABC&quot; \
                </p>
                <p className="text-foreground pl-4">
                  --telegram-chat-id &quot;12345&quot; \
                </p>
                <p className="text-foreground pl-4">
                  --gh-token &quot;ghp_...&quot;
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* What gets installed */}
        <section className="pb-28 relative">
          <div className="max-w-2xl px-6 mx-auto">
            <div className="glow-line-multi mb-16" />
            <h2 className="text-2xl font-bold tracking-tight text-white mb-8 text-center">
              What gets installed
            </h2>
            <div className="rounded-xl border border-border/40 bg-[#060609] overflow-hidden">
              <div className="divide-y divide-border/10">
                {installs.map((item) => (
                  <div
                    key={item.label}
                    className="flex items-center gap-3 px-5 py-3"
                  >
                    <Cpu className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                    <span className={`text-sm ${item.color}`}>
                      {item.label}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Features */}
        <section className="pb-28 relative">
          <div className="max-w-5xl px-6 mx-auto">
            <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-white mb-12 text-center">
              Production ready
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

        {/* Service management */}
        <section className="pb-28 relative">
          <div className="max-w-3xl px-6 mx-auto">
            <h2 className="text-2xl font-bold tracking-tight text-white mb-8 text-center">
              Managing the service
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Linux */}
              <div className="rounded-xl border border-border/40 bg-[#040406] overflow-hidden font-mono text-[12px] leading-relaxed">
                <div className="px-4 py-2.5 border-b border-border/20 bg-[#080810]">
                  <span className="text-[10px] text-muted-foreground font-sans">
                    Linux (systemd)
                  </span>
                </div>
                <div className="p-4 space-y-1">
                  <p>
                    <span className="text-violet/50">$ </span>
                    <span className="text-foreground">
                      systemctl status locus-telegram
                    </span>
                  </p>
                  <p>
                    <span className="text-violet/50">$ </span>
                    <span className="text-foreground">
                      systemctl restart locus-telegram
                    </span>
                  </p>
                  <p>
                    <span className="text-violet/50">$ </span>
                    <span className="text-foreground">
                      journalctl -u locus-telegram -f
                    </span>
                  </p>
                </div>
              </div>

              {/* macOS */}
              <div className="rounded-xl border border-border/40 bg-[#040406] overflow-hidden font-mono text-[12px] leading-relaxed">
                <div className="px-4 py-2.5 border-b border-border/20 bg-[#080810]">
                  <span className="text-[10px] text-muted-foreground font-sans">
                    macOS (LaunchAgent)
                  </span>
                </div>
                <div className="p-4 space-y-1">
                  <p>
                    <span className="text-violet/50">$ </span>
                    <span className="text-foreground">
                      launchctl list | grep locus
                    </span>
                  </p>
                  <p>
                    <span className="text-violet/50">$ </span>
                    <span className="text-foreground">
                      launchctl stop com.locus.telegram
                    </span>
                  </p>
                  <p>
                    <span className="text-violet/50">$ </span>
                    <span className="text-foreground">
                      launchctl start com.locus.telegram
                    </span>
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="pb-28 relative">
          <div className="max-w-3xl px-6 mx-auto text-center">
            <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-white mb-4">
              Deploy your agents today
            </h2>
            <p className="text-muted-foreground max-w-md mx-auto text-sm mb-8 leading-relaxed">
              Spin up a VPS, run the install script, and have agents working
              24/7 in minutes.
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
