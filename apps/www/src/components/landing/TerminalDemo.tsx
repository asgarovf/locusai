"use client";

import { motion } from "framer-motion";
import { Terminal } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

interface Line {
  text: string;
  color: string;
  prefix?: string;
}

const lines: Line[] = [
  // Phase 1: Sandbox setup
  {
    text: "locus sandbox",
    color: "text-foreground",
    prefix: "$ ",
  },
  { text: "", color: "" },
  {
    text: "  Pulling locus-sandbox image...",
    color: "text-violet",
  },
  {
    text: "  Creating Claude sandbox...          done",
    color: "text-emerald",
  },
  {
    text: "  Creating Codex sandbox...           done",
    color: "text-emerald",
  },
  {
    text: "  Agents run in isolated Docker containers.",
    color: "text-muted-foreground",
  },
  { text: "", color: "" },
  // Phase 2: Plan from GitHub issue context
  {
    text: 'locus plan "Add JWT auth with refresh tokens"',
    color: "text-foreground",
    prefix: "$ ",
  },
  { text: "", color: "" },
  {
    text: "  Analyzing codebase in sandbox...",
    color: "text-violet",
  },
  { text: "", color: "" },
  {
    text: "  Created 3 issues in Sprint 1:",
    color: "text-emerald",
  },
  {
    text: "  #21  order:1  Add JWT auth middleware",
    color: "text-muted-foreground",
  },
  {
    text: "  #22  order:2  Create login & register endpoints",
    color: "text-muted-foreground",
  },
  {
    text: "  #23  order:3  Add protected route guards",
    color: "text-muted-foreground",
  },
  { text: "", color: "" },
  // Phase 3: Run sprint in sandbox
  {
    text: "locus run",
    color: "text-foreground",
    prefix: "$ ",
  },
  { text: "", color: "" },
  {
    text: "  Sprint 1 — 3 tasks (sandboxed)",
    color: "text-cyan",
  },
  { text: "", color: "" },
  {
    text: "  [1/3] Add JWT auth middleware            PR #31",
    color: "text-emerald",
  },
  {
    text: "  [2/3] Create login & register endpoints  PR #32",
    color: "text-emerald",
  },
  {
    text: "  [3/3] Add protected route guards         PR #33",
    color: "text-emerald",
  },
  { text: "", color: "" },
  {
    text: "  All tasks completed. 3 PRs created.",
    color: "text-cyan",
  },
  { text: "", color: "" },
  // Phase 4: AI-powered review
  { text: "locus review", color: "text-foreground", prefix: "$ " },
  { text: "", color: "" },
  {
    text: "  Reviewing 3 PRs...",
    color: "text-amber",
  },
  {
    text: "  PR #31 — approved",
    color: "text-emerald",
  },
  {
    text: "  PR #32 — 1 suggestion",
    color: "text-amber",
  },
  {
    text: "  PR #33 — approved",
    color: "text-emerald",
  },
  { text: "", color: "" },
  // Phase 5: Iterate on feedback
  {
    text: "locus iterate --pr 32",
    color: "text-foreground",
    prefix: "$ ",
  },
  { text: "", color: "" },
  {
    text: "  Applying review feedback in sandbox...",
    color: "text-violet",
  },
  {
    text: "  PR #32 updated — changes pushed.",
    color: "text-emerald",
  },
];

export function TerminalDemo() {
  const [visibleLines, setVisibleLines] = useState(0);
  const [iteration, setIteration] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Drive the line-by-line animation from the `iteration` counter.
  // When `iteration` changes the effect re-runs, resets visibleLines to 0,
  // and starts a fresh interval — no recursive closure issues.
  useEffect(() => {
    setVisibleLines(0);

    const timer = setInterval(() => {
      setVisibleLines((prev) => {
        if (prev >= lines.length) {
          clearInterval(timer);
          return prev;
        }
        return prev + 1;
      });
    }, 500);

    return () => clearInterval(timer);
  }, [iteration]);

  // Separate effect: once all lines are visible, schedule the next iteration.
  useEffect(() => {
    if (visibleLines < lines.length) return;

    const timeout = setTimeout(() => {
      setIteration((i) => i + 1);
    }, 3000);

    return () => clearTimeout(timeout);
  }, [visibleLines]);

  // biome-ignore lint/correctness/useExhaustiveDependencies: we need to scroll the terminal to the bottom when the visible lines change
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [visibleLines]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
      className="relative rounded-xl sm:rounded-2xl border border-border/50 bg-[#040406] overflow-hidden font-mono text-[11px] sm:text-[12px] md:text-[14px] leading-relaxed w-full mx-auto flex flex-col"
    >
      {/* Title bar */}
      <div className="flex items-center gap-2.5 px-4 py-3 border-b border-border/20 bg-[#080810] shrink-0 relative z-10">
        <div className="flex gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-rose/60" />
          <div className="w-2.5 h-2.5 rounded-full bg-amber/60" />
          <div className="w-2.5 h-2.5 rounded-full bg-emerald/60" />
        </div>
        <div className="flex-1 text-center text-[10px] text-muted-foreground flex items-center justify-center gap-1.5 font-sans">
          <Terminal className="w-3 h-3" />
          locus cli
        </div>
      </div>

      {/* Terminal content */}
      <div
        ref={scrollRef}
        className="h-[320px] sm:h-[360px] md:h-[440px] overflow-hidden p-3 sm:p-5 md:p-6 relative z-10 bg-[#040406]"
      >
        {lines.slice(0, visibleLines).map((line, i) => (
          <motion.div
            key={`line-${iteration}-${i}`}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.15 }}
            className={cn(
              "whitespace-pre leading-[1.7]",
              line.color,
              !line.text && "h-3"
            )}
          >
            {line.prefix && (
              <span className="text-violet/50 select-none">{line.prefix}</span>
            )}
            {line.text}
          </motion.div>
        ))}

        {/* Blinking cursor */}
        <div className="flex items-center mt-1">
          <span className="text-violet/50 mr-1 select-none">
            {visibleLines >= lines.length ? "$ " : ""}
          </span>
          <div className="w-[7px] h-[15px] bg-violet/70 cursor-blink" />
        </div>
      </div>
    </motion.div>
  );
}
