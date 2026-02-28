"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Menu, X } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { GithubIcon } from "../icons/GithubIcon";

export function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={`fixed top-0 w-full z-50 transition-all duration-300 ${
        scrolled
          ? "bg-[#030305]/95 backdrop-blur-2xl border-b border-border/40"
          : "bg-transparent border-b border-transparent"
      }`}
    >
      <div className="max-w-6xl mx-auto flex h-16 items-center justify-between px-6">
        <Link href="/" className="flex items-center gap-2.5 shrink-0" aria-label="Locus - Home">
          <Image src="/logo.png" alt="Locus" width={90} height={33} loading="eager" fetchPriority="high" />
        </Link>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-1 ml-10">
          <Link
            href="https://docs.locusai.dev"
            className="text-sm text-muted-foreground hover:text-foreground transition-colors px-3 py-2 rounded-lg hover:bg-white/[0.03]"
          >
            Docs
          </Link>
          <Link
            href="https://docs.locusai.dev/cli/overview"
            className="text-sm text-muted-foreground hover:text-foreground transition-colors px-3 py-2 rounded-lg hover:bg-white/[0.03]"
          >
            CLI Reference
          </Link>
          <Link
            href="/packages"
            className="text-sm text-muted-foreground hover:text-foreground transition-colors px-3 py-2 rounded-lg hover:bg-white/[0.03]"
          >
            Packages
          </Link>
        </nav>

        <div className="hidden md:flex items-center gap-3">
          <Link
            href="https://github.com/asgarovf/locusai"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Locus on GitHub"
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors px-2 py-2 rounded-lg hover:bg-white/[0.03]"
          >
            <GithubIcon className="h-4 w-4" />
          </Link>
          <div className="h-5 w-px bg-border/50" />
          <Link
            href="https://docs.locusai.dev/getting-started/installation"
            className="text-sm font-medium px-4 py-2 rounded-lg transition-colors bg-white text-background hover:bg-white/85"
          >
            Get Started
          </Link>
        </div>

        {/* Mobile hamburger */}
        <button
          type="button"
          aria-label={mobileOpen ? "Close menu" : "Open menu"}
          className="md:hidden p-3 -mr-1 text-muted-foreground hover:text-foreground transition-colors"
          onClick={() => setMobileOpen(!mobileOpen)}
        >
          {mobileOpen ? (
            <X className="h-5 w-5" />
          ) : (
            <Menu className="h-5 w-5" />
          )}
        </button>
      </div>

      {/* Mobile menu */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className="md:hidden overflow-hidden border-b border-border/40"
          >
            <div className="bg-[#030305] px-6 pb-6">
              <nav className="flex flex-col gap-1 pt-2">
                <Link
                  href="https://docs.locusai.dev"
                  onClick={() => setMobileOpen(false)}
                  className="flex items-center gap-3 px-3 py-3 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-white/[0.03] transition-colors"
                >
                  Docs
                </Link>
                <Link
                  href="https://docs.locusai.dev/cli/overview"
                  onClick={() => setMobileOpen(false)}
                  className="flex items-center gap-3 px-3 py-3 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-white/[0.03] transition-colors"
                >
                  CLI Reference
                </Link>
                <Link
                  href="/packages"
                  onClick={() => setMobileOpen(false)}
                  className="flex items-center gap-3 px-3 py-3 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-white/[0.03] transition-colors"
                >
                  Packages
                </Link>
                <Link
                  href="https://github.com/asgarovf/locusai"
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => setMobileOpen(false)}
                  className="flex items-center gap-3 px-3 py-3 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-white/[0.03] transition-colors"
                >
                  GitHub
                </Link>

                <div className="flex items-center gap-3 pt-4 border-t border-border/30 mt-2">
                  <Link
                    href="https://github.com/asgarovf/locusai"
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="Locus on GitHub"
                    className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground p-2"
                  >
                    <GithubIcon className="h-4 w-4" />
                  </Link>
                  <Link
                    href="https://docs.locusai.dev/getting-started/installation"
                    className="text-sm font-medium bg-white text-background px-4 py-2.5 rounded-lg hover:bg-white/85 transition-colors ml-auto"
                  >
                    Get Started
                  </Link>
                </div>
              </nav>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
