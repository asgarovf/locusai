"use client";

import { type LucideIcon, Sparkles } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Empty state component props
 *
 * @property icon - Icon component to display
 * @property title - Main empty state title
 * @property description - Optional description text
 * @property action - Optional action button/element
 * @property variant - Display variant: default, compact, or minimal
 */
interface EmptyStateProps {
  /** Icon component (default: Sparkles) */
  icon?: LucideIcon;
  /** Empty state title */
  title: string;
  /** Optional description text */
  description?: string;
  /** Optional action element (e.g., Button) */
  action?: ReactNode;
  /** Additional CSS classes */
  className?: string;
  /** Display variant */
  variant?: "default" | "compact" | "minimal";
}

/**
 * Empty state component
 *
 * Displays a friendly empty state UI for when no data is available.
 * Supports three variants for different contexts.
 *
 * @example
 * // Default variant (large, centered)
 * <EmptyState
 *   title="No tasks yet"
 *   description="Create your first task to get started"
 *   action={<Button>Create Task</Button>}
 * />
 *
 * @example
 * // Compact variant (smaller)
 * <EmptyState
 *   variant="compact"
 *   title="No results"
 *   icon={Search}
 * />
 *
 * @example
 * // Minimal variant (inline)
 * <EmptyState
 *   variant="minimal"
 *   title="No items"
 *   icon={ListX}
 * />
 */
export function EmptyState({
  icon: Icon = Sparkles,
  title,
  description,
  action,
  className,
  variant = "default",
}: EmptyStateProps) {
  if (variant === "minimal") {
    return (
      <div
        className={cn(
          "flex flex-col items-center justify-center py-8 text-center",
          className
        )}
      >
        <Icon
          size={24}
          className="text-muted-foreground/40 mb-2"
          aria-hidden="true"
        />
        <p className="text-sm text-muted-foreground/60 font-medium">{title}</p>
      </div>
    );
  }

  if (variant === "compact") {
    return (
      <div
        className={cn(
          "flex flex-col items-center justify-center p-6 text-center bg-secondary/10 rounded-xl border border-dashed border-border/50",
          className
        )}
      >
        <Icon size={20} className="text-primary/40 mb-2" aria-hidden="true" />
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
        {description && (
          <p className="text-xs text-muted-foreground mt-1">{description}</p>
        )}
        {action && <div className="mt-3">{action}</div>}
      </div>
    );
  }

  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center p-12 text-center",
        className
      )}
    >
      <div className="relative mb-6">
        <div className="absolute inset-0 rounded-full" />
        <div className="relative flex items-center justify-center w-20 h-20 rounded-2xl bg-linear-to-br from-secondary to-secondary/30 border border-border/50">
          <Icon size={32} className="text-primary/60" aria-hidden="true" />
        </div>
      </div>

      <h3 className="text-xl font-bold text-foreground mb-2">{title}</h3>
      {description && (
        <p className="max-w-[300px] text-sm text-muted-foreground mb-8 leading-relaxed">
          {description}
        </p>
      )}

      {action && <div>{action}</div>}
    </div>
  );
}
