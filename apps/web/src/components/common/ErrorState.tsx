/**
 * Error State Component
 *
 * Unified error display with recovery options.
 */

"use client";

import { AlertTriangle, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui";
import { cn } from "@/lib/utils";

interface ErrorStateProps {
  variant?: "page" | "section" | "inline";
  title?: string;
  message?: string;
  onRetry?: () => void;
  className?: string;
}

export function ErrorState({
  variant = "page",
  title = "Something went wrong",
  message = "An error occurred. Please try again.",
  onRetry,
  className,
}: ErrorStateProps) {
  const variantClasses = {
    page: "flex flex-col items-center justify-center min-h-[400px] w-full gap-4 py-12",
    section:
      "flex flex-col items-center justify-center py-12 w-full gap-3 px-4",
    inline:
      "flex items-center gap-2 p-3 bg-destructive/10 rounded-lg border border-destructive/20",
  };

  const iconSize = {
    page: 48,
    section: 32,
    inline: 16,
  } as const;

  return (
    <div className={cn(variantClasses[variant], className)}>
      <div className="flex flex-col items-center gap-2">
        <AlertTriangle
          size={iconSize[variant]}
          className="text-destructive/70"
        />
        {variant !== "inline" && (
          <>
            <h3 className="text-lg font-semibold text-destructive">{title}</h3>
            <p className="text-sm text-muted-foreground text-center max-w-sm">
              {message}
            </p>
          </>
        )}
        {variant === "inline" && (
          <p className="text-sm text-destructive font-medium">{message}</p>
        )}
      </div>
      {onRetry && (
        <Button
          variant="outline"
          size={variant === "inline" ? "sm" : "md"}
          onClick={onRetry}
          className="gap-2"
        >
          <RotateCcw size={16} />
          Try Again
        </Button>
      )}
    </div>
  );
}
