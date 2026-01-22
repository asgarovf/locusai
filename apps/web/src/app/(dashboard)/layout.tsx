"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Sidebar, WorkspaceProtected } from "@/components";
import { useAuth } from "@/context/AuthContext";
import { isCloudMode } from "@/utils/env.utils";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !isAuthenticated && isCloudMode()) {
      router.push("/login");
    }
  }, [isLoading, isAuthenticated, router]);

  if (!isAuthenticated && isCloudMode() && !isLoading) {
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
