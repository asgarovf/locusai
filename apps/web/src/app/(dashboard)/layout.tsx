"use client";

import { useQueryClient } from "@tanstack/react-query";
import { Menu } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import {
  BottomNav,
  Sidebar,
  TaskPanel,
  WorkspaceProtected,
} from "@/components";
import { Drawer, LoadingPage, LoadingSkeleton } from "@/components/ui";
import { useDashboardLayout, useWorkspaceIdOptional } from "@/hooks";
import { queryKeys } from "@/lib/query-keys";

type DashboardLayoutProps = {
  children: React.ReactNode;
};

function DashboardLayoutContent({ children }: DashboardLayoutProps) {
  const { isLoading, isAuthenticated, shouldShowUI } = useDashboardLayout();
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const queryClient = useQueryClient();
  const workspaceId = useWorkspaceIdOptional();
  const [drawerOpen, setDrawerOpen] = useState(false);

  const taskId = searchParams.get("taskId");

  const closeTaskPanel = () => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("taskId");
    router.push(`${pathname}?${params.toString()}`, { scroll: false });
  };

  const handleTaskUpdate = () => {
    if (workspaceId) {
      queryClient.invalidateQueries({
        queryKey: queryKeys.tasks.list(workspaceId),
      });
    }
  };

  const handleTaskDelete = () => {
    if (workspaceId) {
      queryClient.invalidateQueries({
        queryKey: queryKeys.tasks.list(workspaceId),
      });
    }
    closeTaskPanel();
  };

  // Show loading skeleton while authenticating
  if (isLoading) {
    return <LoadingSkeleton />;
  }

  // Don't render anything if not authenticated (redirect happens in hook)
  if (!shouldShowUI) {
    return null;
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Mobile Menu Button */}
      {isAuthenticated && (
        <button
          onClick={() => setDrawerOpen(true)}
          className="fixed top-4 left-4 z-30 lg:hidden bg-card border border-border rounded-lg p-2 text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-colors shadow-md"
          aria-label="Open navigation menu"
        >
          <Menu size={20} />
        </button>
      )}

      {/* Sidebar with Drawer wrapper */}
      {isAuthenticated && (
        <Drawer open={drawerOpen} onClose={() => setDrawerOpen(false)}>
          <Sidebar onNavigate={() => setDrawerOpen(false)} />
        </Drawer>
      )}

      <main className="flex-1 overflow-hidden bg-background p-6">
        <WorkspaceProtected>{children}</WorkspaceProtected>
      </main>

      {taskId && (
        <TaskPanel
          taskId={taskId}
          onClose={closeTaskPanel}
          onUpdated={handleTaskUpdate}
          onDeleted={handleTaskDelete}
        />
      )}

      {/* Bottom Navigation - Mobile Only */}
      {isAuthenticated && <BottomNav />}
    </div>
  );
}

export default function DashboardLayoutPage({
  children,
}: DashboardLayoutProps) {
  return (
    <Suspense fallback={<LoadingPage />}>
      <DashboardLayoutContent>{children}</DashboardLayoutContent>
    </Suspense>
  );
}
