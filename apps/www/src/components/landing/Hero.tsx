"use client";

import { motion } from "framer-motion";
import { ArrowRight, Sparkles } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { GithubIcon } from "../icons/GithubIcon";
import { BrandingElements } from "./BrandingElements";
import { CopyCommand } from "./CopyCommand";

interface HeroProps {
  version: string;
}

type InstallTab = "bash" | "npm";

export function Hero({ version }: HeroProps) {
  const [activeTab, setActiveTab] = useState<InstallTab>("bash");

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
          <span className="font-sans font-bold text-white">AI agents that</span>
          <br />
          <span className="font-bold gradient-text-hero">ship your code</span>
        </motion.h1>

        {/* Subtitle */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
          className="text-base md:text-lg text-muted-foreground max-w-xl mb-10 leading-relaxed"
        >
          Plan sprints in the cloud, dispatch tasks to AI agents, and watch them
          build, test, and push code &mdash; all from your terminal with
          isolated git worktrees.
        </motion.p>

        {/* Installation tabs */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
          className="w-full max-w-lg mb-5"
        >
          {/* Tab switcher */}
          <div className="flex items-center gap-1 mb-3 justify-center">
            <button
              type="button"
              onClick={() => setActiveTab("bash")}
              className={`text-xs font-medium px-3 py-1.5 rounded-lg transition-all ${
                activeTab === "bash"
                  ? "bg-violet/10 text-violet border border-violet/20"
                  : "text-muted-foreground hover:text-foreground border border-transparent"
              }`}
            >
              Quick Install
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("npm")}
              className={`text-xs font-medium px-3 py-1.5 rounded-lg transition-all ${
                activeTab === "npm"
                  ? "bg-cyan/10 text-cyan border border-cyan/20"
                  : "text-muted-foreground hover:text-foreground border border-transparent"
              }`}
            >
              npm / pnpm / yarn
            </button>
          </div>

          {/* Install command */}
          {activeTab === "bash" ? (
            <CopyCommand
              value="curl -fsSL https://locusai.dev/install.sh | bash"
              variant="violet"
              className="w-full"
            />
          ) : (
            <CopyCommand
              value="npm install -g @locusai/cli"
              variant="cyan"
              className="w-full"
            />
          )}
        </motion.div>

        {/* Secondary install hint */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.45 }}
          className="text-xs text-muted-foreground mb-8"
        >
          {activeTab === "bash" ? (
            <>
              Auto-detects Linux &amp; macOS. Sets up Node.js, agents, and
              services.
            </>
          ) : (
            <>
              Requires Node.js 18+. Also available via{" "}
              <code className="text-violet/50">pnpm</code>,{" "}
              <code className="text-violet/50">yarn</code>, or{" "}
              <code className="text-violet/50">bun</code>.
            </>
          )}
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
