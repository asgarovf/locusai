"use client";

import { BarChart3 } from "lucide-react";
import { Button } from "@/components/ui";

export function AIInsights() {
  return (
    <div className="bg-linear-to-br from-primary/10 to-purple-500/5 border border-primary/20 rounded-2xl p-6 shadow-sm">
      <h3 className="font-semibold text-lg mb-2 flex items-center gap-2">
        <BarChart3 size={20} className="text-primary" />
        AI Insights
      </h3>
      <p className="text-sm text-muted-foreground mb-4">
        Your team is 15% more productive this week. Consider moving "Database
        Migration" to the next sprint.
      </p>
      <Button size="sm" className="w-full">
        Ask Locus AI
      </Button>
    </div>
  );
}
