"use client";

import type { ProjectManifestType } from "@locusai/shared";
import { motion } from "framer-motion";
import {
  Check,
  Code2,
  Compass,
  Flag,
  Lightbulb,
  Rocket,
  Target,
  Trophy,
  Users,
} from "lucide-react";
import { useMemo } from "react";
import { SecondaryText, SectionLabel } from "@/components/typography";
import { Tooltip } from "@/components/ui";
import { useManifestCompletion } from "@/hooks/useManifestCompletion";
import { cn } from "@/lib/utils";

// ============================================================================
// Field Metadata Configuration
// ============================================================================

interface FieldMetadata {
  key: keyof ProjectManifestType;
  label: string;
  description: string;
  icon: React.ElementType;
  prompt: string;
}

const FIELD_METADATA: FieldMetadata[] = [
  {
    key: "name",
    label: "Project Name",
    description: "The name of your project",
    icon: Flag,
    prompt: "What is the name of your project?",
  },
  {
    key: "mission",
    label: "Mission",
    description: "The core purpose and value proposition",
    icon: Target,
    prompt: "What is the mission or core purpose of your project?",
  },
  {
    key: "targetUsers",
    label: "Target Users",
    description: "Who will use your product",
    icon: Users,
    prompt: "Who are the target users for your project?",
  },
  {
    key: "techStack",
    label: "Tech Stack",
    description: "Technologies and frameworks used",
    icon: Code2,
    prompt: "What technologies and frameworks does your project use?",
  },
  {
    key: "phase",
    label: "Project Phase",
    description: "Current development stage",
    icon: Rocket,
    prompt: "What phase is your project currently in?",
  },
  {
    key: "features",
    label: "Features",
    description: "Key features and capabilities",
    icon: Lightbulb,
    prompt: "What are the key features of your project?",
  },
  {
    key: "competitors",
    label: "Competitors",
    description: "Alternative solutions in the market",
    icon: Trophy,
    prompt: "Who are your main competitors or alternatives?",
  },
];

// ============================================================================
// Types
// ============================================================================

type FieldStatus = "completed" | "current" | "pending";

interface FieldChecklistProps {
  /** Callback when user clicks a field to navigate to that topic */
  onNavigateToField?: (
    field: keyof ProjectManifestType,
    prompt: string
  ) => void;
  /** Optional className for the container */
  className?: string;
}

// ============================================================================
// Component
// ============================================================================

export function FieldChecklist({
  onNavigateToField,
  className,
}: FieldChecklistProps) {
  const { filledFields, missingFields, percentage, isLoading } =
    useManifestCompletion();

  // Determine the status of each field
  const fieldStatuses = useMemo(() => {
    const statuses = new Map<string, FieldStatus>();

    // Mark filled fields as completed
    for (const field of filledFields) {
      statuses.set(field, "completed");
    }

    // Mark the first missing field as current, rest as pending
    for (let i = 0; i < missingFields.length; i++) {
      statuses.set(missingFields[i], i === 0 ? "current" : "pending");
    }

    return statuses;
  }, [filledFields, missingFields]);

  const handleFieldClick = (field: FieldMetadata) => {
    if (onNavigateToField) {
      onNavigateToField(field.key, field.prompt);
    }
  };

  return (
    <div className={cn("flex flex-col", className)}>
      {/* Header with progress */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
            <Compass size={16} />
          </div>
          <SectionLabel as="h4">Manifest Fields</SectionLabel>
        </div>
        <div className="flex items-center gap-6">
          <div className="flex flex-col items-end">
            <SecondaryText size="xs" className="mb-1.5">
              Completion
            </SecondaryText>
            <span className="text-sm font-mono font-black text-primary">
              {percentage}%
            </span>
          </div>
          <div className="w-32 h-2 bg-secondary/40 rounded-full overflow-hidden border border-border/30 shadow-inner">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${percentage}%` }}
              transition={{ duration: 0.8, ease: "easeOut" }}
              className="h-full bg-primary shadow-[0_0_15px_rgba(var(--primary),0.4)]"
            />
          </div>
        </div>
      </div>

      {/* Field list */}
      <div className="grid gap-2">
        {FIELD_METADATA.map((field, index) => {
          const status = fieldStatuses.get(field.key) ?? "pending";
          const Icon = field.icon;
          const isClickable = !!onNavigateToField;

          return (
            <Tooltip key={field.key} content={field.description}>
              <motion.button
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05, duration: 0.3 }}
                onClick={() => handleFieldClick(field)}
                disabled={isLoading || !isClickable}
                className={cn(
                  "group flex items-center gap-3 p-3 rounded-xl border transition-all duration-200 text-left w-full",
                  status === "completed" && [
                    "bg-green-500/5 border-green-500/20",
                    "hover:bg-green-500/10 hover:border-green-500/30",
                  ],
                  status === "current" && [
                    "bg-primary/10 border-primary/40",
                    "hover:bg-primary/15 hover:border-primary/50",
                    "ring-1 ring-primary/20",
                  ],
                  status === "pending" && [
                    "bg-secondary/20 border-border/40",
                    "hover:bg-secondary/30 hover:border-border/60",
                  ],
                  isLoading && "opacity-60 pointer-events-none",
                  !isClickable && "cursor-default"
                )}
              >
                {/* Status indicator */}
                <div
                  className={cn(
                    "h-6 w-6 rounded-lg flex items-center justify-center shrink-0 transition-colors",
                    status === "completed" && "bg-green-500/20 text-green-500",
                    status === "current" && "bg-primary/20 text-primary",
                    status === "pending" &&
                      "bg-secondary/40 text-muted-foreground"
                  )}
                >
                  {status === "completed" ? (
                    <Check size={14} strokeWidth={3} />
                  ) : (
                    <Icon size={14} />
                  )}
                </div>

                {/* Field info */}
                <div className="flex-1 min-w-0">
                  <span
                    className={cn(
                      "text-sm font-medium block truncate transition-colors",
                      status === "completed" && "text-green-500",
                      status === "current" && "text-primary",
                      status === "pending" && "text-muted-foreground"
                    )}
                  >
                    {field.label}
                  </span>
                </div>

                {/* Visual cue for current field */}
                {status === "current" && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="h-2 w-2 rounded-full bg-primary shrink-0"
                  />
                )}
              </motion.button>
            </Tooltip>
          );
        })}
      </div>

      {/* Summary footer */}
      <div className="mt-4 pt-4 border-t border-border/30">
        <SecondaryText size="xs" className="text-center">
          {filledFields.length} of {FIELD_METADATA.length} fields completed
        </SecondaryText>
      </div>
    </div>
  );
}
