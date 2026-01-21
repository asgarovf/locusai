"use client";

import { type LucideIcon } from "lucide-react";
import { Badge } from "@/components/ui";

export interface StatCardProps {
  title: string;
  value: number | string;
  icon: LucideIcon;
  trend: string;
  color: "primary" | "warning" | "success" | "purple";
}

const colors = {
  primary: "text-primary bg-primary/10",
  warning: "text-amber-500 bg-amber-500/10",
  success: "text-emerald-500 bg-emerald-500/10",
  purple: "text-purple-500 bg-purple-500/10",
};

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
