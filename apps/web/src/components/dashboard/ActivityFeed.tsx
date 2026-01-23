/**
 * Activity Feed Component
 *
 * Displays recent workspace activity and events.
 * Shows recent actions performed by team members.
 *
 * @example
 * <ActivityFeed activity={workspaceEvents} />
 */

"use client";

import { type Event as WorkspaceEvent } from "@locusai/shared";
import { Activity } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui";
import { ActivityItem } from "./ActivityItem";

interface ActivityFeedProps {
  /** Array of workspace events to display */
  activity: WorkspaceEvent[];
}

/**
 * Activity Feed Component
 *
 * Features:
 * - Displays recent workspace events
 * - Shows activity items with timestamps
 * - Empty state when no activity
 * - View all button for navigation
 *
 * @component
 */
export function ActivityFeed({ activity }: ActivityFeedProps) {
  const router = useRouter();

  return (
    <div className="bg-card border border-border/50 rounded-2xl p-6 shadow-sm h-full">
      <div className="flex items-center justify-between mb-6">
        <h3 className="font-semibold text-lg flex items-center gap-2">
          <Activity size={20} className="text-primary" />
          Recent Activity
        </h3>
        <Button
          variant="ghost"
          size="sm"
          className="text-xs"
          onClick={() => router.push("/activity")}
        >
          View All
        </Button>
      </div>
      <div className="space-y-4">
        {activity.length > 0 ? (
          activity
            .slice(0, 10)
            .map((event) => <ActivityItem key={event.id} event={event} />)
        ) : (
          <div className="py-12 flex flex-col items-center justify-center text-center space-y-3">
            <div className="p-3 bg-secondary/30 rounded-full">
              <Activity size={24} className="text-muted-foreground/50" />
            </div>
            <div className="max-w-[200px]">
              <p className="text-sm font-medium text-foreground">
                No activity yet
              </p>
              <p className="text-xs text-muted-foreground">
                When you or your team take actions, they will appear here.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
