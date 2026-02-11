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
  { text: "locus run --agents 3", color: "text-foreground", prefix: "$ " },
  { text: "", color: "" },
  {
    text: "🚀 Starting 3 agents in ~/dev/my-saas...",
    color: "text-cyan",
  },
  {
    text: "  Each task will run in an isolated worktree",
    color: "text-muted-foreground",
  },
  {
    text: "  Branches will be committed and pushed to remote",
    color: "text-muted-foreground",
  },
  { text: "", color: "" },
  {
    text: "  ● Agent spawned: agent-a1b2c3",
    color: "text-cyan",
  },
  {
    text: "  ● Claimed: Implement user authentication",
    color: "text-cyan",
  },
  {
    text: "  ● Agent spawned: agent-d4e5f6",
    color: "text-violet",
  },
  {
    text: "  ● Claimed: Add database migrations",
    color: "text-violet",
  },
  {
    text: "  ● Agent spawned: agent-g7h8i9",
    color: "text-amber",
  },
  {
    text: "  ● Claimed: Create API documentation",
    color: "text-amber",
  },
  { text: "", color: "" },
  {
    text: "📖 Reading auth/service.ts",
    color: "text-cyan",
  },
  {
    text: "   src/auth/service.ts",
    color: "text-muted-foreground",
  },
  {
    text: "   ✓ Completed (87ms)",
    color: "text-emerald",
  },
  {
    text: "⚡ Running npm run typecheck",
    color: "text-cyan",
  },
  {
    text: "   $ npm run typecheck",
    color: "text-muted-foreground",
  },
  {
    text: "   ✓ Completed (2340ms)",
    color: "text-emerald",
  },
  {
    text: "✍️  Writing auth.controller.ts",
    color: "text-cyan",
  },
  {
    text: "   src/auth/auth.controller.ts (4.2 KB)",
    color: "text-muted-foreground",
  },
  {
    text: "   ✓ Completed (54ms)",
    color: "text-emerald",
  },
  {
    text: '🔍 Searching for "endpoint" in src/',
    color: "text-cyan",
  },
  {
    text: "   Found 12 matches",
    color: "text-muted-foreground",
  },
  {
    text: "⚡ Running npm test -- auth",
    color: "text-cyan",
  },
  {
    text: "   ✓ Completed (5120ms) — Exit code: 0",
    color: "text-emerald",
  },
  { text: "", color: "" },
  {
    text: "  ✔ Completed: task-a1b2c3",
    color: "text-emerald",
  },
  {
    text: "  ✔ Completed: task-d4e5f6",
    color: "text-emerald",
  },
  {
    text: "  ✔ Completed: task-g7h8i9",
    color: "text-emerald",
  },
  { text: "", color: "" },
  {
    text: "All tasks completed. 3 PRs created.",
    color: "text-cyan",
  },
];

export function TerminalDemo() {
  const [visibleLines, setVisibleLines] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const startAnimation = () => {
      setVisibleLines(0);
      timerRef.current = setInterval(() => {
        setVisibleLines((prev) => {
          if (prev >= lines.length) {
            if (timerRef.current) clearInterval(timerRef.current);
            timerRef.current = null;
            setTimeout(startAnimation, 3000);
            return prev;
          }
          return prev + 1;
        });
      }, 400);
    };

    startAnimation();

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
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
          locus run &mdash; 3 agents
        </div>
      </div>

      {/* Terminal content */}
      <div
        ref={scrollRef}
        className="h-[320px] sm:h-[360px] md:h-[440px] overflow-hidden p-3 sm:p-5 md:p-6 relative z-10 bg-[#040406]"
      >
        {lines.slice(0, visibleLines).map((line, i) => (
          <motion.div
            key={`line-${i}`}
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
