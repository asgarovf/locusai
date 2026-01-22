"use client";

import { Sidebar, WorkspaceProtected } from "@/components";
import { LoadingSkeleton } from "@/components/ui";
import { useDashboardLayout } from "@/hooks/useDashboardLayout";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isLoading, isAuthenticated, shouldShowUI } = useDashboardLayout();

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
      {isAuthenticated && <Sidebar />}
      <main className="flex-1 overflow-auto bg-background p-6">
        <WorkspaceProtected>{children}</WorkspaceProtected>
      </main>
    </div>
  );
}
