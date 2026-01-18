"use client";

import { motion } from "framer-motion";
import { ArrowRight, Github } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { BrandingElements } from "./BrandingElements";
import { CopyCommand } from "./CopyCommand";

export function Hero() {
  return (
    <section className="relative pt-24 pb-32 overflow-hidden">
      <BrandingElements />

      <div className="container px-4 md:px-6 mx-auto flex flex-col items-center text-center z-10 relative">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="inline-flex items-center rounded-full border border-border bg-background px-3 py-1 text-sm font-medium text-muted-foreground mb-6 backdrop-blur-sm"
        >
          <span className="flex h-2 w-2 rounded-full bg-blue-500 mr-2 animate-pulse"></span>
          v0.1.0 Alpha Release
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="text-4xl md:text-6xl lg:text-7xl font-bold tracking-tight bg-linear-to-b from-white to-white/60 bg-clip-text text-transparent mb-6 max-w-4xl py-2"
        >
          Mission Control for <br className="hidden sm:inline" />
          Agentic Engineering
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="text-lg md:text-xl text-muted-foreground max-w-2xl mb-10 leading-relaxed"
        >
          The operating system for AI agents. Manage tasks, write documentation,
          and run secure CI pipelines locally-keeping your context close to your
          code.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="flex flex-col sm:flex-row gap-4 w-full max-w-md items-center justify-center mb-12"
        >
          <CopyCommand
            value="npx @locusai/cli init"
            className="w-full sm:w-auto min-w-[300px]"
          />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
          className="flex flex-wrap items-center justify-center gap-4"
        >
          <Button asChild size="lg" className="h-12 px-8 text-base">
            <Link href="/docs">
              Read Documentation
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
          <Button
            asChild
            variant="outline"
            size="lg"
            className="h-12 px-8 text-base bg-secondary/20 hover:bg-secondary/40 border-border/50"
          >
            <Link href="https://github.com/asgarovf/locusai" target="_blank">
              <Github className="mr-2 h-4 w-4" />
              GitHub
            </Link>
          </Button>
        </motion.div>
      </div>
    </section>
  );
}
