import type { LucideIcon } from "lucide-react";
import {
  Bot,
  Box,
  Code2,
  GitBranch,
  Github,
  MessageSquare,
} from "lucide-react";
import Link from "next/link";

interface Tool {
  name: string;
  tag: string;
  icon: LucideIcon;
  color: string;
  href: string;
}

const tools: Tool[] = [
  {
    name: "Claude",
    tag: "AI Provider",
    icon: Bot,
    color: "text-violet",
    href: "https://docs.anthropic.com/en/docs/agents-and-tools/claude-code/overview",
  },
  {
    name: "Codex",
    tag: "AI Provider",
    icon: Code2,
    color: "text-emerald",
    href: "https://openai.com/index/introducing-codex/",
  },
  {
    name: "GitHub",
    tag: "Version Control",
    icon: Github,
    color: "text-foreground",
    href: "https://github.com",
  },
  {
    name: "Git",
    tag: "Branch Management",
    icon: GitBranch,
    color: "text-amber",
    href: "https://git-scm.com",
  },
  {
    name: "Telegram",
    tag: "Remote Control",
    icon: MessageSquare,
    color: "text-cyan",
    href: "https://telegram.org",
  },
  {
    name: "Bun",
    tag: "Runtime",
    icon: Box,
    color: "text-rose",
    href: "https://bun.sh",
  },
];

export function SupportedTools() {
  return (
    <section className="py-16 border-y border-border/20 relative">
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-violet/[0.02] to-transparent pointer-events-none" />

      <div className="max-w-5xl px-6 mx-auto mb-10 text-center relative">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-[0.2em]">
          Works with your favorite tools
        </p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 max-w-5xl px-6 mx-auto relative">
        {tools.map((tool) => (
          <Link
            key={tool.name}
            href={tool.href}
            target="_blank"
            className="group flex flex-col items-center gap-3 rounded-xl border border-border/20 bg-white/[0.02] px-4 py-5 hover:border-border/40 hover:bg-white/[0.04] transition-all duration-300"
          >
            <div
              className={`flex h-10 w-10 items-center justify-center rounded-xl bg-white/[0.04] border border-white/[0.06] ${tool.color}`}
            >
              <tool.icon className="h-5 w-5" />
            </div>
            <div className="text-center">
              <p className="text-sm font-medium text-white">{tool.name}</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">
                {tool.tag}
              </p>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
