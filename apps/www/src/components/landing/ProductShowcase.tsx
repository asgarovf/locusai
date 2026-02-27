"use client";

import { motion } from "framer-motion";
import { ArrowRight, Terminal } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

interface TerminalLine {
  text: string;
  color: string;
  prefix?: string;
}

interface SequenceStep {
  step: string;
  label: string;
  title: string;
  description: string;
  docsHref: string;
  docsLabel: string;
  terminalTitle: string;
  lines: TerminalLine[];
}

const steps: SequenceStep[] = [
  {
    step: "01",
    label: "Choose Your AI Client",
    title: "Select Claude or Codex without changing your workflow",
    description:
      "Set the model, then keep using the same Locus command surface. One interface across Claude and Codex means teams switch providers without rewriting process.",
    docsHref: "https://docs.locusai.dev/concepts/unified-interface",
    docsLabel: "Unified interface deep dive",
    terminalTitle: "locus config set ai.model",
    lines: [
      {
        text: "locus config set ai.model claude-sonnet-4-6",
        color: "text-foreground",
        prefix: "$ ",
      },
      { text: "ai.model updated", color: "text-violet" },
      { text: "", color: "" },
      { text: "locus run", color: "text-foreground", prefix: "$ " },
      { text: "Running sprint with Claude client...", color: "text-violet" },
      { text: "", color: "" },
      {
        text: "locus config set ai.model gpt-5.3-codex",
        color: "text-foreground",
        prefix: "$ ",
      },
      { text: "ai.model updated", color: "text-emerald" },
    ],
  },
  {
    step: "02",
    label: "Run Through One Interface",
    title: "Plan, execute, review, and iterate in the same CLI",
    description:
      "Use built-in orchestration commands for delivery loops. This goes beyond raw provider CLIs by combining planning, execution, review, and iteration workflows.",
    docsHref: "https://docs.locusai.dev/concepts/how-it-works",
    docsLabel: "End-to-end Locus workflow",
    terminalTitle: "locus plan + run + review + iterate",
    lines: [
      {
        text: 'locus plan "Add billing portal"',
        color: "text-foreground",
        prefix: "$ ",
      },
      { text: "Created sprint milestone with ordered issues", color: "text-cyan" },
      { text: "", color: "" },
      { text: "locus run", color: "text-foreground", prefix: "$ " },
      { text: "Executing sprint tasks and opening PRs", color: "text-cyan" },
      { text: "locus review", color: "text-foreground", prefix: "$ " },
      { text: "Posted inline review comments on PR #42", color: "text-amber" },
      { text: "locus iterate 42", color: "text-foreground", prefix: "$ " },
    ],
  },
  {
    step: "03",
    label: "Persist in GitHub-Native Data",
    title: "Keep execution state in issues, milestones, labels, and PRs",
    description:
      "GitHub is the system of record. Work items stay in issues and milestones, delivery artifacts stay in PRs, and operational status stays visible to the whole team.",
    docsHref: "https://docs.locusai.dev/concepts/github-backend",
    docsLabel: "GitHub as operational memory",
    terminalTitle: "locus issue + sprint + status",
    lines: [
      {
        text: 'locus issue create "Add billing webhook handler"',
        color: "text-foreground",
        prefix: "$ ",
      },
      { text: "Created issue #83 with labels p:high type:feature", color: "text-cyan" },
      { text: "", color: "" },
      {
        text: 'locus sprint create "Sprint 6"',
        color: "text-foreground",
        prefix: "$ ",
      },
      { text: "Assigned issue #83 to Sprint 6 milestone", color: "text-cyan" },
      { text: "locus status", color: "text-foreground", prefix: "$ " },
      { text: "Sprint 6 progress: 3/5 done, 2 queued", color: "text-muted-foreground" },
    ],
  },
  {
    step: "04",
    label: "Automate with Auto-Approval",
    title: "Enable full-auto execution with resumable delivery",
    description:
      "Turn on automation settings to auto-label issues and auto-create PRs. Failed runs can resume from the last unfinished step instead of restarting.",
    docsHref: "https://docs.locusai.dev/concepts/execution-model",
    docsLabel: "Full-auto execution model",
    terminalTitle: "autoPR + autoLabel + run --resume",
    lines: [
      {
        text: "locus config set agent.autoPR true",
        color: "text-foreground",
        prefix: "$ ",
      },
      {
        text: "locus config set agent.autoLabel true",
        color: "text-foreground",
        prefix: "$ ",
      },
      { text: "", color: "" },
      { text: "locus run", color: "text-foreground", prefix: "$ " },
      { text: "Auto-labeling issues and opening PRs", color: "text-emerald" },
      { text: "Run interrupted on task 4/6", color: "text-amber" },
      { text: "locus run --resume", color: "text-foreground", prefix: "$ " },
      { text: "Resumed from task 4/6", color: "text-emerald" },
    ],
  },
];

