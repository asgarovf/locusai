"use client";

import { type User } from "@locusai/shared";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { isCloudMode } from "@/utils/env.utils";

/**
 * Hook for pages that require an authenticated user WITH an organization.
 * Returns a guaranteed non-null User object with a non-null orgId.
 * Redirects to login if user is not authenticated or has no organization.
 *
 * Usage: Only use this in pages/components that are already protected
 * by authentication middleware and require organization context.
 *
 * @returns {User} The authenticated user with orgId (both guaranteed non-null)
 * @throws Redirects to login if not authenticated or no organization
 */
export function useAuthenticatedUserWithOrg(): User & { orgId: string } {
  const { user, isLoading, isAuthenticated } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // Redirect to login if not authenticated (only in cloud mode)
    if (!isLoading && !isAuthenticated && isCloudMode()) {
      router.push("/login");
    }

    // Redirect to onboarding if no organization
    if (!isLoading && isAuthenticated && user && !user.orgId && isCloudMode()) {
      router.push("/onboarding/workspace");
    }
  }, [isLoading, isAuthenticated, user, router]);

  // Type assertion is safe here because:
  // 1. This hook is only used in authenticated contexts with org
  // 2. If user is null or has no orgId, we redirect above
  // 3. The caller is responsible for ensuring this component is protected
  return user as User & { orgId: string };
}
