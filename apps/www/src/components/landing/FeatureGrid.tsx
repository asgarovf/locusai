"use client";

import { motion } from "framer-motion";
import type { LucideIcon } from "lucide-react";
import {
  BrainCircuit,
  Code2,
  FileSearch,
  Lock,
  MessageSquare,
  Users,
} from "lucide-react";

interface Feature {
  title: string;
  description: string;
  icon: LucideIcon;
  color: string;
  glowColor: string;
}

const features: Feature[] = [
  {
    title: "Multi-Agent Execution",
    description: "Run multiple agents in parallel across tasks.",
    icon: Users,
    color: "text-cyan",
    glowColor: "group-hover:shadow-cyan/10",
  },
  {
    title: "Secure Local Execution",
    description:
      "Your code never leaves your machine. Agents run locally while coordinating tasks through the cloud dashboard.",
    icon: Lock,
    color: "text-violet",
    glowColor: "group-hover:shadow-violet/10",
  },
  {
    title: "AI Sprint Planning",
    description:
      "Multi-agent planning meetings generate architecturally coherent task breakdowns before any code is written.",
    icon: BrainCircuit,
    color: "text-amber",
    glowColor: "group-hover:shadow-amber/10",
  },
  {
    title: "Codebase Intelligence",
    description:
      "Semantic indexing gives agents deep understanding of your project structure, patterns, and conventions.",
    icon: Code2,
    color: "text-emerald",
    glowColor: "group-hover:shadow-emerald/10",
  },
  {
    title: "AI Code Review",
    description:
      "Automated code review posts inline comments directly to pull requests, catching issues before human review.",
    icon: FileSearch,
    color: "text-rose",
    glowColor: "group-hover:shadow-rose/10",
  },
  {
    title: "Telegram Control",
    description:
      "Start agents, review PRs, run git commands, and manage your entire workflow remotely from Telegram.",
    icon: MessageSquare,
    color: "text-cyan",
    glowColor: "group-hover:shadow-cyan/10",
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
            Built for teams that ship with AI agents
          </h2>
          <p className="text-muted-foreground max-w-xl mx-auto text-sm md:text-base leading-relaxed">
            Everything you need to plan, dispatch, and verify AI-generated code
            at production quality.
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
