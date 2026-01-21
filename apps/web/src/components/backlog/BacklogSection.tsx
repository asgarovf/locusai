"use client";

import { ChevronDown, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface BacklogSectionProps {
  id: string;
  title: string;
  icon: React.ReactNode;
  count: number;
  isExpanded: boolean;
  onToggle: () => void;
  accentColor: "slate" | "primary" | "amber" | "green" | "emerald";
  badge?: string;
  actions?: React.ReactNode;
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
    slate: "border-l-slate-400/60 bg-slate-50/50 dark:bg-slate-900/10",
    primary: "border-l-primary bg-primary/[0.08] dark:bg-primary/[0.06]",
    emerald:
      "border-l-emerald-500 bg-emerald-500/[0.08] dark:bg-emerald-500/[0.06]",
    amber: "border-l-amber-500 bg-amber-500/[0.08] dark:bg-amber-500/[0.06]",
    green: "border-l-green-500 bg-green-500/[0.03] dark:bg-green-500/[0.02]",
  };

  const badgeColors = {
    slate: "bg-muted text-muted-foreground",
    primary: "bg-primary/20 text-primary dark:text-primary-foreground/90",
    emerald: "bg-emerald-500/20 text-emerald-700 dark:text-emerald-400",
    amber: "bg-amber-500/15 text-amber-700 dark:text-amber-400",
    green: "bg-green-500/15 text-green-700 dark:text-green-400",
  };

  return (
    <div
      className={cn(
        "rounded-xl border border-border/40 overflow-hidden transition-all duration-200",
        colors[accentColor],
        "border-l-4",
        isExpanded
          ? "shadow-sm ring-1 ring-border/10"
          : "hover:bg-secondary/5 dark:hover:bg-white/2"
      )}
    >
      {/* Header */}
      <div
        onClick={onToggle}
        onKeyDown={(e) => e.key === "Enter" && onToggle()}
        className="w-full flex items-center justify-between p-3.5 cursor-pointer select-none group"
      >
        <div className="flex items-center gap-3">
          <div className="p-1 rounded-md hover:bg-black/5 dark:hover:bg-white/10 transition-colors">
            {isExpanded ? (
              <ChevronDown size={18} className="text-muted-foreground/70" />
            ) : (
              <ChevronRight size={18} className="text-muted-foreground/70" />
            )}
          </div>
          <div className="opacity-70 group-hover:opacity-100 transition-opacity">
            {icon}
          </div>
          <span className="font-semibold text-sm tracking-tight text-foreground/90">
            {title}
          </span>
          <span className="text-[11px] text-muted-foreground/70 bg-background/50 border border-border/10 px-2 py-0.5 rounded-full font-mono">
            {count}
          </span>
          {badge && (
            <span
              className={cn(
                "text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full font-bold shadow-sm",
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
      {isExpanded && <div className="px-3.5 pb-3.5 space-y-1">{children}</div>}
    </div>
  );
}
