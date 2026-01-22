/**
 * Empty State Text Component
 *
 * Displays text for empty states with proper styling and visibility.
 * Replaces scattered custom empty state typography throughout UI.
 *
 * Usage: Replace inline `text-[9px] font-black uppercase tracking-[0.2em] opacity-30`
 *
 * @example
 * <EmptyStateText>No items found</EmptyStateText>
 * <EmptyStateText icon={<Box />}>Empty workspace</EmptyStateText>
 */

"use client";

import React from "react";
import { cn } from "@/lib/utils";

interface EmptyStateTextProps {
  /** Text content */
  children: React.ReactNode;
  /** Optional icon to display */
  icon?: React.ReactNode;
  /** Optional className override */
  className?: string;
}

/**
 * Standardized empty state text component
 *
 * Features:
 * - Proper contrast for empty states
 * - Icon support
 * - Readable but secondary appearance
 * - Consistent spacing
 * - Replaces scattered custom opacity patterns
 *
 * @component
 */
export function EmptyStateText({
  children,
  icon,
  className,
}: EmptyStateTextProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center",
        "text-[9px] font-black uppercase tracking-[0.2em]",
        "text-foreground/40",
        "gap-2",
        className
      )}
    >
      {icon && <div className="text-foreground/30">{icon}</div>}
      {children}
    </div>
  );
}
