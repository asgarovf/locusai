"use client";

import { motion } from "framer-motion";
import {
  BrainCircuit,
  CheckCircle2,
  GitPullRequestArrow,
  Terminal,
} from "lucide-react";

const steps = [
  {
    title: "Plan",
    description: "Define tasks and sprints in the cloud dashboard.",
    icon: Terminal,
  },
  {
    title: "Dispatch",
    description: "Assign tasks to agents via the CLI.",
    icon: BrainCircuit,
  },
  {
    title: "Execute",
    description: "Agents run securely on your machine.",
    icon: GitPullRequestArrow,
  },
  {
    title: "Verify",
    description: "Review the work and merge to master.",
    icon: CheckCircle2,
  },
];

export function WorkflowSteps() {
  return (
    <section className="py-24 bg-background relative border-y border-border/50">
      <div className="container px-4 md:px-6 mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-3xl font-bold tracking-tight mb-4">
            The Agent Lifecycle
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            From backlog to deployment, Locus automates the tedious parts of
            software engineering.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 relative">
          {/* Connector Line (Desktop) */}
          <div className="hidden md:block absolute top-8 left-[12%] right-[12%] h-[2px] bg-linear-to-r from-border via-primary/20 to-border -z-10" />

          {steps.map((step, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="flex flex-col items-center text-center group"
            >
              <div className="w-16 h-16 rounded-2xl bg-secondary border border-border flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300 shadow-lg relative">
                <step.icon className="w-8 h-8 text-primary" />
                <div className="absolute -inset-2 bg-primary/5 rounded-3xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
              <h3 className="text-xl font-semibold mb-2">{step.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed max-w-[200px]">
                {step.description}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
