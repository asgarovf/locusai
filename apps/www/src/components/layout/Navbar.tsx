"use client";

import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowRight,
  Bot,
  BrainCircuit,
  ChevronDown,
  Code2,
  FileText,
  GitBranch,
  Globe,
  Menu,
  MessageSquare,
  Monitor,
  Search,
  Server,
  Shield,
  Terminal,
  X,
  Zap,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { GithubIcon } from "../icons/GithubIcon";

interface NavDropdownItem {
  title: string;
  description: string;
  icon: React.ReactNode;
  href: string;
  badge?: string;
  color: string;
}

const products: NavDropdownItem[] = [
  {
    title: "AI Agents",
    description: "Autonomous coding agents that build, test, and push code",
    icon: <Bot className="h-4 w-4" />,
    href: "/products/agents",
    color: "text-cyan",
  },
  {
    title: "Sprint Planning",
    description: "AI-powered sprint planning with mindmaps and task generation",
    icon: <BrainCircuit className="h-4 w-4" />,
    href: "/products/planning",
    color: "text-violet",
  },
  {
    title: "Code Review",
    description: "Automated AI code review for PRs and staged changes",
    icon: <Search className="h-4 w-4" />,
    href: "/products/review",
    badge: "New",
    color: "text-amber",
  },
  {
    title: "Telegram Bot",
    description: "Remote control your entire workflow from Telegram",
    icon: <MessageSquare className="h-4 w-4" />,
    href: "/products/telegram",
    color: "text-emerald",
  },
  {
    title: "Self-Hosting",
    description: "Deploy agents on your own servers for 24/7 availability",
    icon: <Server className="h-4 w-4" />,
    href: "/products/self-hosting",
    color: "text-rose",
  },
  {
    title: "Dashboard",
    description: "Cloud-based project management and task coordination",
    icon: <Monitor className="h-4 w-4" />,
    href: "https://app.locusai.dev",
    color: "text-cyan",
  },
];

const resources: NavDropdownItem[] = [
  {
    title: "Documentation",
    description: "Guides, API references, and tutorials",
    icon: <FileText className="h-4 w-4" />,
    href: "https://docs.locusai.dev",
    color: "text-violet",
  },
  {
    title: "CLI Reference",
    description: "Complete command-line interface documentation",
    icon: <Terminal className="h-4 w-4" />,
    href: "/cli",
    color: "text-cyan",
  },
  {
    title: "Security",
    description: "How Locus keeps your code safe and private",
    icon: <Shield className="h-4 w-4" />,
    href: "/security",
    color: "text-emerald",
  },
  {
    title: "Integrations",
    description:
      "Check out our core integrations and interactions with other tools",
    icon: <Zap className="h-4 w-4" />,
    href: "/integrations",
    color: "text-amber",
  },
];

