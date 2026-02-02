"use client";

import { motion } from "framer-motion";
import { Check } from "lucide-react";
import { Tooltip } from "@/components/ui";
import { getFieldMetadata, TOTAL_FIELDS } from "@/lib/field-metadata";
import { cn } from "@/lib/utils";

interface InterviewProgressProps {
  /**
   * Current completion percentage (0-100)
   */
  percentage: number;
  /**
   * Array of field keys that are missing/incomplete
   */
  missingFields: string[];
  /**
   * Array of field keys that are filled/complete
   */
  filledFields: string[];
  /**
   * Additional CSS classes
   */
  className?: string;
}

/**
 * Interview Progress Bar Component
 *
 * Displays a progress bar with field indicators for the interview process.
 * Shows which fields are complete and highlights the current field being discussed.
 */
export function InterviewProgress({
  percentage,
  missingFields,
  filledFields,
  className,
}: InterviewProgressProps) {
  // Get the current field being discussed (first missing field)
  const currentField = missingFields[0];
  const currentFieldMeta = currentField
    ? getFieldMetadata(currentField)
    : undefined;

  return (
    <div className={cn("flex items-center gap-3", className)}>
      {/* Progress bar container */}
      <div className="flex items-center gap-2 flex-1 min-w-0">
        {/* Current field indicator */}
        {currentFieldMeta && (
          <Tooltip content={`Currently: ${currentFieldMeta.label}`}>
            <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-primary/10 border border-primary/20 shrink-0">
              <currentFieldMeta.icon size={12} className="text-primary" />
              <span className="text-xs font-medium text-primary truncate max-w-[80px]">
                {currentFieldMeta.label}
              </span>
            </div>
          </Tooltip>
        )}

        {/* Progress bar */}
        <div className="flex-1 min-w-[100px] h-2 bg-secondary/40 rounded-full overflow-hidden border border-border/30">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${percentage}%` }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className={cn(
              "h-full rounded-full transition-colors",
              percentage === 100 ? "bg-green-500" : "bg-primary"
            )}
          />
        </div>

        {/* Percentage */}
        <span className="text-xs font-mono font-semibold text-muted-foreground shrink-0">
          {percentage}%
        </span>
      </div>

      {/* Field completion dots */}
      <div className="hidden sm:flex items-center gap-1">
        {Array.from({ length: TOTAL_FIELDS }).map((_, index) => {
          const isComplete = index < filledFields.length;
          const isCurrent = index === filledFields.length;

          return (
            <Tooltip
              key={index}
              content={
                isComplete
                  ? `${getFieldMetadata(filledFields[index])?.label || "Field"} complete`
                  : isCurrent && currentFieldMeta
                    ? `In progress: ${currentFieldMeta.label}`
                    : "Pending"
              }
            >
              <div
                className={cn(
                  "w-2 h-2 rounded-full transition-all",
                  isComplete
                    ? "bg-green-500"
                    : isCurrent
                      ? "bg-primary animate-pulse"
                      : "bg-secondary/60 border border-border/40"
                )}
              >
                {isComplete && (
                  <Check size={8} className="text-white" strokeWidth={3} />
                )}
              </div>
            </Tooltip>
          );
        })}
      </div>
    </div>
  );
}
