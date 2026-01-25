/**
 * Backlog Section Component
 *
 * Reusable section component for backlog and sprint organization.
 * Supports collapsible header with count badge and actions.
 *
 * @example
 * <BacklogSection
 *   id="sprint-1"
 *   title="Sprint 1"
 *   icon={<Flag size={18} />}
 *   count={12}
 *   isExpanded={true}
 *   onToggle={handleToggle}
 *   accentColor="primary"
 * >
 *   { Section content }
 * </BacklogSection>
 */

"use client";

import { ChevronDown, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface BacklogSectionProps {
  /** Unique section identifier */
  id: string;
  /** Display title */
  title: string;
  /** Icon to display */
  icon: React.ReactNode;
  /** Item count to display */
  count: number;
  /** Whether section is expanded */
  isExpanded: boolean;
  /** Called when toggling expand state */
  onToggle: () => void;
  /** Color theme for section */
  accentColor: "slate" | "primary" | "amber" | "green" | "emerald";
  /** Optional badge text */
  badge?: string;
  /** Optional action elements */
  actions?: React.ReactNode;
  /** Section content */
  children: React.ReactNode;
}

export function BacklogSection({
  id: _id,
  title,
  icon,
  count,
  isExpanded,
  onToggle,
  accentColor,
  badge,
  actions,
  children,
}: BacklogSectionProps) {
  const colors = {
    slate: "text-slate-500",
    primary: "text-primary",
    emerald: "text-emerald-500",
    amber: "text-amber-500",
    green: "text-green-500",
  };

  const badgeColors = {
    slate: "bg-secondary text-muted-foreground",
    primary: "bg-primary/10 text-primary border-primary/20",
    emerald: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
    amber: "bg-amber-500/10 text-amber-500 border-amber-500/20",
    green: "bg-green-500/10 text-green-500 border-green-500/20",
  };

  return (
    <div className="space-y-2">
      {/* Header */}
      <div
        onClick={onToggle}
        onKeyDown={(e) => e.key === "Enter" && onToggle()}
        className={cn(
          "w-full flex items-center justify-between px-2 py-2 cursor-pointer select-none group rounded-lg transition-colors",
          "hover:bg-secondary/40"
        )}
      >
        <div className="flex items-center gap-3">
          <div className="p-1 rounded-md text-muted-foreground/60 group-hover:text-foreground transition-colors">
            {isExpanded ? (
              <ChevronDown size={16} />
            ) : (
              <ChevronRight size={16} />
            )}
          </div>

          <div
            className={cn(
              "transition-opacity flex items-center gap-2",
              colors[accentColor]
            )}
          >
            {icon}
            <span className="font-semibold text-[15px] tracking-tight text-foreground">
              {title}
            </span>
          </div>

          <span className="text-[11px] text-muted-foreground/50 bg-secondary/50 px-2 py-0.5 rounded-full font-mono font-medium">
            {count}
          </span>

          {badge && (
            <span
              className={cn(
                "text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full font-bold border",
                badgeColors[accentColor]
              )}
            >
              {badge}
            </span>
          )}
        </div>

        {actions && (
          <div
            className="flex items-center"
            onClick={(e) => e.stopPropagation()}
          >
            {actions}
          </div>
        )}
      </div>

      {/* Content */}
      <div
        className={cn(
          "grid transition-all duration-300 ease-in-out",
          isExpanded
            ? "grid-rows-[1fr] opacity-100"
            : "grid-rows-[0fr] opacity-0"
        )}
      >
        <div className="overflow-hidden p-1">
          <div className="px-2 pb-6 space-y-0">{children}</div>
        </div>
      </div>
    </div>
  );
}
