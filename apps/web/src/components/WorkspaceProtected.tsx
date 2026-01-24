/**
 * Workspace Protected Component
 *
 * Wrapper that ensures all children have valid workspaceId.
 * Redirects to workspace creation if user has no workspace.
 * Handles authentication, organization, and workspace validation.
 *
 * Features:
 * - Automatic workspace validation
 * - Redirect to onboarding if no organization
 * - Redirect to workspace creation if needed
 * - Retry logic for race conditions
 * - Loading state handling
 *
 * @example
 * <WorkspaceProtected>
 *   <Dashboard />
 * </WorkspaceProtected>
 */

"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";
import { LoadingPage } from "@/components/ui";
import { useAuth } from "@/context/AuthContext";

interface WorkspaceProtectedProps {
  /** Components to render when workspace is valid */
  children: React.ReactNode;
}

/**
 * Workspace Protected Wrapper
 *
 * Ensures that all children have a valid workspaceId.
 * Redirects to workspace creation if user has no workspace.
 *
 * Usage: Wrap components that require workspaceId
 * - All children can safely use useWorkspaceId() without fallbacks
 * - Early exits handle missing workspace automatically
 *
 * @component
 */
export function WorkspaceProtected({ children }: WorkspaceProtectedProps) {
  const { user, isLoading, refreshUser } = useAuth();
  const router = useRouter();
  const refreshAttemptRef = useRef(0);
  const MAX_REFRESH_ATTEMPTS = 5;

  useEffect(() => {
    if (isLoading) return;

    // If user has NO organization, redirect to onboarding
    if (user && !user.orgId) {
      router.push("/onboarding/workspace");
      return;
    }

    // If user has NO workspace, try refreshing first (might have just been created)
    if (user && !user.workspaceId) {
      if (refreshAttemptRef.current < MAX_REFRESH_ATTEMPTS) {
        refreshAttemptRef.current++;
        // Wait a moment then refresh user data
        const timer = setTimeout(() => {
          refreshUser();
        }, 500);
        return () => clearTimeout(timer);
      }
      // After max attempts, redirect to onboarding
      router.push("/onboarding/workspace");
    }
  }, [user, isLoading, router, refreshUser]);

  if (isLoading) {
    return null;
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
