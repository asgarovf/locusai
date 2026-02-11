"use client";

import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { CopyCommand } from "./CopyCommand";

export function CallToAction() {
  return (
    <section className="py-32 relative overflow-hidden">
      {/* Colorful mesh background */}
      <div className="mesh-gradient-cta absolute inset-0" />

      {/* Glow line at top */}
      <div className="absolute top-0 left-0 right-0 glow-line-multi" />

      {/* Floating orbs */}
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
            <span className="font-sans">Stop writing code.</span>
            <br />
            <span className="font-bold gradient-text-hero">
              Start shipping it.
            </span>
          </h2>
          <p className="text-muted-foreground max-w-md mx-auto mb-8 text-sm md:text-base leading-relaxed">
            Locus is open source and free to self-host. Start building with AI
            agents today.
          </p>

          <div className="max-w-md mx-auto mb-8">
            <CopyCommand value="npm install -g @locusai/cli" variant="violet" />
          </div>

          <div className="flex flex-col sm:flex-row gap-3 items-center justify-center">
            <Link
              href="https://app.locusai.dev/register"
              className="inline-flex items-center gap-2 text-sm font-medium bg-white text-background px-7 py-3 rounded-xl hover:bg-white/85 transition-colors"
            >
              Get Started Free
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
            <Link
              href="https://docs.locusai.dev"
              className="inline-flex items-center gap-2 text-sm font-medium text-white px-7 py-3 rounded-xl border border-border/60 hover:bg-white/[0.06] hover:border-border transition-colors"
            >
              Read the Docs
            </Link>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
