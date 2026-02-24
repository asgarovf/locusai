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
  // Phase 1: Plan
  {
    text: 'locus plan "Build OAuth integration with Google & GitHub"',
    color: "text-foreground",
    prefix: "$ ",
  },
  { text: "", color: "" },
  {
    text: "Planning with AI agent...",
    color: "text-violet",
  },
  {
    text: "  Analyzing codebase and requirements...",
    color: "text-violet",
  },
  { text: "", color: "" },
  {
    text: "  Created 4 GitHub issues in Sprint 1:",
    color: "text-emerald",
  },
  {
    text: "  #12  order:1  Implement Google OAuth provider",
    color: "text-muted-foreground",
  },
  {
    text: "  #13  order:2  Implement GitHub OAuth provider",
    color: "text-muted-foreground",
  },
  {
    text: "  #14  order:3  Add OAuth callback routes",
    color: "text-muted-foreground",
  },
  {
    text: "  #15  order:4  Create auth session middleware",
    color: "text-muted-foreground",
  },
  { text: "", color: "" },
  // Phase 2: Run sprint
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
    text: "  [1/4] Implement Google OAuth provider       done",
    color: "text-emerald",
  },
  {
    text: "  [2/4] Implement GitHub OAuth provider       done",
    color: "text-emerald",
  },
  {
    text: "  [3/4] Add OAuth callback routes             done",
    color: "text-emerald",
  },
  {
    text: "  [4/4] Create auth session middleware         done",
    color: "text-emerald",
  },
  { text: "", color: "" },
  {
    text: "  All tasks completed. 4 PRs created.",
    color: "text-cyan",
  },
  { text: "", color: "" },
  // Phase 3: Review
  { text: "locus review", color: "text-foreground", prefix: "$ " },
  { text: "", color: "" },
  {
    text: "  Reviewing 4 open PRs...",
    color: "text-amber",
  },
  {
    text: "  All PRs reviewed. No issues found.",
    color: "text-emerald",
  },
];

export function TerminalDemo() {
  const [visibleLines, setVisibleLines] = useState(0);
  const [iteration, setIteration] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const restartRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const startAnimation = () => {
      setVisibleLines(0);
      timerRef.current = setInterval(() => {
        setVisibleLines((prev) => {
          if (prev >= lines.length) {
            if (timerRef.current) clearInterval(timerRef.current);
            timerRef.current = null;
            restartRef.current = setTimeout(() => {
              setIteration((i) => i + 1);
              startAnimation();
            }, 3000);
            return prev;
          }
          return prev + 1;
        });
      }, 500);
    };

    startAnimation();

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (restartRef.current) clearTimeout(restartRef.current);
    };
  }, []);

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
