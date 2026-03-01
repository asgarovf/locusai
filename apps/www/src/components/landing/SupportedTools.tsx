"use client";

import { motion } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import { GithubIcon } from "../icons/GithubIcon";

interface InfraTool {
  name: string;
  tag: string;
  href: string;
  icon: React.ReactNode;
  gradient: string;
  borderGlow: string;
}

interface AIProvider {
  name: string;
  tag: string;
  href: string;
  image: string;
  imageWidth: number;
  imageHeight: number;
  gradient: string;
  borderGlow: string;
}

function GitIcon({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <path d="M23.546 10.93L13.067.452a1.55 1.55 0 0 0-2.188 0L8.708 2.627l2.76 2.76a1.838 1.838 0 0 1 2.327 2.341l2.66 2.66a1.838 1.838 0 1 1-1.103 1.06l-2.48-2.48v6.53a1.838 1.838 0 1 1-1.513-.036V8.73a1.838 1.838 0 0 1-.998-2.41L7.629 3.59.452 10.767a1.55 1.55 0 0 0 0 2.188l10.48 10.48a1.55 1.55 0 0 0 2.186 0l10.428-10.43a1.55 1.55 0 0 0 0-2.075z" />
    </svg>
  );
}

function DockerIcon({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <path d="M13.983 11.078h2.119a.186.186 0 0 0 .186-.185V9.006a.186.186 0 0 0-.186-.186h-2.119a.185.185 0 0 0-.185.185v1.888c0 .102.083.185.185.185m-2.954-5.43h2.118a.186.186 0 0 0 .186-.186V3.574a.186.186 0 0 0-.186-.185h-2.118a.185.185 0 0 0-.185.185v1.888c0 .102.082.185.185.186m0 2.716h2.118a.187.187 0 0 0 .186-.186V6.29a.186.186 0 0 0-.186-.185h-2.118a.185.185 0 0 0-.185.185v1.887c0 .102.082.185.185.186m-2.93 0h2.12a.186.186 0 0 0 .184-.186V6.29a.185.185 0 0 0-.185-.185H8.1a.185.185 0 0 0-.185.185v1.887c0 .102.083.185.185.186m-2.964 0h2.119a.186.186 0 0 0 .185-.186V6.29a.185.185 0 0 0-.185-.185H5.136a.186.186 0 0 0-.186.185v1.887c0 .102.084.185.186.186m5.893 2.715h2.118a.186.186 0 0 0 .186-.185V9.006a.186.186 0 0 0-.186-.186h-2.118a.185.185 0 0 0-.185.185v1.888c0 .102.082.185.185.185m-2.93 0h2.12a.185.185 0 0 0 .184-.185V9.006a.185.185 0 0 0-.184-.186h-2.12a.185.185 0 0 0-.184.185v1.888c0 .102.083.185.185.185m-2.964 0h2.119a.185.185 0 0 0 .185-.185V9.006a.185.185 0 0 0-.185-.186H5.136a.186.186 0 0 0-.186.185v1.888c0 .102.084.185.186.185m-2.92 0h2.12a.185.185 0 0 0 .184-.185V9.006a.185.185 0 0 0-.184-.186h-2.12a.185.185 0 0 0-.184.185v1.888c0 .102.082.185.185.185M23.763 9.89c-.065-.051-.672-.51-1.954-.51-.338.001-.676.03-1.01.087-.248-1.7-1.653-2.53-1.716-2.566l-.344-.199-.226.327c-.284.438-.49.922-.612 1.43-.23.97-.09 1.882.403 2.661-.595.332-1.55.413-1.744.42H.751a.751.751 0 0 0-.75.748 11.376 11.376 0 0 0 .692 4.062c.545 1.428 1.355 2.48 2.41 3.124 1.18.723 3.1 1.137 5.275 1.137.983.003 1.963-.086 2.93-.266a12.248 12.248 0 0 0 3.823-1.389c.98-.567 1.86-1.288 2.61-2.136 1.252-1.418 1.998-2.997 2.553-4.4h.221c1.372 0 2.215-.549 2.68-1.009.309-.293.55-.65.707-1.046l.098-.288Z" />
    </svg>
  );
}

function TerminalIcon({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <polyline points="4 17 10 11 4 5" />
      <line x1="12" x2="20" y1="19" y2="19" />
    </svg>
  );
}

