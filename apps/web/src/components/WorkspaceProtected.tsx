"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { LoadingPage } from "@/components/ui";
import { useAuth } from "@/context/AuthContext";

interface WorkspaceProtectedProps {
  children: React.ReactNode;
}

/**
 * Workspace Protected Wrapper
 * Ensures that all children have a valid workspaceId
 * Redirects to workspace creation if user has no workspace
 *
 * Usage: Wrap components that require workspaceId
 * - All children can safely use useWorkspaceId() without fallbacks
 * - Early exits handle missing workspace automatically
 */
export function WorkspaceProtected({ children }: WorkspaceProtectedProps) {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // If user is loaded and has NO workspace, redirect to create one
    if (!isLoading && user && !user.workspaceId) {
      router.push("/onboarding/workspace");
    }
  }, [user, isLoading, router]);

  // Show loading while fetching auth state
  if (isLoading) {
    return <LoadingPage />;
  }

  // If user is not authenticated, let parent layout handle redirect
  if (!user) {
    return null;
  }

  // If user has no workspace, we're redirecting (show loading state)
  if (!user.workspaceId) {
    return <LoadingPage />;
  }

  // User is authenticated and has workspace - safe to render children
  return <>{children}</>;
}
