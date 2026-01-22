/**
 * Stat Card Component
 *
 * Displays a statistic with icon, value, title, and trend.
 * Used on dashboard to show key metrics.
 *
 * @example
 * <StatCard
 *   title="Active Tasks"
 *   value={24}
 *   icon={CheckCircle}
 *   trend="+5% this week"
 *   color="success"
 * />
 */

"use client";

import { type LucideIcon } from "lucide-react";
import { Badge } from "@/components/ui";

export interface StatCardProps {
  /** Display title */
  title: string;
  /** Statistic value */
  value: number | string;
  /** Icon component to display */
  icon: LucideIcon;
  /** Trend or additional info text */
  trend: string;
  /** Color theme */
  color: "primary" | "warning" | "success" | "purple";
}

const colors = {
  primary: "text-primary bg-primary/10",
  warning: "text-amber-500 bg-amber-500/10",
  success: "text-emerald-500 bg-emerald-500/10",
  purple: "text-purple-500 bg-purple-500/10",
};

/**
 * Stat Card Component
 *
 * Features:
 * - Icon display with color theming
 * - Value and title display
 * - Trend badge
 * - Hover effect for interactivity
 *
 * @component
 */
export function StatCard({
  title,
  value,
  icon: Icon,
  trend,
  color,
}: StatCardProps) {
  return (
    <div className="bg-card border border-border/50 rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between mb-4">
        <div className={`p-2 rounded-xl ${colors[color]}`}>
          <Icon size={20} />
        </div>
        <Badge
          variant="outline"
          className="text-[10px] font-medium border-border/50"
        >
          {trend}
        </Badge>
      </div>
      <div>
        <div className="text-3xl font-bold text-foreground">{value}</div>
        <div className="text-sm text-muted-foreground mt-1">{title}</div>
      </div>
    </div>
  );
}
