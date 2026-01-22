"use client";

import { cn } from "@/lib/utils";

/**
 * Skeleton component props
 *
 * @property className - Additional CSS classes
 */
interface SkeletonProps {
  /** Additional CSS classes */
  className?: string;
}

/**
 * Skeleton component
 *
 * A placeholder element with pulsing animation for loading states.
 * Use to create skeleton screens that match your content layout.
 *
 * @example
 * // Skeleton for avatar
 * <Skeleton className="h-10 w-10 rounded-full" />
 *
 * @example
 * // Skeleton for text
 * <Skeleton className="h-4 w-full rounded" />
 */
export function Skeleton({ className }: SkeletonProps) {
  return (
    <div
      className={cn("animate-pulse rounded-md bg-muted/50", className)}
      aria-busy="true"
    />
  );
}
