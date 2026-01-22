/**
 * Metadata Text Component
 *
 * Displays metadata, IDs, timestamps, or other secondary information.
 * Replaces custom inline typography for technical info throughout UI.
 *
 * Usage: Replace inline `text-[8px] font-bold uppercase tracking-widest text-muted-foreground/50`
 *
 * @example
 * <MetadataText>ID: abc-123</MetadataText>
 * <MetadataText>Updated 2 hours ago</MetadataText>
 */

"use client";

import React from "react";
import { cn } from "@/lib/utils";

interface MetadataTextProps {
  /** Metadata content */
  children: React.ReactNode;
  /** Size variant */
  size?: "xs" | "sm";
  /** Optional className override */
  className?: string;
  /** HTML element (default: div) */
  as?: "div" | "span" | "p";
}

/**
 * Standardized metadata text component
 *
 * Features:
 * - Smaller text for secondary metadata
 * - Readable yet de-emphasized (60% opacity)
 * - Wide letter spacing for technical info
 * - Uppercase styling
 * - Replaces scattered custom metadata classes
 *
 * @component
 */
export function MetadataText({
  children,
  size = "xs",
  className,
  as: Component = "div",
}: MetadataTextProps) {
  const sizeClasses = {
    xs: "text-[8px]",
    sm: "text-[9px]",
  };

  return (
    <Component
      className={cn(
        sizeClasses[size],
        "font-bold uppercase tracking-widest",
        "text-foreground/60",
        className
      )}
    >
      {children}
    </Component>
  );
}
