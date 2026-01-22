/**
 * Loading State Component
 *
 * Unified loading state display with skeleton loading pattern.
 */

"use client";

import { Spinner } from "@/components/ui";
import { cn } from "@/lib/utils";

interface LoadingStateProps {
  variant?: "page" | "section" | "inline";
  message?: string;
  className?: string;
}

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
    <div className={cn(variantClasses[variant], className)}>
      <Spinner size={spinnerSize[variant]} />
      {message && (
        <p className="text-muted-foreground text-sm font-medium">{message}</p>
      )}
    </div>
  );
}
