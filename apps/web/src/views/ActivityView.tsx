"use client";

import { type Event as WorkspaceEvent } from "@locusai/shared";
import { Activity, ChevronLeft, ChevronRight } from "lucide-react";
import { useEffect, useState } from "react";
import { ActivityItem } from "@/components/dashboard/ActivityItem";
import { PageLayout } from "@/components/PageLayout";
import { Button, LoadingPage } from "@/components/ui";
import { useAuthenticatedUser } from "@/hooks";
import { locusClient } from "@/lib/api-client";

const ITEMS_PER_PAGE = 20;

export function ActivityView() {
  const user = useAuthenticatedUser();
  const [activity, setActivity] = useState<WorkspaceEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);

  useEffect(() => {
    async function loadActivity() {
      if (!user?.workspaceId) return;

      setLoading(true);
      try {
        // Assuming the API supports skip/limit or we filter client-side for now
        // if the backend doesn't support pagination yet.
        // For now, we'll fetch all and paginate client-side to satisfy the UI requirement.
        const data = await locusClient.workspaces.getActivity(user.workspaceId);

        const start = (page - 1) * ITEMS_PER_PAGE;
        const paginatedData = data.slice(start, start + ITEMS_PER_PAGE);

        setActivity(paginatedData);
        setHasMore(data.length > start + ITEMS_PER_PAGE);
      } catch (error) {
        console.error("Failed to load activity:", error);
      } finally {
        setLoading(false);
      }
    }
    loadActivity();
  }, [user?.workspaceId, page]);

  if (loading && page === 1) {
    return <LoadingPage />;
  }

  return (
    <PageLayout
      title="Activity Log"
      description="A complete history of everything happening in your workspace."
    >
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="bg-card border border-border/50 rounded-2xl overflow-hidden shadow-sm">
          <div className="p-6 border-b border-border/50 flex items-center justify-between">
            <h3 className="font-semibold text-lg flex items-center gap-2">
              <Activity size={20} className="text-primary" />
              All Events
            </h3>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page === 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                <ChevronLeft size={16} />
              </Button>
              <span className="text-sm font-medium px-2">Page {page}</span>
              <Button
                variant="outline"
                size="sm"
                disabled={!hasMore}
                onClick={() => setPage((p) => p + 1)}
              >
                <ChevronRight size={16} />
              </Button>
            </div>
          </div>

          <div className="divide-y divide-border/30">
            {activity.length > 0 ? (
              activity.map((event) => (
                <div key={event.id} className="p-1">
                  <ActivityItem event={event} />
                </div>
              ))
            ) : (
              <div className="py-20 text-center text-muted-foreground italic">
                No activity found.
              </div>
            )}
          </div>

          {(page > 1 || hasMore) && (
            <div className="p-4 border-t border-border/50 flex items-center justify-center gap-4">
              <Button
                variant="ghost"
                size="sm"
                disabled={page === 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="gap-2"
              >
                <ChevronLeft size={16} /> Previous
              </Button>
              <Button
                variant="ghost"
                size="sm"
                disabled={!hasMore}
                onClick={() => setPage((p) => p + 1)}
                className="gap-2"
              >
                Next <ChevronRight size={16} />
              </Button>
            </div>
          )}
        </div>
      </div>
    </PageLayout>
  );
}
