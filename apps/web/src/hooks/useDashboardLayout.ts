/**
 * Hook for dashboard layout routing and protection logic
 *
 * Handles redirecting unauthenticated users away from dashboard
 * and managing the authenticated dashboard UI state
 */
"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { isCloudMode } from "@/utils/env.utils";

interface UseDashboardLayoutReturn {
  isLoading: boolean;
  isAuthenticated: boolean;
  shouldShowUI: boolean;
}

/**
 * Manages dashboard layout routing and protection
 * Returns flags to determine what to render
 *
 * @returns Dashboard layout state flags
 */
export function useDashboardLayout(): UseDashboardLayoutReturn {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // Skip redirect if still loading or not in cloud mode
    if (isLoading || !isCloudMode()) {
      return;
    }

    // Redirect unauthenticated users to login
    if (!isAuthenticated) {
      router.push("/login");
    }
  }, [isLoading, isAuthenticated, router]);

  return {
    isLoading,
    isAuthenticated,
    // Show UI only if authenticated or still loading
    // Hide UI if unauthenticated (to avoid flash before redirect)
    shouldShowUI: isAuthenticated || isLoading,
  };
}
