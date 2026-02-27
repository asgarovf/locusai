"use client";

import { motion } from "framer-motion";
import { ArrowRight, Sparkles } from "lucide-react";
import Link from "next/link";
import { BrandingElements } from "./BrandingElements";
import { CopyCommand } from "./CopyCommand";

interface HeroProps {
  version: string;
}

export function Hero({ version }: HeroProps) {
  return (
    <section className="relative pt-32 pb-44 md:pt-40 md:pb-52 overflow-hidden">
      <BrandingElements />

      <div className="max-w-4xl px-6 mx-auto flex flex-col items-center text-center z-10 relative">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="inline-flex items-center rounded-full border border-violet/20 bg-violet/[0.06] px-4 py-1.5 text-xs font-medium text-violet mb-8 backdrop-blur-sm gap-2"
        >
          <Sparkles className="h-3 w-3" />
          <span>v{version}</span>
          <span className="w-px h-3 bg-violet/20" />
          <span className="text-foreground/60">Open Source</span>
        </motion.div>

        <motion.p
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.08, ease: [0.16, 1, 0.3, 1] }}
          className="text-xs font-medium tracking-[0.2em] uppercase text-muted-foreground mb-4"
        >
          Unified AI Interface for GitHub Teams
        </motion.p>

        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
          className="text-5xl md:text-7xl lg:text-[5.5rem] leading-[1.05] tracking-tight mb-7 max-w-4xl"
        >
          <span className="font-sans font-bold text-white">From issue to PR</span>
          <br />
          <span className="font-bold gradient-text-hero">
            with one interface across Claude and Codex.
          </span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.25, ease: [0.16, 1, 0.3, 1] }}
          className="text-base md:text-lg text-muted-foreground max-w-2xl mb-10 leading-relaxed"
        >
          Plan, execute, review, and iterate in GitHub-native workflows, with
          full-auto execution when your team wants speed.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.35, ease: [0.16, 1, 0.3, 1] }}
          className="w-full max-w-lg mb-5"
        >
          <CopyCommand
            value="npm install -g @locusai/cli"
            variant="violet"
            className="w-full"
          />
        </motion.div>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.5 }}
          className="text-xs text-muted-foreground mb-8"
        >
          Requires Node.js 18+,{" "}
          <Link
            href="https://cli.github.com"
            target="_blank"
            className="text-violet hover:underline"
          >
            GitHub CLI
          </Link>
          , and{" "}
          <Link
            href="https://docs.locusai.dev/getting-started/installation"
            className="text-violet hover:underline"
          >
            installation docs
          </Link>
          .
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.55, ease: [0.16, 1, 0.3, 1] }}
          className="flex flex-wrap items-center justify-center gap-4"
        >
          <Link
            href="https://docs.locusai.dev/getting-started/installation"
            className="inline-flex items-center gap-2 text-sm font-medium bg-white text-background px-7 py-3 rounded-xl hover:bg-white/85 transition-colors"
          >
            Get Started
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
          <Link
            href="https://docs.locusai.dev/concepts/how-it-works"
            className="inline-flex items-center gap-2 text-sm font-medium text-white px-7 py-3 rounded-xl border border-border/60 hover:bg-white/[0.06] hover:border-border transition-colors"
          >
            Read Docs
          </Link>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.65 }}
          className="mt-6 flex flex-wrap items-center justify-center gap-4 text-xs text-muted-foreground"
        >
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
            href="https://docs.locusai.dev/concepts/execution-model"
            className="hover:text-white transition-colors"
          >
            Auto-approval
          </Link>
        </motion.div>
      </div>
    </section>
  );
}
