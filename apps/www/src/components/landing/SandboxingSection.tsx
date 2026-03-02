"use client";

import { motion } from "framer-motion";
import { ArrowRight, RefreshCw, ShieldCheck, Workflow } from "lucide-react";
import Link from "next/link";

const points = [
  {
    title: "Isolated by default",
    description:
      "Every AI agent runs inside its own Docker container. Your host filesystem, credentials, and system stay untouched — even during autonomous execution.",
    icon: ShieldCheck,
    color: "text-cyan",
  },
  {
    title: "Controlled and reproducible",
    description:
      "Same sandbox configuration across all team members and CI. No more \"works on my machine\" for AI-assisted development.",
    icon: Workflow,
    color: "text-violet",
  },
  {
    title: "Automatic workspace sync",
    description:
      "Code changes sync seamlessly between sandbox and host. Sensitive files stay excluded, and your .gitignore rules are respected.",
    icon: RefreshCw,
    color: "text-emerald",
  },
];

export function SandboxingSection() {
  return (
    <section className="py-24 relative overflow-hidden">
      <div className="mesh-gradient-features absolute inset-0" />

      <div className="max-w-5xl px-6 mx-auto relative">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="rounded-3xl border border-border/35 bg-[#060609]/90 p-8 md:p-10"
        >
          <p className="text-xs font-medium tracking-[0.2em] uppercase text-muted-foreground mb-4">
            Core Value
          </p>
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-white mb-4">
            Docker-backed isolation for every AI agent run.
          </h2>
          <p className="text-sm md:text-base text-muted-foreground leading-relaxed max-w-3xl">
            AI agents with filesystem access need boundaries. Locus runs Claude
            and Codex in the same Docker-backed isolation layer, so your team
            gets safe, reproducible execution without sacrificing speed.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-8">
            {points.map((point) => (
              <div
                key={point.title}
                className="rounded-2xl border border-border/35 bg-background/40 p-5"
              >
                <div
                  className={`flex h-9 w-9 items-center justify-center rounded-lg border border-white/[0.08] bg-white/[0.03] ${point.color} mb-3`}
                >
                  <point.icon className="h-4 w-4" />
                </div>
                <h3 className="text-sm font-semibold text-white mb-2">
                  {point.title}
                </h3>
                <p className="text-xs md:text-sm text-muted-foreground leading-relaxed">
                  {point.description}
                </p>
              </div>
            ))}
          </div>

          <div className="mt-7 flex flex-wrap justify-center items-center gap-3 mx-auto">
            <Link
              href="https://docs.locusai.dev/concepts/security-sandboxing"
              className="inline-flex items-center gap-2 rounded-xl bg-white px-5 py-2.5 text-sm font-medium text-background hover:bg-white/85 transition-colors"
            >
              Read Security Model
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
            <Link
              href="https://docs.locusai.dev/getting-started/sandboxing-setup"
              className="inline-flex items-center gap-2 rounded-xl border border-border/60 px-5 py-2.5 text-sm font-medium text-white hover:bg-white/[0.05] transition-colors"
            >
              Setup with Docker
            </Link>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
