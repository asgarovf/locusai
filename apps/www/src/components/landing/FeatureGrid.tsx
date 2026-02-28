"use client";

import { motion } from "framer-motion";
import type { LucideIcon } from "lucide-react";
import { ArrowRight, Bot, Github, Wrench, Zap } from "lucide-react";
import Link from "next/link";

interface Feature {
  title: string;
  description: string;
  evidence: string;
  icon: LucideIcon;
  color: string;
  docsHref: string;
  docsLabel: string;
}

const features: Feature[] = [
  {
    title: "Unified Interface Across Multiple AI Clients",
    description:
      "Run the same Locus workflow across Claude and Codex by switching models, not tooling.",
    evidence:
      "Switch ai.model between claude-sonnet-4-6 and gpt-5.3-codex while keeping the same run, review, and iterate commands.",
    icon: Bot,
    color: "text-violet",
    docsHref: "https://docs.locusai.dev/concepts/unified-interface",
    docsLabel: "Unified interface docs",
  },
  {
    title: "GitHub as Operational Memory",
    description:
      "Issues, milestones, labels, and PRs become your execution database and audit trail.",
    evidence:
      "GitHub-native example: create an issue, assign it to a sprint milestone, run execution, and track delivery status from GitHub objects.",
    icon: Github,
    color: "text-cyan",
    docsHref: "https://docs.locusai.dev/concepts/github-backend",
    docsLabel: "GitHub backend docs",
  },
  {
    title: "Built-In Orchestration Tools",
    description:
      "Use planning, execution, review, iteration, and status commands that go beyond raw provider CLIs.",
    evidence:
      "Built-in tools example: locus plan, locus review, locus iterate, and locus logs in one operational workflow.",
    icon: Wrench,
    color: "text-amber",
    docsHref: "https://docs.locusai.dev/cli/overview",
    docsLabel: "CLI overview docs",
  },
  {
    title: "Auto-Approval Automation",
    description:
      "Execute in full-auto mode with automatic labels, PR creation, and resumable runs.",
    evidence:
      "Set agent.autoPR and agent.autoLabel, then use locus run --resume to continue failed execution without restarting completed work.",
    icon: Zap,
    color: "text-emerald",
    docsHref: "https://docs.locusai.dev/concepts/auto-approval-mode",
    docsLabel: "Auto-approval docs",
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
            Four Core Strengths
          </p>
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-white mb-4">
            One interface, GitHub-native execution, built-in tooling, and
            automation.
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto text-sm md:text-base leading-relaxed">
            Locus is the unified AI engineering interface for GitHub teams:
            one CLI to plan, execute, review, and automate delivery across
            Claude and Codex.
          </p>
        </motion.div>

        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-80px" }}
          className="grid grid-cols-1 md:grid-cols-2 gap-4"
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
              <p className="text-xs text-muted-foreground/90 leading-relaxed mt-4 border-t border-border/30 pt-4">
                {feature.evidence}
              </p>
              <Link
                href={feature.docsHref}
                className="inline-flex items-center gap-1.5 text-xs text-violet mt-4 hover:underline"
              >
                {feature.docsLabel}
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
