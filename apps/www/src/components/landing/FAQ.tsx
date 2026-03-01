"use client";

import { motion } from "framer-motion";
import { ChevronDown } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

interface FAQItem {
  question: string;
  answer: string;
}

const faqs: FAQItem[] = [
  {
    question: "What is Locus?",
    answer:
      "Locus is an open-source CLI tool that provides a unified interface for AI-powered software engineering across Claude and Codex. It uses GitHub issues, milestones, and PRs as its operational backend, enabling teams to plan sprints, execute tasks with AI agents, and iterate on feedback — all from one command-line interface.",
  },
  {
    question: "Is Locus free?",
    answer:
      "Yes. Locus is free and open source under the MIT license. You need your own API keys for Claude (Anthropic) or Codex (OpenAI), but Locus itself has no paid tiers, usage limits, or proprietary components.",
  },
  {
    question: "Does Locus send my code to its servers?",
    answer:
      "No. Locus runs entirely on your machine. It communicates directly with GitHub and your chosen AI provider (Claude or Codex). There are no Locus servers — your code, prompts, and credentials never leave your local environment.",
  },
  {
    question: "What AI models does Locus support?",
    answer:
      "Locus supports Claude (via Anthropic) and Codex (via OpenAI). You can switch between models with a single config command: locus config set ai.model <model-name>. The unified interface means your workflow stays the same regardless of provider.",
  },
  {
    question:
      "How is Locus different from using Claude Code or Codex CLI directly?",
    answer:
      "Claude Code and Codex CLI are standalone tools for their respective providers. Locus builds on top of them by adding sprint planning, GitHub-native state management, multi-model support, and orchestration commands (plan, run, review, iterate). If you want structured delivery workflows or the ability to switch providers without changing your process, Locus adds that layer.",
  },
  {
    question: "How do I install Locus?",
    answer:
      "Run npm install -g @locusai/cli. You need Node.js 18+ and GitHub CLI (gh) installed and authenticated. Full setup instructions are at docs.locusai.dev/getting-started/installation.",
  },
];

function FAQAccordionItem({
  item,
  isOpen,
  onToggle,
}: {
  item: FAQItem;
  isOpen: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="border-b border-border/20 last:border-b-0">
      <button
        onClick={onToggle}
        className="flex w-full items-center justify-between gap-4 py-5 text-left min-h-[44px]"
      >
        <span className="text-sm font-medium text-white">{item.question}</span>
        <ChevronDown
          className={cn(
            "h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200",
            isOpen && "rotate-180"
          )}
        />
      </button>
      <div
        className={cn(
          "grid transition-all duration-200 ease-in-out",
          isOpen ? "grid-rows-[1fr] pb-5" : "grid-rows-[0fr]"
        )}
      >
        <div className="overflow-hidden">
          <p className="text-sm text-muted-foreground leading-relaxed">
            {item.answer}
          </p>
        </div>
      </div>
    </div>
  );
}

export function FAQ() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((faq) => ({
      "@type": "Question",
      name: faq.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: faq.answer,
      },
    })),
  };

  return (
    <section className="py-28 relative">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />
      <div className="max-w-3xl px-6 mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="text-center mb-12"
        >
          <p className="text-xs font-medium tracking-[0.2em] uppercase text-muted-foreground mb-4">
            FAQ
          </p>
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-white">
            Frequently asked questions
          </h2>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
          className="rounded-2xl border border-border/30 bg-[#060609] px-7 md:px-8"
        >
          {faqs.map((faq, i) => (
            <FAQAccordionItem
              key={i}
              item={faq}
              isOpen={openIndex === i}
              onToggle={() => setOpenIndex(openIndex === i ? null : i)}
            />
          ))}
        </motion.div>
      </div>
    </section>
  );
}