function NavDropdown({
  items,
  isOpen,
  onClose,
}: {
  items: NavDropdownItem[];
  isOpen: boolean;
  onClose: () => void;
}) {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, y: 8, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 8, scale: 0.98 }}
          transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
          className="absolute top-full left-1/2 -translate-x-1/2 mt-2 w-[540px] rounded-2xl border border-border/60 bg-[#080810] shadow-xl shadow-black/50 overflow-hidden"
        >
          <div className="p-2">
            <div className="grid grid-cols-2 gap-1">
              {items.map((item) => (
                <Link
                  key={item.title}
                  href={item.href}
                  onClick={onClose}
                  className="group flex gap-3 p-3 rounded-xl hover:bg-white/[0.03] transition-colors"
                >
                  <div
                    className={`shrink-0 mt-0.5 flex h-8 w-8 items-center justify-center rounded-lg bg-white/[0.04] border border-white/[0.06] ${item.color} group-hover:border-current/20 transition-colors`}
                  >
                    {item.icon}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-[13px] font-medium text-foreground/90 group-hover:text-foreground transition-colors">
                        {item.title}
                      </span>
                      {item.badge && (
                        <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-violet/10 text-violet border border-violet/20">
                          {item.badge}
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-muted-foreground leading-relaxed mt-0.5 line-clamp-2">
                      {item.description}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
          <div className="border-t border-border/30 bg-white/[0.01] px-4 py-3">
            <Link
              href="https://docs.locusai.dev"
              onClick={onClose}
              className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              <Globe className="h-3 w-3" />
              View all documentation
              <ArrowRight className="h-3 w-3 ml-auto" />
            </Link>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);

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
        <Link href="/" className="flex items-center gap-2.5 shrink-0">
          <Image src="/logo.png" alt="Locus" width={90} height={33} />
        </Link>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-1 ml-10">
          <div
            className="relative"
            onMouseEnter={() => setActiveDropdown("products")}
            onMouseLeave={() => setActiveDropdown(null)}
          >
            <button
              type="button"
              className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors px-3 py-2 rounded-lg hover:bg-white/[0.03]"
            >
              Products
              <ChevronDown
                className={`h-3.5 w-3.5 transition-transform duration-200 ${activeDropdown === "products" ? "rotate-180" : ""}`}
              />
            </button>
            <NavDropdown
              items={products}
              isOpen={activeDropdown === "products"}
              onClose={() => setActiveDropdown(null)}
            />
          </div>

          <div
            className="relative"
            onMouseEnter={() => setActiveDropdown("resources")}
            onMouseLeave={() => setActiveDropdown(null)}
          >
            <button
              type="button"
              className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors px-3 py-2 rounded-lg hover:bg-white/[0.03]"
            >
              Resources
              <ChevronDown
                className={`h-3.5 w-3.5 transition-transform duration-200 ${activeDropdown === "resources" ? "rotate-180" : ""}`}
              />
            </button>
            <NavDropdown
              items={resources}
              isOpen={activeDropdown === "resources"}
              onClose={() => setActiveDropdown(null)}
            />
          </div>

          <Link
            href="https://docs.locusai.dev"
            className="text-sm text-muted-foreground hover:text-foreground transition-colors px-3 py-2 rounded-lg hover:bg-white/[0.03]"
          >
            Docs
          </Link>
          <Link
            href="/pricing"
            className="text-sm text-muted-foreground hover:text-foreground transition-colors px-3 py-2 rounded-lg hover:bg-white/[0.03]"
          >
            Pricing
          </Link>
        </nav>

        <div className="hidden md:flex items-center gap-3">
          <Link
            href="https://github.com/asgarovf/locusai"
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors px-2 py-2 rounded-lg hover:bg-white/[0.03]"
          >
            <GithubIcon className="h-4 w-4" />
          </Link>
          <div className="h-5 w-px bg-border/50" />
          <Link
            href="https://app.locusai.dev"
            className="text-sm font-medium px-4 py-2 rounded-lg transition-colors bg-white text-background hover:bg-white/85"
          >
            Get Started
          </Link>
        </div>

        {/* Mobile hamburger */}
        <button
          type="button"
          className="md:hidden p-2 text-muted-foreground hover:text-foreground transition-colors"
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
                <p className="text-[10px] font-medium tracking-[0.15em] uppercase text-muted-foreground mt-4 mb-2 px-3">
                  Products
                </p>
                {products.map((item) => (
                  <Link
                    key={item.title}
                    href={item.href}
                    onClick={() => setMobileOpen(false)}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-white/[0.03] transition-colors"
                  >
                    <span className={item.color}>{item.icon}</span>
                    {item.title}
                    {item.badge && (
                      <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-violet/10 text-violet">
                        {item.badge}
                      </span>
                    )}
                  </Link>
                ))}

                <p className="text-[10px] font-medium tracking-[0.15em] uppercase text-muted-foreground mt-4 mb-2 px-3">
                  Resources
                </p>
                {resources.map((item) => (
                  <Link
                    key={item.title}
                    href={item.href}
                    onClick={() => setMobileOpen(false)}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-white/[0.03] transition-colors"
                  >
                    <span className={item.color}>{item.icon}</span>
                    {item.title}
                  </Link>
                ))}

                <Link
                  href="https://docs.locusai.dev"
                  onClick={() => setMobileOpen(false)}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-white/[0.03] transition-colors"
                >
                  <Code2 className="h-4 w-4 text-cyan" />
                  Docs
                </Link>
                <Link
                  href="/pricing"
                  onClick={() => setMobileOpen(false)}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-white/[0.03] transition-colors"
                >
                  <GitBranch className="h-4 w-4 text-violet" />
                  Pricing
                </Link>

                <div className="flex items-center gap-3 pt-4 border-t border-border/30 mt-2">
                  <Link
                    href="https://github.com/asgarovf/locusai"
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
                  >
                    <GithubIcon className="h-4 w-4" />
                  </Link>
                  <Link
                    href="https://app.locusai.dev/login"
                    className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    Sign in
                  </Link>
                  <Link
                    href="https://app.locusai.dev/register"
                    className="text-sm font-medium bg-white text-background px-4 py-2 rounded-lg hover:bg-white/85 transition-colors ml-auto"
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
