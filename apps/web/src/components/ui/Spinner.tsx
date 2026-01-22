"use client";

import { cn } from "@/lib/utils";

interface SpinnerProps {
  className?: string;
  size?: "sm" | "md" | "lg" | "xl";
}

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

export function LoadingPage() {
  return (
    <div className="flex items-center justify-center w-full h-full min-h-screen">
      <Spinner size="lg" />
    </div>
  );
}

/**
 * Full-screen loading state that appears during hydration and initial data fetching.
 * Uses a skeleton layout with sidebar to prevent layout shift.
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

export function LoadingOverlay() {
  return (
    <div className="absolute inset-0 bg-background/50 backdrop-blur-sm z-50 flex items-center justify-center">
      <Spinner size="lg" />
    </div>
  );
}
