"use client";

import { type User } from "@locusai/shared";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { isCloudMode } from "@/utils/env.utils";

/**
 * Hook for pages that require an authenticated user.
 * Returns a guaranteed non-null User object.
 * Redirects to login if user is not authenticated.
 *
 * Usage: Only use this in pages/components that are already protected
 * by authentication middleware (wrapped with auth guards).
 *
 * @returns {User} The authenticated user (guaranteed non-null)
 * @throws Redirects to login if not authenticated
 */
export function useAuthenticatedUser(): User {
  const { user, isLoading, isAuthenticated } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // Redirect to login if not authenticated (only in cloud mode)
    if (!isLoading && !isAuthenticated && isCloudMode()) {
      router.push("/login");
    }
  }, [isLoading, isAuthenticated, router]);

  // Type assertion is safe here because:
  // 1. This hook is only used in authenticated contexts
  // 2. If user is null, we redirect to login above
  // 3. The caller is responsible for ensuring this component is protected
  return user as User;
}
