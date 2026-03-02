"use client";

import { motion } from "framer-motion";
import type { LucideIcon } from "lucide-react";
import { ArrowRight, Bot, Github, ShieldCheck, Wrench } from "lucide-react";
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
    title: "Docker Sandboxing for AI Agents",
    description:
      "Run Claude and Codex inside isolated Docker containers. Your host stays clean while agents execute with full filesystem access inside the sandbox.",
    evidence:
      "One command to sandbox: locus sandbox claude or locus sandbox codex. Same isolation model for both providers.",
    icon: ShieldCheck,
    color: "text-cyan",
    docsHref: "https://docs.locusai.dev/concepts/security-sandboxing",
    docsLabel: "Security sandboxing docs",
  },
  {
    title: "Unified Interface Across AI Clients",
    description:
      "Switch between Claude and Codex without changing your workflow. Same commands, same context, different provider.",
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
      "Issues, milestones, labels, and PRs become your execution database. Every AI agent run is tracked and auditable through GitHub.",
    evidence:
      "Create issues, assign sprints, execute with AI, and track delivery — all persisted in GitHub objects your team already uses.",
    icon: Github,
    color: "text-emerald",
    docsHref: "https://docs.locusai.dev/concepts/github-backend",
    docsLabel: "GitHub backend docs",
  },
  {
    title: "Built-In Orchestration Tools",
    description:
      "Plan, execute, review, and iterate with commands that go beyond raw provider CLIs. Full delivery lifecycle in one tool.",
    evidence:
      "locus plan, locus run, locus review, locus iterate — an operational workflow that works the same across Claude and Codex.",
    icon: Wrench,
    color: "text-amber",
    docsHref: "https://docs.locusai.dev/cli/overview",
    docsLabel: "CLI overview docs",
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
            Sandboxed execution, unified context, GitHub-native delivery.
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto text-sm md:text-base leading-relaxed">
            Isolated AI agent runs, one CLI across providers, and GitHub as the
            system of record. Everything your team needs to ship safely with AI.
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
