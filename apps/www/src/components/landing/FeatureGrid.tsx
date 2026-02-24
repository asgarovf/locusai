"use client";

import { motion } from "framer-motion";
import type { LucideIcon } from "lucide-react";
import {
  Bot,
  BrainCircuit,
  FileSearch,
  GitFork,
  Github,
  Terminal,
} from "lucide-react";

interface Feature {
  title: string;
  description: string;
  icon: LucideIcon;
  color: string;
}

const features: Feature[] = [
  {
    title: "GitHub Is Your Backend",
    description:
      "No servers, no database, no API keys. Issues are tasks, Milestones are sprints, Labels track status, and PRs are deliverables. Everything lives on GitHub.",
    icon: Github,
    color: "text-cyan",
  },
  {
    title: "Sprint Execution",
    description:
      "Sequential task execution on a single branch. Each task builds on the last. Failed runs resume automatically — no re-executing completed work.",
    icon: Bot,
    color: "text-violet",
  },
  {
    title: "AI Sprint Planning",
    description:
      "Describe a goal in plain English. AI analyzes your codebase, creates structured GitHub issues with priority, type labels, and execution order.",
    icon: BrainCircuit,
    color: "text-amber",
  },
  {
    title: "Parallel Worktrees",
    description:
      "Run standalone issues in parallel using git worktrees. Each agent works in isolation with its own branch — up to 3 concurrent agents by default.",
    icon: GitFork,
    color: "text-emerald",
  },
  {
    title: "Interactive REPL",
    description:
      "Full-featured terminal with streaming markdown, session persistence, tab completion, slash commands, and image support. Resume any session.",
    icon: Terminal,
    color: "text-rose",
  },
  {
    title: "AI Code Review",
    description:
      "Review pull requests with AI-powered analysis. Post inline comments directly. Iterate on feedback until the PR is merged.",
    icon: FileSearch,
    color: "text-cyan",
  },
];

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.08 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 24 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] as const },
  },
};

export function FeatureGrid() {
  return (
    <section id="features" className="py-28 relative overflow-hidden">
      {/* Background mesh */}
      <div className="mesh-gradient-features absolute inset-0" />

      <div className="max-w-5xl px-6 mx-auto relative">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="text-center mb-16"
        >
          <p className="text-xs font-medium tracking-[0.2em] uppercase text-muted-foreground mb-4">
            Why Locus
          </p>
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-white mb-4">
            Zero infrastructure. Pure GitHub.
          </h2>
          <p className="text-muted-foreground max-w-xl mx-auto text-sm md:text-base leading-relaxed">
            Everything you need to plan, execute, and iterate on AI-generated
            code &mdash; using tools you already have.
          </p>
        </motion.div>

        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-80px" }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
        >
          {features.map((feature, i) => (
            <motion.div
              key={i}
              variants={itemVariants}
              className="relative bg-[#060609] rounded-2xl p-7 md:p-8 border border-border/30"
            >
              <div
                className={`flex h-10 w-10 items-center justify-center rounded-xl bg-white/[0.04] border border-white/[0.06] ${feature.color} mb-5`}
              >
                <feature.icon className="h-5 w-5" />
              </div>
              <h3 className="text-[15px] font-semibold mb-2 tracking-tight text-white">
                {feature.title}
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {feature.description}
              </p>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
