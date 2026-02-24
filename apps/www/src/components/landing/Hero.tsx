"use client";

import { motion } from "framer-motion";
import { ArrowRight, Sparkles } from "lucide-react";
import Link from "next/link";
import { GithubIcon } from "../icons/GithubIcon";
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
        {/* Version badge with shimmer */}
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

        {/* Headline */}
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
          className="text-5xl md:text-7xl lg:text-[5.5rem] leading-[1.05] tracking-tight mb-7 max-w-4xl"
        >
          <span className="font-sans font-bold text-white">
            From issue to PR,
          </span>
          <br />
          <span className="font-bold gradient-text-hero">autonomously</span>
        </motion.h1>

        {/* Subtitle */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
          className="text-base md:text-lg text-muted-foreground max-w-xl mb-10 leading-relaxed"
        >
          Turn GitHub issues into shipped code. Plan sprints, execute tasks with
          AI agents, and iterate on feedback &mdash; all native to GitHub.
        </motion.p>

        {/* Install command */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
          className="w-full max-w-lg mb-5"
        >
          <CopyCommand
            value="npm install -g @locusai/cli"
            variant="violet"
            className="w-full"
          />
        </motion.div>

        {/* Install hint */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.45 }}
          className="text-xs text-muted-foreground mb-8"
        >
          Requires Node.js 18+ and{" "}
          <Link
            href="https://cli.github.com"
            target="_blank"
            className="text-violet hover:underline"
          >
            GitHub CLI
          </Link>
          . Zero infrastructure &mdash; GitHub is your backend.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.4, ease: [0.16, 1, 0.3, 1] }}
          className="flex flex-wrap items-center justify-center gap-4"
        >
          <Link
            href="https://docs.locusai.dev"
            className="inline-flex items-center gap-2 text-sm font-medium bg-white text-background px-7 py-3 rounded-xl hover:bg-white/85 transition-colors"
          >
            Read Documentation
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
          <Link
            href="https://github.com/asgarovf/locusai"
            target="_blank"
            className="inline-flex items-center gap-2 text-sm font-medium text-white px-7 py-3 rounded-xl border border-border/60 hover:bg-white/[0.06] hover:border-border transition-colors"
          >
            <GithubIcon className="h-4 w-4" />
            Star on GitHub
          </Link>
        </motion.div>
      </div>
    </section>
  );
}
