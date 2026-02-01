/**
 * Docs Empty State Component
 *
 * Enhanced empty state with quick start cards and template suggestions.
 */

"use client";

import {
  BookOpen,
  Code,
  FileText,
  LayoutTemplate,
  Plus,
  Rocket,
} from "lucide-react";

interface QuickStartCard {
  id: string;
  title: string;
  description: string;
  icon: typeof BookOpen;
  templateId: string;
}

const QUICK_START_CARDS: QuickStartCard[] = [
  {
    id: "prd",
    title: "Product Spec",
    description: "Define requirements, goals, and success metrics",
    icon: Rocket,
    templateId: "prd",
  },
  {
    id: "technical",
    title: "Tech Design",
    description: "Document architecture and implementation details",
    icon: Code,
    templateId: "technical",
  },
  {
    id: "api",
    title: "API Docs",
    description: "Create API reference documentation",
    icon: FileText,
    templateId: "api",
  },
  {
    id: "blank",
    title: "Blank Doc",
    description: "Start from scratch with a clean slate",
    icon: LayoutTemplate,
    templateId: "blank",
  },
];

interface DocsEmptyStateProps {
  onCreateWithTemplate: (templateId: string) => void;
}

export function DocsEmptyState({ onCreateWithTemplate }: DocsEmptyStateProps) {
  return (
    <div className="h-full flex items-center justify-center p-8">
      <div className="max-w-2xl w-full">
        {/* Header */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 border border-primary/20 mb-4">
            <BookOpen size={28} className="text-primary" />
          </div>
          <h2 className="text-2xl font-bold text-foreground mb-2">
            Start Building Your Knowledge Base
          </h2>
          <p className="text-muted-foreground text-sm max-w-md mx-auto">
            Create documentation for your products, APIs, and technical designs.
            Choose a template to get started quickly.
          </p>
        </div>

        {/* Quick Start Cards */}
        <div className="grid grid-cols-2 gap-3 mb-8">
          {QUICK_START_CARDS.map((card) => {
            const Icon = card.icon;
            return (
              <button
                key={card.id}
                onClick={() => onCreateWithTemplate(card.templateId)}
                className="group relative p-4 rounded-xl border border-border/30 bg-card/50 text-left transition-all hover:bg-card hover:border-border/50"
              >
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-muted/30 border border-border/30 group-hover:border-border/50 transition-colors">
                    <Icon
                      size={18}
                      className="text-muted-foreground group-hover:text-foreground transition-colors"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-foreground text-sm mb-0.5">
                      {card.title}
                    </h3>
                    <p className="text-xs text-muted-foreground line-clamp-2">
                      {card.description}
                    </p>
                  </div>
                </div>
                <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Plus size={14} className="text-muted-foreground" />
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