function MiniTerminal({
  title,
  lines,
}: {
  title: string;
  lines: TerminalLine[];
}) {
  return (
    <div className="rounded-xl border border-border/40 bg-[#040406] overflow-hidden font-mono text-[11px] md:text-[12.5px] leading-relaxed w-full">
      <div className="flex items-center gap-2 px-3.5 py-2.5 border-b border-border/20 bg-[#080810]">
        <div className="flex gap-1.5">
          <div className="w-2 h-2 rounded-full bg-rose/50" />
          <div className="w-2 h-2 rounded-full bg-amber/50" />
          <div className="w-2 h-2 rounded-full bg-emerald/50" />
        </div>
        <div className="flex-1 text-center text-[9px] text-muted-foreground flex items-center justify-center gap-1.5 font-sans">
          <Terminal className="w-2.5 h-2.5" />
          {title}
        </div>
      </div>
      <div className="p-4 md:p-5">
        {lines.map((line, i) => (
          <div
            key={i}
            className={cn(
              "whitespace-pre leading-[1.8]",
              line.color,
              !line.text && "h-2.5"
            )}
          >
            {line.prefix && (
              <span className="text-violet/50 select-none">{line.prefix}</span>
            )}
            {line.text}
          </div>
        ))}
      </div>
    </div>
  );
}

export function ProductShowcase() {
  return (
    <section className="py-28 relative overflow-hidden">
      <div className="max-w-6xl px-6 mx-auto relative">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="text-center mb-16"
        >
          <p className="text-xs font-medium tracking-[0.2em] uppercase text-muted-foreground mb-4">
            How It Works
          </p>
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-white mb-4">
            Choose AI client, run one interface, persist in GitHub, automate.
          </h2>
          <p className="text-muted-foreground max-w-3xl mx-auto text-sm md:text-base leading-relaxed">
            The sequence is always the same on mobile and desktop: pick Claude
            or Codex, execute with built-in Locus commands, keep state in
            GitHub-native objects, then enable auto-approval for full-auto runs.
          </p>
        </motion.div>

        <div className="flex flex-col gap-8 md:gap-10">
          {steps.map((step, i) => (
            <motion.div
              key={step.step}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ duration: 0.65, delay: i * 0.05, ease: [0.16, 1, 0.3, 1] }}
              className="rounded-2xl border border-border/30 bg-[#060609] p-6 md:p-8"
            >
              <div className="grid grid-cols-1 md:grid-cols-[1fr_1.1fr] gap-8 md:gap-10 items-start">
                <div>
                  <p className="text-xs font-semibold tracking-[0.15em] uppercase text-violet mb-3">
                    Step {step.step}: {step.label}
                  </p>
                  <h3 className="text-2xl md:text-3xl font-bold tracking-tight text-white mb-4 leading-tight">
                    {step.title}
                  </h3>
                  <p className="text-[15px] text-muted-foreground leading-relaxed mb-4">
                    {step.description}
                  </p>
                  <Link
                    href={step.docsHref}
                    className="inline-flex items-center gap-1.5 text-sm text-violet hover:underline"
                  >
                    {step.docsLabel}
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </div>

                <MiniTerminal title={step.terminalTitle} lines={step.lines} />
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
