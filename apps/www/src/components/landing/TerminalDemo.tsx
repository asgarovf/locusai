"use client";

import { motion } from "framer-motion";
import { Terminal } from "lucide-react";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

const steps = [
  {
    text: "npx @locusai/cli run --api-key=lk_123_123 --workspace-id=123",
    color: "text-foreground",
  },
  { text: "", color: "text-foreground" },
  {
    text: "🚀 Starting agent in /Users/user/dev/my-project...",
    color: "text-green-400",
  },
  { text: "📋 Using active sprint: Sprint 1", color: "text-blue-400" },
  { text: "", color: "text-foreground" },
  { text: "🤖 Locus Agent Orchestrator", color: "text-blue-400" },
  {
    text: "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━",
    color: "text-blue-400",
  },
  {
    text: "Workspace: 123",
    color: "text-zinc-400",
  },
  {
    text: "Sprint: d37aab80-27f9-428c-881f-bc1f95832af8",
    color: "text-zinc-400",
  },
  { text: "API Base: https://api.locusai.dev/api", color: "text-zinc-400" },
  {
    text: "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━",
    color: "text-blue-400",
  },
  { text: "", color: "text-foreground" },
  {
    text: "🚀 Agent started: agent-1769190120436-fuet063",
    color: "text-green-400",
  },
  { text: "", color: "text-foreground" },
  {
    text: "[17:42:00] [-fuet063] ℹ Using Claude CLI for all phases",
    color: "text-zinc-400",
  },
  {
    text: "[17:42:00] [-fuet063] ✓ Agent started in .../dev/my-project",
    color: "text-green-400",
  },
  {
    text: "[17:42:00] [-fuet063] ℹ Found active sprint: Sprint 1 (d37a...)",
    color: "text-blue-400",
  },
  {
    text: "[17:42:01] [-fuet063] ℹ Sprint tasks found: 1",
    color: "text-zinc-400",
  },
  {
    text: "[17:42:01] [-fuet063] ℹ Skipping mindmap generation...",
    color: "text-zinc-400",
  },
  {
    text: "[17:42:01] [-fuet063] ✓ Claimed: Add button component",
    color: "text-green-400",
  },
  {
    text: "[17:42:01] [-fuet063] ℹ Executing: Add button component",
    color: "text-yellow-400",
  },
  {
    text: "[17:42:01] [-fuet063] ℹ Skipping Phase 1: Planning",
    color: "text-zinc-400",
  },
  {
    text: "[17:42:01] [-fuet063] ℹ Starting Execution...",
    color: "text-purple-400",
  },
  {
    text: "[17:44:43] [-fuet063] ℹ Reindexing codebase...",
    color: "text-zinc-400",
  },
  {
    text: "[17:44:43] [-fuet063] ℹ Generating file tree...",
    color: "text-zinc-400",
  },
  {
    text: "[17:44:43] [-fuet063] ℹ AI is analyzing codebase...",
    color: "text-purple-400",
  },
  {
    text: "[17:45:35] [-fuet063] ✓ Codebase reindexed successfully",
    color: "text-green-400",
  },
];

export function TerminalDemo() {
  const [activeStep, setActiveStep] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setActiveStep((prev) => (prev + 1) % (steps.length + 6));
    }, 800);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="rounded-xl border border-border bg-black/95 shadow-2xl overflow-hidden font-mono text-xs md:text-sm leading-relaxed w-full max-w-[95vw] md:max-w-2xl mx-auto backdrop-blur-sm">
      <div className="flex items-center gap-2 px-3 py-2 md:px-4 md:py-3 border-b border-border/20 bg-muted/10">
        <div className="flex gap-1.5">
          <div className="w-2.5 h-2.5 md:w-3 md:h-3 rounded-full bg-red-500/50" />
          <div className="w-2.5 h-2.5 md:w-3 md:h-3 rounded-full bg-yellow-500/50" />
          <div className="w-2.5 h-2.5 md:w-3 md:h-3 rounded-full bg-green-500/50" />
        </div>
        <div className="flex-1 text-center text-[10px] md:text-xs text-muted-foreground flex items-center justify-center gap-2">
          <Terminal className="w-3 h-3" />
          locus-cli — agent-worker
        </div>
      </div>
      <div className="p-3 md:p-6 h-[280px] md:h-[320px] flex flex-col justify-end overflow-x-auto">
        {steps.slice(0, activeStep + 1).map((step, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.2 }}
            className={cn("mb-1 whitespace-nowrap", step.color)}
          >
            {i === 0 && <span className="opacity-50 mr-2 select-none">$</span>}
            {step.text}
          </motion.div>
        ))}
        <motion.div
          animate={{ opacity: [0, 1, 0] }}
          transition={{ repeat: Infinity, duration: 0.8 }}
          className="w-1.5 h-3 md:w-2 md:h-4 bg-primary mt-1"
        />
      </div>
    </div>
  );
}
