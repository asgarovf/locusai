"use client";

import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { CopyCommand } from "./CopyCommand";

export function CallToAction() {
  return (
    <section className="py-32 relative overflow-hidden">
      <div className="mesh-gradient-cta absolute inset-0" />
      <div className="absolute top-0 left-0 right-0 glow-line-multi" />
      <div className="orb orb-violet w-[300px] h-[300px] top-10 left-[20%] opacity-10" />
      <div className="orb orb-cyan w-[250px] h-[250px] bottom-10 right-[20%] opacity-[0.06]" />

      <div className="max-w-3xl px-6 mx-auto relative text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
        >
          <h2 className="text-4xl md:text-5xl font-bold tracking-tight text-white mb-6">
            <span className="font-sans">Ship with sandboxed AI.</span>
            <br />
            <span className="font-bold gradient-text-hero">
              One interface. Full isolation.
            </span>
          </h2>
          <p className="text-muted-foreground max-w-xl mx-auto mb-8 text-sm md:text-base leading-relaxed">
            Install the CLI, set up Docker sandboxing, and run your first
            isolated sprint across Claude or Codex in minutes.
          </p>

          <div className="max-w-md mx-auto mb-8">
            <CopyCommand value="npm install -g @locusai/cli" variant="violet" />
          </div>

          <div className="flex flex-col sm:flex-row gap-3 items-center justify-center">
            <Link
              href="https://docs.locusai.dev/getting-started/sandboxing-setup"
              className="inline-flex items-center gap-2 text-sm font-medium bg-white text-background px-7 py-3 rounded-xl hover:bg-white/85 transition-colors"
            >
              Setup Sandboxing
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
            <Link
              href="https://docs.locusai.dev/getting-started/installation"
              className="inline-flex items-center gap-2 text-sm font-medium text-white px-7 py-3 rounded-xl border border-border/60 hover:bg-white/[0.06] hover:border-border transition-colors"
            >
              Get Started
            </Link>
          </div>

          <div className="mt-5 flex flex-wrap items-center justify-center gap-4 text-xs text-muted-foreground">
            <Link
              href="https://docs.locusai.dev/concepts/security-sandboxing"
              className="hover:text-white transition-colors"
            >
              Security sandboxing
            </Link>
            <span className="text-border">/</span>
            <Link
              href="https://docs.locusai.dev/concepts/unified-interface"
              className="hover:text-white transition-colors"
            >
              Unified interface
            </Link>
            <span className="text-border">/</span>
            <Link
              href="https://docs.locusai.dev/concepts/github-native-workflows"
              className="hover:text-white transition-colors"
            >
              GitHub-native workflows
            </Link>
            <span className="text-border">/</span>
            <Link
              href="https://docs.locusai.dev/cli/overview"
              className="hover:text-white transition-colors"
            >
              CLI overview
            </Link>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
