"use client";

import { motion } from "framer-motion";
import { Terminal } from "lucide-react";
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
}

const products: Product[] = [
  {
    label: "Sprint Execution",
    labelColor: "text-cyan",
    title: "AI agents that execute your sprint, task by task",
    description:
      "Run your active sprint and watch AI agents claim tasks, write code, run tests, commit, and push — in order. Each task builds on the previous one. Failed runs resume exactly where they left off.",
    terminalTitle: "locus run",
    lines: [
      {
        text: "locus run",
        color: "text-foreground",
        prefix: "$ ",
      },
      { text: "", color: "" },
      {
        text: "Sprint 1 — 4 tasks on branch locus/sprint-1",
        color: "text-cyan",
      },
      { text: "", color: "" },
      {
        text: "  [1/4] Implement user auth              done",
        color: "text-emerald",
      },
      {
        text: "  [2/4] Add database migrations           done",
        color: "text-emerald",
      },
      {
        text: "  [3/4] Create API endpoints              done",
        color: "text-emerald",
      },
      {
        text: "  [4/4] Write integration tests           done",
        color: "text-emerald",
      },
      { text: "", color: "" },
      {
        text: "  All tasks completed. 4 PRs created.",
        color: "text-cyan",
      },
    ],
  },
  {
    label: "AI Planning",
    labelColor: "text-violet",
    title: "Describe a goal, get a structured sprint",
    description:
      "Tell Locus what you want to build. The AI analyzes your codebase, breaks your goal into GitHub issues with priority labels, type labels, and execution order — then creates them in a milestone.",
    terminalTitle: "locus plan",
    lines: [
      {
        text: 'locus plan "Build authentication with OAuth and JWT"',
        color: "text-foreground",
        prefix: "$ ",
      },
      { text: "", color: "" },
      {
        text: "  Planning with AI agent...",
        color: "text-violet",
      },
      {
        text: "  Analyzing codebase structure...",
        color: "text-violet",
      },
      { text: "", color: "" },
      {
        text: "  Created Sprint: Authentication",
        color: "text-emerald",
      },
      {
        text: "  #21  p:high    type:feature  order:1  Setup OAuth providers",
        color: "text-muted-foreground",
      },
      {
        text: "  #22  p:high    type:feature  order:2  JWT token service",
        color: "text-muted-foreground",
      },
      {
        text: "  #23  p:medium  type:feature  order:3  Auth middleware",
        color: "text-muted-foreground",
      },
      {
        text: "  #24  p:medium  type:chore    order:4  Auth tests",
        color: "text-muted-foreground",
      },
    ],
  },
  {
    label: "Interactive REPL",
    labelColor: "text-emerald",
    title: "A full-featured AI terminal for your codebase",
    description:
      "Start an interactive session with full project context. Streaming markdown, syntax highlighting, session persistence, tab completion, and slash commands. Resume any session later.",
    terminalTitle: "locus exec",
    lines: [
      {
        text: "locus exec",
        color: "text-foreground",
        prefix: "$ ",
      },
      { text: "", color: "" },
      {
        text: "  Locus REPL v3 — type /help for commands",
        color: "text-emerald",
      },
      { text: "", color: "" },
      {
        text: '  > "Add rate limiting to the API endpoints"',
        color: "text-foreground",
      },
      { text: "", color: "" },
      {
        text: "  Reading src/middleware/...",
        color: "text-muted-foreground",
      },
      {
        text: "  Writing src/middleware/rate-limit.ts...",
        color: "text-muted-foreground",
      },
      {
        text: "  Editing src/app.ts...",
        color: "text-muted-foreground",
      },
      { text: "", color: "" },
      {
        text: "  Done. 2 files created, 1 file modified.",
        color: "text-emerald",
      },
    ],
  },
  {
    label: "Code Review",
    labelColor: "text-amber",
    title: "AI-powered review for every pull request",
    description:
      "Review open PRs with AI analysis. Posts inline comments on GitHub. Catches bugs, security issues, and style violations. Iterate on feedback until the code is ready to merge.",
    terminalTitle: "locus review",
    lines: [
      { text: "locus review", color: "text-foreground", prefix: "$ " },
      { text: "", color: "" },
      {
        text: "  Reviewing 2 open PRs...",
        color: "text-amber",
      },
      { text: "", color: "" },
      {
        text: "  PR #18 — Add user authentication",
        color: "text-foreground",
      },
      {
        text: "    3 comments posted",
        color: "text-muted-foreground",
      },
      { text: "", color: "" },
      {
        text: "  PR #19 — Add database migrations",
        color: "text-foreground",
      },
      {
        text: "    No issues found",
        color: "text-emerald",
      },
    ],
  },
  {
    label: "Issue Management",
    labelColor: "text-rose",
    title: "Full control over issues and sprints from the CLI",
    description:
      "Create, list, and manage GitHub issues and sprints without leaving your terminal. Assign priorities, types, sprints, and reorder task execution with a single command.",
    terminalTitle: "locus sprint + locus issue",
    lines: [
      {
        text: 'locus sprint show "Sprint 1"',
        color: "text-foreground",
        prefix: "$ ",
      },
      { text: "", color: "" },
      {
        text: "  Sprint 1 — 75% complete",
        color: "text-rose",
      },
      {
        text: "  ████████████░░░░  3/4 tasks done",
        color: "text-muted-foreground",
      },
      { text: "", color: "" },
      {
        text: "  #12  order:1  done     Setup OAuth",
        color: "text-emerald",
      },
      {
        text: "  #13  order:2  done     JWT service",
        color: "text-emerald",
      },
      {
        text: "  #14  order:3  done     Auth middleware",
        color: "text-emerald",
      },
      {
        text: "  #15  order:4  queued   Auth tests",
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
            How it works
          </p>
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-white">
            Plan, execute, review, iterate
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
