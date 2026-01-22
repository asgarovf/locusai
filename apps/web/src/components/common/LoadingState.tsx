/**
 * Loading State Component
 *
 * Unified loading state display with consistent sizing.
 * Use for data fetching, form submission, and async operations.
 */

"use client";

import { Spinner } from "@/components/ui";
import { cn } from "@/lib/utils";

/**
 * Loading state component props
 *
 * @property variant - Display variant (page, section, or inline)
 * @property message - Optional loading message
 */
interface LoadingStateProps {
  /** Display variant */
  variant?: "page" | "section" | "inline";
  /** Optional loading message */
  message?: string;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Loading state component
 *
 * Displays loading indicator with optional message.
 * Three variants for different contexts.
 *
 * @example
 * // Page-level loading
 * <LoadingState
 *   variant="page"
 *   message="Loading data..."
 * />
 *
 * @example
 * // Inline loading (e.g., in a button)
 * <LoadingState
 *   variant="inline"
 * />
 *
 * @example
 * // Section loading (e.g., in a card)
 * <LoadingState
 *   variant="section"
 *   message="Fetching results..."
 * />
 */
export function LoadingState({
  variant = "page",
  message,
  className,
}: LoadingStateProps) {
  const variantClasses = {
    page: "flex flex-col items-center justify-center min-h-[400px] w-full gap-4",
    section: "flex flex-col items-center justify-center py-12 w-full gap-3",
    inline: "flex items-center gap-2",
  };

  const spinnerSize = {
    page: "lg" as const,
    section: "md" as const,
    inline: "sm" as const,
  };

  return (
    <output
      className={cn(variantClasses[variant], className)}
      aria-live="polite"
      aria-label={message || "Loading"}
    >
      <Spinner size={spinnerSize[variant]} />
      {message && (
        <p className="text-muted-foreground text-sm font-medium">{message}</p>
      )}
    </output>
  );
}
