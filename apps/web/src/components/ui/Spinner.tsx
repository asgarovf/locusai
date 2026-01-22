"use client";

import { cn } from "@/lib/utils";
import { SPINNER_SIZES } from "./constants";

/**
 * Spinner component props
 *
 * @property size - Spinner size (default: "md")
 * @property className - Additional CSS classes
 */
interface SpinnerProps {
  /** Additional CSS classes */
  className?: string;
  /** Spinner size */
  size?: keyof typeof SPINNER_SIZES;
}

/**
 * Spinner component
 *
 * A circular loading indicator with smooth animation.
 * Used to indicate data fetching or processing.
 *
 * @example
 * // Default spinner
 * <Spinner />
 *
 * @example
 * // Large spinner
 * <Spinner size="lg" />
 */
export function Spinner({ className, size = "md" }: SpinnerProps) {
  const sizeClasses = {
    sm: "h-4 w-4 border-2",
    md: "h-8 w-8 border-3",
    lg: "h-12 w-12 border-4",
    xl: "h-16 w-16 border-4",
  };

  return (
    <div
      className={cn(
        "animate-spin rounded-full border-primary border-t-transparent",
        sizeClasses[size],
        className
      )}
    />
  );
}

/**
 * Full-page loading state component
 *
 * Displays a centered spinner for full-page loading scenarios.
 * Use for page transitions and initial data loading.
 *
 * @example
 * <LoadingPage />
 */
export function LoadingPage() {
  return (
    <div className="flex items-center justify-center w-full h-full min-h-screen">
      <Spinner size="lg" />
    </div>
  );
}

/**
 * Full-screen loading skeleton component
 *
 * Displays a full-screen loading state with sidebar placeholder
 * to prevent layout shift during initial hydration.
 * Use during app initialization in dashboard layout.
 *
 * @example
 * <LoadingSkeleton />
 */
export function LoadingSkeleton() {
  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Sidebar Skeleton */}
      <aside className="w-56 border-r border-border bg-background flex flex-col">
        <div className="flex-1" />
      </aside>

      {/* Main Content Skeleton */}
      <main className="flex-1 overflow-auto bg-background p-6">
        <div className="flex items-center justify-center h-full">
          <Spinner size="lg" />
        </div>
      </main>
    </div>
  );
}

/**
 * Overlay loading state component
 *
 * Displays a semi-transparent overlay with centered spinner.
 * Use for asynchronous operations on pages that should remain interactive.
 *
 * @example
 * {isLoading && <LoadingOverlay />}
 */
export function LoadingOverlay() {
  return (
    <div className="absolute inset-0 bg-background/50 backdrop-blur-sm z-50 flex items-center justify-center">
      <Spinner size="lg" />
    </div>
  );
}
