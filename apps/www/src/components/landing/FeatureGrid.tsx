"use client";

import { motion } from "framer-motion";
import {
  Album,
  BrainCircuit,
  Code2,
  Database,
  ShieldCheck,
} from "lucide-react";

const features = [
  {
    title: "Privacy by Design",
    description:
      "Your intellectual property never leaves your machine. Agents execute locally while you coordinate via the cloud.",
    icon: Database,
    className: "md:col-span-2 md:row-span-2",
  },
  {
    title: "AI-Native Kanban",
    description:
      "Tasks designed for agents. Detailed acceptance criteria and context-aware assignment.",
    icon: Album,
    className: "md:col-span-1",
  },
  {
    title: "Documentation Hub",
    description:
      "Markdown docs that live with your code. Agents read them to understand the system.",
    icon: Code2,
    className: "md:col-span-1",
  },
  {
    title: "Secure CI Runtime",
    description:
      "Agents can run approved commands (test, lint, build) to verify their own code.",
    icon: ShieldCheck,
    className: "md:col-span-1",
  },
  {
    title: "Sprint Mindmaps",
    description:
      "Agents generate high-level technical plans for sprints to ensure cohesive implementation across tasks.",
    icon: BrainCircuit,
    className: "md:col-span-2",
  },
];

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
};

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5 } },
};

export function FeatureGrid() {
  return (
    <section className="py-24 bg-secondary/5 relative overflow-hidden">
      <div className="container px-4 md:px-6 mx-auto">
        <div className="text-center mb-16">
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="text-3xl font-bold tracking-tight mb-4"
          >
            Everything an Agent Needs
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="text-muted-foreground max-w-2xl mx-auto"
          >
            Locus provides the cognitive architecture for autonomous software
            engineering.
          </motion.p>
        </div>

        <motion.div
          variants={container}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-100px" }}
          className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-5xl mx-auto"
        >
          {features.map((feature, i) => (
            <motion.div
              key={i}
              variants={item}
              className={`group relative overflow-hidden rounded-2xl border border-border/50 bg-background/50 p-8 hover:bg-background/80 transition-colors ${feature.className}`}
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary mb-4 group-hover:scale-110 transition-transform">
                <feature.icon className="h-6 w-6" />
              </div>
              <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
              <p className="text-muted-foreground leading-relaxed">
                {feature.description}
              </p>

              {/* Decorative gradient blob */}
              <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-primary/5 rounded-full blur-2xl group-hover:bg-primary/10 transition-colors" />
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
