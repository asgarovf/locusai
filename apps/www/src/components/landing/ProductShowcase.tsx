"use client";

import { motion } from "framer-motion";
import { ExternalLink, Terminal } from "lucide-react";
import { cn } from "@/lib/utils";

interface TerminalLine {
  text: string;
  color: string;
  prefix?: string;
}

interface Product {
  label: string;
  labelColor: string;
  title: string;
  description: string;
  terminalTitle: string;
  lines: TerminalLine[];
  link?: string;
}

const products: Product[] = [
  {
    label: "AI Agent",
    labelColor: "text-cyan",
    title: "Autonomous agents that ship code in parallel",
    description:
      "AI agents claim tasks from your sprint, write code, run tests, and push changes. A pull request is created when all tasks are done.",
    terminalTitle: "locus run",
    lines: [
      {
        text: "locus run --provider claude",
        color: "text-foreground",
        prefix: "$ ",
      },
      { text: "", color: "" },
      {
        text: "🚀 Starting agent in ~/dev/my-saas...",
        color: "text-cyan",
      },
      {
        text: "  Tasks will be executed sequentially on a single branch",
        color: "text-muted-foreground",
      },
      {
        text: "  Changes will be committed and pushed after each task",
        color: "text-muted-foreground",
      },
      { text: "", color: "" },
      { text: "  ● Agent spawned: agent-a1b2c3", color: "text-cyan" },
      { text: "  ● Claimed: Implement user auth", color: "text-cyan" },
      { text: "  ✔ Completed: Implement user auth", color: "text-emerald" },
      { text: "  ● Claimed: Add database migrations", color: "text-cyan" },
      { text: "  ✔ Completed: Add database migrations", color: "text-emerald" },
      { text: "  ● Claimed: Create API docs", color: "text-cyan" },
      { text: "  ✔ Completed: Create API docs", color: "text-emerald" },
      { text: "", color: "" },
      { text: "  All tasks done. PR created.", color: "text-cyan" },
    ],
  },
  {
    label: "Sprint Planning",
    labelColor: "text-violet",
    title: "Multi-agent planning meetings for your codebase",
    description:
      "Run AI planning meetings with specialized agents — Tech Lead, Architect, and Sprint Organizer — that collaborate to break down epics into actionable tasks. Generate technical mindmaps and ensure every piece of work fits together architecturally before a single line of code is written.",
    terminalTitle: "locus plan",
    lines: [
      {
        text: 'locus plan "Build authentication system with OAuth"',
        color: "text-foreground",
        prefix: "$ ",
      },
      { text: "", color: "" },
      { text: "locus plan --list", color: "text-foreground", prefix: "$ " },
      { text: "", color: "" },
      {
        text: "  ◯ Build authentication system with OAuth",
        color: "text-violet",
      },
      { text: "    5 tasks • 2 minutes ago", color: "text-muted-foreground" },
      { text: "", color: "" },
      {
        text: "locus plan --approve pl_8xk2m",
        color: "text-foreground",
        prefix: "$ ",
      },
      { text: "", color: "" },
      {
        text: "  ✔ Sprint created: Build authentication system",
        color: "text-emerald",
      },
      { text: "    Sprint ID: sp_3nf92k", color: "text-muted-foreground" },
      { text: "    5 tasks created", color: "text-muted-foreground" },
    ],
  },
  {
    label: "Code Review",
    labelColor: "text-amber",
    title: "Automated review for every pull request",
    description:
      "Get instant AI-powered code review on GitHub pull requests and local staged changes. Catches bugs, security issues, and style violations before they reach production.",
    terminalTitle: "locus review",
    lines: [
      { text: "locus review", color: "text-foreground", prefix: "$ " },
      { text: "", color: "" },
      {
        text: "🔍 Found 2 unreviewed PR(s). Starting reviewer...",
        color: "text-amber",
      },
      { text: "", color: "" },
      {
        text: "locus review local",
        color: "text-foreground",
        prefix: "$ ",
      },
      { text: "", color: "" },
      { text: "🔍 Reviewing staged changes...", color: "text-amber" },
      { text: "", color: "" },
      { text: "  ✔ Review complete!", color: "text-emerald" },
      {
        text: "  Report saved to: .locus/reviews/review-2026-02-11.md",
        color: "text-muted-foreground",
      },
    ],
  },
  {
    label: "CLI Toolkit",
    labelColor: "text-rose",
    title: "A powerful command line for every workflow",
    description:
      "Interactive REPL, exec mode for one-off tasks, session management, and built-in codebase indexing. Everything you need to work with AI agents from your terminal.",
    terminalTitle: "locus exec",
    lines: [
      {
        text: 'locus exec "add dark mode to settings page"',
        color: "text-foreground",
        prefix: "$ ",
      },
      { text: "", color: "" },
      {
        text: "🚀 Executing prompt with repository context...",
        color: "text-rose",
      },
      { text: "  [Tool: ReadFile] completed", color: "text-muted-foreground" },
      { text: "  [Tool: WriteFile] completed", color: "text-muted-foreground" },
      { text: "", color: "" },
      { text: "  ✔ Execution finished!", color: "text-emerald" },
      { text: "", color: "" },
      {
        text: "locus exec --interactive",
        color: "text-foreground",
        prefix: "$ ",
      },
      { text: "  Starting interactive REPL...", color: "text-rose" },
      {
        text: "locus exec sessions list",
        color: "text-foreground",
        prefix: "$ ",
      },
      {
        text: "  e8f2 — add dark mode to settings page",
        color: "text-muted-foreground",
      },
      {
        text: "    1 messages • just now",
        color: "text-muted-foreground",
      },
    ],
  },
  {
    label: "Cloud Dashboard",
    labelColor: "text-sky",
    title: "Your team's mission control for sprints",
    description:
      "Manage workspaces, visualize sprints on a kanban board, track team activity feeds, and organize your backlog — all from a collaborative cloud dashboard. Built for teams that want full visibility into their agentic workflows.",
    link: "https://app.locusai.dev",
    terminalTitle: "app.locusai.dev",
    lines: [
      {
        text: "locus login",
        color: "text-foreground",
        prefix: "$ ",
      },
      { text: "", color: "" },
      {
        text: "  ✔ Authenticated as team@company.dev",
        color: "text-emerald",
      },
      { text: "", color: "" },
      {
        text: "locus dash",
        color: "text-foreground",
        prefix: "$ ",
      },
      { text: "", color: "" },
      {
        text: "  Opening dashboard → app.locusai.dev",
        color: "text-sky",
      },
      { text: "", color: "" },
      {
        text: "  Workspace:  acme-eng",
        color: "text-muted-foreground",
      },
      {
        text: "  Sprints:    3 active",
        color: "text-muted-foreground",
      },
      {
        text: "  Backlog:    12 tasks",
        color: "text-muted-foreground",
      },
      {
        text: "  Members:    5 contributors",
        color: "text-muted-foreground",
      },
    ],
  },
];

