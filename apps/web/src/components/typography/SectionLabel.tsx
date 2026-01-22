/**
 * Section Label Component
 *
 * Displays a section header or label with standardized styling.
 * Replaces custom inline typography for section titles throughout the UI.
 *
 * Usage: Replace inline text-[10px] font-black uppercase tracking-[0.2em]
 *
 * @example
 * <SectionLabel>Settings</SectionLabel>
 * <SectionLabel icon={<Gear />}>Advanced</SectionLabel>
 */

"use client";

import React from "react";
import { cn } from "@/lib/utils";

interface SectionLabelProps {
  /** Label text content */
  children: React.ReactNode;
  /** Optional icon to display before text */
  icon?: React.ReactNode;
  /** Optional className override */
  className?: string;
  /** Label HTML element (default: div) */
  as?: "div" | "h3" | "h4" | "label" | "span";
}

/**
 * Standardized section label component
 *
 * Features:
 * - Consistent typography for section headers
 * - Optional icon support
 * - Readable secondary text (60% opacity)
 * - Proper spacing and tracking
 * - Fully customizable via className prop
 *
 * @component
 */
export function SectionLabel({
  children,
  icon,
  className,
  as: Component = "div",
}: SectionLabelProps) {
  return (
    <Component
      className={cn(
        "text-[10px] font-black uppercase tracking-[0.2em] text-foreground/60",
        "flex items-center gap-2",
        className
      )}
    >
      {icon}
      {children}
    </Component>
  );
}
