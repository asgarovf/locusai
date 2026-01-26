"use client";

import { useQueryClient } from "@tanstack/react-query";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { Sidebar, WorkspaceProtected } from "@/components";
import { TaskPanel } from "@/components/TaskPanel";
import { LoadingPage, LoadingSkeleton } from "@/components/ui";
import { useDashboardLayout } from "@/hooks/useDashboardLayout";
import { useWorkspaceIdOptional } from "@/hooks/useWorkspaceId";
import { queryKeys } from "@/lib/query-keys";
import { cn } from "@/lib/utils";

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

  const isChatPage = pathname?.startsWith("/chat");

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {isAuthenticated && <Sidebar />}
      <main
        className={cn(
          "flex-1 overflow-auto bg-background",
          isChatPage ? "p-1" : "p-6"
        )}
      >
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
