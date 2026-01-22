/**
 * Secondary Text Component
 *
 * Displays secondary or helper text with standardized styling.
 * Replaces custom inline opacity classes like `text-muted-foreground/50` or `text-foreground/60`
 *
 * Usage: Replace inline text-[9px] text-muted-foreground/60
 *
 * @example
 * <SecondaryText>Last updated 2 hours ago</SecondaryText>
 * <SecondaryText size="sm">Optional description</SecondaryText>
 */

"use client";

import React from "react";
import { cn } from "@/lib/utils";

interface SecondaryTextProps {
  /** Text content */
  children: React.ReactNode;
  /** Text size variant */
  size?: "xs" | "sm";
  /** Optional className override */
  className?: string;
  /** HTML element (default: div) */
  as?: "div" | "p" | "span" | "label";
}

/**
 * Standardized secondary text component
 *
 * Features:
 * - Readable secondary text (60-65% opacity)
 * - Multiple size options
 * - Replaces scattered custom opacity classes
 * - Consistent spacing
 * - Fully customizable
 *
 * @component
 */
export function SecondaryText({
  children,
  size = "xs",
  className,
  as: Component = "div",
}: SecondaryTextProps) {
  const sizeClasses = {
    xs: "text-[9px] font-medium",
    sm: "text-xs font-medium",
  };

  return (
    <Component
      className={cn(sizeClasses[size], "text-foreground/60", className)}
    >
      {children}
    </Component>
  );
}
