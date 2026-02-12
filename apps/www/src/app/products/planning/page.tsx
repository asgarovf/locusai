import {
  ArrowRight,
  BrainCircuit,
  CheckCircle2,
  FileText,
  ListChecks,
  MessageSquare,
  Terminal,
  Users,
} from "lucide-react";
import { Metadata } from "next";
import Link from "next/link";
import { Footer, Navbar } from "@/components/layout";

export const metadata: Metadata = {
  title: "Sprint Planning",
  description:
    "AI-powered sprint planning that breaks down directives into architecturally coherent tasks with complexity estimates and risk assessments.",
  alternates: {
    canonical: "https://locusai.dev/products/planning",
  },
  openGraph: {
    url: "https://locusai.dev/products/planning",
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "Locus Sprint Planning",
  applicationCategory: "DeveloperApplication",
  url: "https://locusai.dev/products/planning",
  description:
    "AI-powered sprint planning that breaks down directives into architecturally coherent tasks with complexity estimates and risk assessments.",
  author: {
    "@id": "https://locusai.dev/#organization",
  },
};

const steps = [
  {
    step: "01",
    title: "Define your directive",
    description:
      'Start a planning meeting with a high-level directive like "Build authentication system with OAuth". The AI analyzes your codebase and generates a structured plan.',
    command: 'locus plan "Build authentication system with OAuth"',
    color: "text-violet",
  },
  {
    step: "02",
    title: "Review the plan",
    description:
      "Inspect the generated plan with tasks, complexity estimates (1–5), assignee roles, risk assessments, and time estimates. Plans are saved locally in .locus/plans/.",
    command: "locus plan --list",
    color: "text-cyan",
  },
  {
    step: "03",
    title: "Approve or iterate",
    description:
      "Approve the plan to create a sprint with tasks in your workspace. Or reject with feedback — the AI will re-plan incorporating your notes.",
    command: "locus plan --approve pl_8xk2m",
    color: "text-emerald",
  },
];

const features = [
  {
    icon: <BrainCircuit className="h-4 w-4" />,
    title: "Codebase-aware planning",
    description:
      "The AI reads your project structure, dependencies, and existing code before generating tasks. Plans fit your architecture.",
    color: "text-violet",
  },
  {
    icon: <ListChecks className="h-4 w-4" />,
    title: "Structured task breakdown",
    description:
      "Each plan includes named tasks with complexity ratings, assignee roles (frontend, backend, fullstack), and dependencies.",
    color: "text-cyan",
  },
  {
    icon: <MessageSquare className="h-4 w-4" />,
    title: "Feedback loop",
    description:
      "Reject a plan with feedback and the AI re-plans. Use --reject with --feedback to iterate until the plan is right.",
    color: "text-amber",
  },
  {
    icon: <Users className="h-4 w-4" />,
    title: "Role-based assignments",
    description:
      "Tasks are assigned to roles like FRONTEND, BACKEND, FULLSTACK, DEVOPS — matching your team structure.",
    color: "text-emerald",
  },
  {
    icon: <FileText className="h-4 w-4" />,
    title: "Local plan storage",
    description:
      "All plans are saved locally in .locus/plans/ with unique IDs. View them anytime with --show, even offline.",
    color: "text-rose",
  },
  {
    icon: <CheckCircle2 className="h-4 w-4" />,
    title: "Sprint creation",
    description:
      "Approved plans become sprints in your Locus workspace with tasks ready to be claimed by agents.",
    color: "text-cyan",
  },
];

const flags = [
  { flag: 'locus plan "directive"', description: "Start a planning meeting" },
  { flag: "locus plan --list", description: "List all saved plans" },
  { flag: "locus plan --show <id>", description: "View full plan in markdown" },
  {
    flag: "locus plan --approve <id>",
    description: "Approve and create sprint",
  },
  {
    flag: "locus plan --reject <id> --feedback",
    description: "Reject with feedback",
  },
  { flag: "locus plan --cancel <id>", description: "Cancel a pending plan" },
];

export default function PlanningPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <Navbar />
      <main className="flex-1">
        {/* Hero */}
        <section className="relative pt-36 pb-20 md:pt-44 md:pb-28 overflow-hidden">
          <div className="mesh-gradient-hero absolute inset-0" />
          <div className="max-w-4xl px-6 mx-auto relative text-center">
            <p className="text-xs font-medium tracking-[0.2em] uppercase text-violet mb-4">
              Sprint Planning
            </p>
            <h1 className="text-4xl md:text-6xl font-bold tracking-tight text-white mb-6">
              AI-powered planning that understands your code
            </h1>
            <p className="text-base md:text-lg text-muted-foreground max-w-xl mx-auto leading-relaxed">
              Break down high-level directives into architecturally coherent
              sprints with task breakdowns, complexity estimates, and risk
              assessments.
            </p>
          </div>
        </section>

        {/* Workflow steps */}
        <section className="pb-28 relative">
          <div className="max-w-3xl px-6 mx-auto">
            <div className="space-y-16">
              {steps.map((step) => (
                <div key={step.step}>
                  <div className="flex items-center gap-3 mb-4">
                    <span
                      className={`text-xs font-mono font-bold ${step.color}`}
                    >
                      {step.step}
                    </span>
                    <h3 className="text-xl font-bold text-white">
                      {step.title}
                    </h3>
                  </div>
                  <p className="text-sm text-muted-foreground leading-relaxed mb-5 max-w-lg">
                    {step.description}
                  </p>
                  <div className="rounded-xl border border-border/40 bg-[#040406] overflow-hidden font-mono text-[12px] md:text-[13px]">
                    <div className="flex items-center gap-2 px-4 py-2.5 border-b border-border/20 bg-[#080810]">
                      <div className="flex gap-1.5">
                        <div className="w-2 h-2 rounded-full bg-rose/50" />
                        <div className="w-2 h-2 rounded-full bg-amber/50" />
                        <div className="w-2 h-2 rounded-full bg-emerald/50" />
                      </div>
                      <span className="text-[10px] text-muted-foreground font-sans flex items-center gap-1.5 mx-auto">
                        <Terminal className="w-2.5 h-2.5" />
                        terminal
                      </span>
                    </div>
                    <div className="p-4">
                      <span className="text-violet/50">$ </span>
                      <span className="text-foreground">{step.command}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Features */}
        <section className="pb-28 relative">
          <div className="max-w-5xl px-6 mx-auto">
            <div className="glow-line-multi mb-16" />
            <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-white mb-12 text-center">
              Built for real engineering workflows
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {features.map((feat) => (
                <div key={feat.title}>
                  <div
                    className={`flex h-8 w-8 items-center justify-center rounded-lg bg-white/[0.04] border border-white/[0.06] ${feat.color} mb-4`}
                  >
                    {feat.icon}
                  </div>
                  <h3 className="text-sm font-medium text-white mb-2">
                    {feat.title}
                  </h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {feat.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Command reference */}
        <section className="pb-28 relative">
          <div className="max-w-2xl px-6 mx-auto">
            <h2 className="text-2xl font-bold tracking-tight text-white mb-8 text-center">
              Command reference
            </h2>
            <div className="rounded-xl border border-border/40 bg-[#060609] overflow-hidden">
              <div className="px-5 py-3 border-b border-border/20 bg-[#080810]">
                <code className="text-xs text-muted-foreground">
                  locus plan [options]
                </code>
              </div>
              <div className="divide-y divide-border/10">
                {flags.map((f) => (
                  <div
                    key={f.flag}
                    className="flex items-start gap-4 px-5 py-3"
                  >
                    <code className="text-xs text-violet font-mono shrink-0 min-w-[250px]">
                      {f.flag}
                    </code>
                    <span className="text-xs text-muted-foreground">
                      {f.description}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="pb-28 relative">
          <div className="max-w-3xl px-6 mx-auto text-center">
            <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-white mb-4">
              Plan your next sprint with AI
            </h2>
            <p className="text-muted-foreground max-w-md mx-auto text-sm mb-8 leading-relaxed">
              Install the CLI and run your first planning meeting in seconds.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-4">
              <Link
                href="https://app.locusai.dev/register"
                className="inline-flex items-center gap-2 text-sm font-medium bg-white text-background px-7 py-3 rounded-xl hover:bg-white/85 transition-colors"
              >
                Get Started
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
              <Link
                href="https://docs.locusai.dev"
                className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                Read the docs
                <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
