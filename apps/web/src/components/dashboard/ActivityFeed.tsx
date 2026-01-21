"use client";

import { type Event as WorkspaceEvent } from "@locusai/shared";
import { Activity } from "lucide-react";
import { Button } from "@/components/ui";
import { ActivityItem } from "./ActivityItem";

interface ActivityFeedProps {
  activity: WorkspaceEvent[];
}

export function ActivityFeed({ activity }: ActivityFeedProps) {
  return (
    <div className="bg-card border border-border/50 rounded-2xl p-6 shadow-sm h-full">
      <div className="flex items-center justify-between mb-6">
        <h3 className="font-semibold text-lg flex items-center gap-2">
          <Activity size={20} className="text-primary" />
          Recent Activity
        </h3>
        <Button variant="ghost" size="sm" className="text-xs">
          View All
        </Button>
      </div>
      <div className="space-y-4">
        {activity.length > 0 ? (
          activity.map((event) => <ActivityItem key={event.id} event={event} />)
        ) : (
          <div className="py-8 text-center text-muted-foreground italic text-sm">
            No recent activity in this workspace.
          </div>
        )}
      </div>
    </div>
  );
}
