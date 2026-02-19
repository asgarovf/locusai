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
    text: "🧠 Starting planning meeting...",
    color: "text-violet",
  },
  {
    text: "  ● Tech Lead analyzing codebase...",
    color: "text-violet",
  },
  {
    text: "  ● Architect designing system boundaries...",
    color: "text-violet",
  },
  {
    text: "  ● Sprint Organizer breaking down tasks...",
    color: "text-violet",
  },
  { text: "", color: "" },
  {
    text: "  ✔ Plan ready — 4 tasks across 2 epics",
    color: "text-emerald",
  },
  {
    text: "  ✔ Sprint created: sp_8xk2m",
    color: "text-emerald",
  },
  { text: "", color: "" },
  // Phase 2: Run with multiple agents
  {
    text: "locus run",
    color: "text-foreground",
    prefix: "$ ",
  },
  { text: "", color: "" },
  {
    text: "🚀 Starting agent in ~/dev/my-saas...",
    color: "text-cyan",
  },
  {
    text: "  Tasks will be executed in parallel across branches",
    color: "text-muted-foreground",
  },
  { text: "", color: "" },
  {
    text: "  ● Agent #1 → Implement Google OAuth provider",
    color: "text-cyan",
  },
  {
    text: "  ● Agent #2 → Implement GitHub OAuth provider",
    color: "text-cyan",
  },
  {
    text: "  ● Agent #3 → Add OAuth callback routes",
    color: "text-cyan",
  },
  { text: "", color: "" },
  {
    text: "  ✔ Agent #2 completed: GitHub OAuth provider",
    color: "text-emerald",
  },
  {
    text: "  ● Agent #2 → Create auth session middleware",
    color: "text-cyan",
  },
  {
    text: "  ✔ Agent #1 completed: Google OAuth provider",
    color: "text-emerald",
  },
  {
    text: "  ✔ Agent #3 completed: OAuth callback routes",
    color: "text-emerald",
  },
  {
    text: "  ✔ Agent #2 completed: Auth session middleware",
    color: "text-emerald",
  },
  { text: "", color: "" },
  {
    text: "  All tasks done. 3 PRs created.",
    color: "text-cyan",
  },
  { text: "", color: "" },
  // Phase 3: Review
  { text: "locus review", color: "text-foreground", prefix: "$ " },
  { text: "", color: "" },
  {
    text: "🔍 Found 3 unreviewed PR(s). Starting reviewer...",
    color: "text-amber",
  },
  {
    text: "  ✔ All PRs reviewed. No issues found.",
    color: "text-emerald",
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
