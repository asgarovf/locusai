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
    <section className="relative pt-24 pb-36 md:pt-32 md:pb-44 overflow-hidden">
      <BrandingElements />

      <div className="max-w-4xl px-6 mx-auto flex flex-col items-center text-center z-10 relative">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="inline-flex items-center rounded-full border border-violet/20 bg-violet/[0.06] px-4 py-1.5 text-xs font-medium text-violet mb-6 backdrop-blur-sm gap-2"
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
          className="text-xs md:text-sm font-medium tracking-[0.2em] uppercase text-muted-foreground mb-3"
        >
          Sandboxed AI Engineering
        </motion.p>

        <h1 className="text-5xl md:text-7xl lg:text-[5.5rem] leading-[1.05] tracking-tight mb-5 max-w-4xl animate-hero-heading">
          <span className="font-sans font-bold text-white">
            Run AI agents
          </span>
          <br />
          <span className="font-bold gradient-text-hero">
            in isolated Docker sandboxes.
          </span>
        </h1>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.25, ease: [0.16, 1, 0.3, 1] }}
          className="text-base md:text-lg text-muted-foreground max-w-2xl mb-8 leading-relaxed"
        >
          One CLI across Claude and Codex with full execution isolation,
          unified context, and GitHub-native workflows.
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
          className="text-xs text-muted-foreground mb-6"
        >
          Requires Node.js 18+,{" "}
          <Link
            href="https://cli.github.com"
            target="_blank"
            rel="noopener noreferrer"
            className="text-violet hover:underline"
          >
            GitHub CLI
          </Link>
          ,{" "}
          <Link
            href="https://www.docker.com/products/docker-desktop/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-violet hover:underline"
          >
            Docker Desktop 4.58+
          </Link>{" "}
          for sandboxing, and{" "}
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
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.65 }}
          className="mt-5 flex flex-wrap items-center justify-center gap-4 text-xs text-muted-foreground"
        >
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
            CLI tools
          </Link>
        </motion.div>
      </div>
    </section>
  );
}