function MiniTerminal({
  title,
  lines,
}: {
  title: string;
  lines: TerminalLine[];
}) {
  return (
    <div className="rounded-xl border border-border/40 bg-[#040406] overflow-hidden font-mono text-[11px] md:text-[12.5px] leading-relaxed w-full">
      {/* Title bar */}
      <div className="flex items-center gap-2 px-3.5 py-2.5 border-b border-border/20 bg-[#080810]">
        <div className="flex gap-1.5">
          <div className="w-2 h-2 rounded-full bg-rose/50" />
          <div className="w-2 h-2 rounded-full bg-amber/50" />
          <div className="w-2 h-2 rounded-full bg-emerald/50" />
        </div>
        <div className="flex-1 text-center text-[9px] text-muted-foreground flex items-center justify-center gap-1.5 font-sans">
          <Terminal className="w-2.5 h-2.5" />
          {title}
        </div>
      </div>
      {/* Lines */}
      <div className="p-4 md:p-5">
        {lines.map((line, i) => (
          <div
            key={i}
            className={cn(
              "whitespace-pre leading-[1.8]",
              line.color,
              !line.text && "h-2.5"
            )}
          >
            {line.prefix && (
              <span className="text-violet/50 select-none">{line.prefix}</span>
            )}
            {line.text}
          </div>
        ))}
      </div>
    </div>
  );
}

export function ProductShowcase() {
  return (
    <section className="py-28 relative overflow-hidden">
      <div className="max-w-6xl px-6 mx-auto relative">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="text-center mb-20"
        >
          <p className="text-xs font-medium tracking-[0.2em] uppercase text-muted-foreground mb-4">
            Products
          </p>
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-white">
            A complete platform for agentic engineering
          </h2>
        </motion.div>

        <div className="flex flex-col gap-24 md:gap-32">
          {products.map((product, i) => {
            const isReversed = i % 2 !== 0;

            return (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 32 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-60px" }}
                transition={{
                  duration: 0.7,
                  ease: [0.16, 1, 0.3, 1],
                }}
                className={cn(
                  "grid grid-cols-1 md:grid-cols-2 gap-10 md:gap-16 items-center",
                  isReversed && "md:[direction:rtl]"
                )}
              >
                {/* Text side */}
                <div className={cn(isReversed && "md:[direction:ltr]")}>
                  <p
                    className={cn(
                      "text-xs font-semibold tracking-[0.15em] uppercase mb-4",
                      product.labelColor
                    )}
                  >
                    {product.label}
                  </p>
                  <h3 className="text-2xl md:text-3xl font-bold tracking-tight text-white mb-4 leading-tight">
                    {product.title}
                  </h3>
                  <p className="text-[15px] text-muted-foreground leading-relaxed">
                    {product.description}
                  </p>
                  {product.link && (
                    <a
                      href={product.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={cn(
                        "inline-flex items-center gap-1.5 mt-4 text-sm font-medium transition-opacity hover:opacity-80",
                        product.labelColor
                      )}
                    >
                      Open Dashboard
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  )}
                </div>

                {/* Terminal side */}
                <div className={cn(isReversed && "md:[direction:ltr]")}>
                  <MiniTerminal
                    title={product.terminalTitle}
                    lines={product.lines}
                  />
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
