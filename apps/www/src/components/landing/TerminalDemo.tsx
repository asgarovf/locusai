"use client";

import { motion } from "framer-motion";
import { Terminal } from "lucide-react";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

const steps = [
  { text: "locus index", color: "text-foreground" },
  { text: "ℹ Reading file tree...", color: "text-zinc-400" },
  { text: "✓ Index generated (42 Files)", color: "text-green-400" },
  { text: "", color: "text-foreground" }, // Spacer
  { text: "locus run", color: "text-foreground" },
  { text: "🤖 Locus Agent Orchestrator", color: "text-blue-400" },
  {
    text: "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━",
    color: "text-blue-400",
  },
  { text: "Workspace: locus-production", color: "text-zinc-400" },
  { text: "Sprint: sprint-24-q1", color: "text-zinc-400" },
  { text: "🚀 Agent started: agent-1718902", color: "text-green-400" },
  {
    text: "[10:24:00] [1718902] ℹ Found active sprint: Sprint 24",
    color: "text-blue-400",
  },
  {
    text: "[10:24:00] [1718902] ℹ Sprint tasks found: 12",
    color: "text-zinc-400",
  },
  {
    text: "[10:24:01] [1718902] ⚠ New tasks added. Regenerating Mindmap...",
    color: "text-yellow-400",
  },
  {
    text: "[10:24:04] [1718902] ✓ Sprint Mindmap updated",
    color: "text-green-400",
  },
  {
    text: "[10:24:05] [1718902] ✓ Claimed: Implement Dark Mode",
    color: "text-green-400",
  },
  {
    text: "[10:24:05] [1718902] ℹ Generating file tree...",
    color: "text-zinc-400",
  },
  {
    text: "[10:24:06] [1718902] ℹ Executing: Implement Dark Mode",
    color: "text-yellow-400",
  },
  {
    text: "[10:24:08] [1718902] ℹ Phase 1: Planning (Claude CLI)...",
    color: "text-purple-400",
  },
  {
    text: "[10:24:12] [1718902] ℹ Plan generated. Starting Execution...",
    color: "text-purple-400",
  },
  {
    text: "[10:24:25] [1718902] ℹ Syncing 2 artifacts to server...",
    color: "text-blue-400",
  },
  {
    text: "[10:24:28] [1718902] ✓ Task completed by Claude",
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
            {(i === 0 || i === 4) && (
              <span className="opacity-50 mr-2 select-none">$</span>
            )}
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