const aiProviders: AIProvider[] = [
  {
    name: "Claude",
    tag: "AI Provider",
    href: "https://docs.anthropic.com/en/docs/agents-and-tools/claude-code/overview",
    image: "/tools/claude.png",
    imageWidth: 652,
    imageHeight: 147,
    gradient: "from-violet/10 to-violet/[0.02]",
    borderGlow: "group-hover:shadow-[0_0_30px_rgba(167,139,250,0.1)]",
  },
  {
    name: "Codex",
    tag: "AI Provider",
    href: "https://openai.com/index/introducing-codex/",
    image: "/tools/codex.png",
    imageWidth: 2200,
    imageHeight: 598,
    gradient: "from-emerald/10 to-emerald/[0.02]",
    borderGlow: "group-hover:shadow-[0_0_30px_rgba(52,211,153,0.1)]",
  },
];

const infraTools: InfraTool[] = [
  {
    name: "GitHub",
    tag: "Backend",
    href: "https://github.com",
    icon: <GithubIcon className="h-6 w-6 text-white" />,
    gradient: "from-white/[0.08] to-white/[0.02]",
    borderGlow: "group-hover:shadow-[0_0_20px_rgba(255,255,255,0.04)]",
  },
  {
    name: "GitHub CLI",
    tag: "Core Dependency",
    href: "https://cli.github.com",
    icon: <TerminalIcon className="h-6 w-6 text-cyan" />,
    gradient: "from-cyan/10 to-cyan/[0.02]",
    borderGlow: "group-hover:shadow-[0_0_20px_rgba(34,211,238,0.08)]",
  },
  {
    name: "Git",
    tag: "Version Control",
    href: "https://git-scm.com",
    icon: <GitIcon className="h-5.5 w-5.5 text-amber" />,
    gradient: "from-amber/10 to-amber/[0.02]",
    borderGlow: "group-hover:shadow-[0_0_20px_rgba(251,191,36,0.08)]",
  },
  {
    name: "Docker",
    tag: "Sandboxing",
    href: "https://docs.locusai.dev/getting-started/sandboxing-setup",
    icon: <DockerIcon className="h-6 w-6 text-[#2496ED]" />,
    gradient: "from-[#2496ED]/10 to-[#2496ED]/[0.02]",
    borderGlow: "group-hover:shadow-[0_0_20px_rgba(36,150,237,0.08)]",
  },
];

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.08 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 16, scale: 0.96 },
  show: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.45, ease: [0.16, 1, 0.3, 1] as const },
  },
};

export function SupportedTools() {
  return (
    <section className="py-20 relative">
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-violet/[0.015] to-transparent pointer-events-none" />

      <div className="max-w-5xl px-6 mx-auto relative">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="text-center mb-12"
        >
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-[0.2em] mb-3">
            Powered by tools you already use
          </p>
          <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-white">
            Multiple AI providers. One unified workflow.
          </h2>
        </motion.div>

        {/* AI Providers — wide cards with full logo images */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-60px" }}
          className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4"
        >
          {aiProviders.map((provider) => (
            <motion.div key={provider.name} variants={itemVariants}>
              <Link
                href={provider.href}
                target="_blank"
                rel="noopener noreferrer"
                className={`group relative flex flex-col items-center justify-center rounded-2xl border border-border/25 bg-gradient-to-b ${provider.gradient} px-8 py-8 hover:border-border/50 transition-all duration-300 ${provider.borderGlow}`}
              >
                <div className="relative w-full flex items-center justify-center">
                  <Image
                    src={provider.image}
                    alt={provider.name}
                    width={provider.imageWidth}
                    height={provider.imageHeight}
                    className="max-h-10 w-auto object-contain opacity-90 group-hover:opacity-100 transition-opacity duration-300"
                  />
                </div>
                <p className="text-[10px] text-muted-foreground mt-4 tracking-wide uppercase">
                  {provider.tag}
                </p>
              </Link>
            </motion.div>
          ))}
        </motion.div>

        {/* Infrastructure tools — compact row */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-60px" }}
          className="grid grid-cols-2 sm:grid-cols-4 gap-3"
        >
          {infraTools.map((tool) => (
            <motion.div key={tool.name} variants={itemVariants}>
              <Link
                href={tool.href}
                target="_blank"
                rel="noopener noreferrer"
                className={`group relative flex flex-col items-center gap-3.5 rounded-2xl border border-border/25 bg-gradient-to-b ${tool.gradient} px-4 py-6 hover:border-border/50 transition-all duration-300 ${tool.borderGlow}`}
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/[0.04] border border-white/[0.06] group-hover:bg-white/[0.07] group-hover:border-white/[0.1] transition-all duration-300">
                  {tool.icon}
                </div>
                <div className="text-center">
                  <p className="text-sm font-semibold text-white group-hover:text-white transition-colors">
                    {tool.name}
                  </p>
                  <p className="text-[10px] text-muted-foreground mt-0.5 tracking-wide uppercase">
                    {tool.tag}
                  </p>
                </div>
              </Link>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
