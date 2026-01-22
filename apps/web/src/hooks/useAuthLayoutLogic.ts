/**
 * Hook for auth layout routing and protection logic
 *
 * Handles redirecting authenticated users away from auth pages
 * (except onboarding pages which may be needed during account setup)
 */
"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { isCloudMode } from "@/utils/env.utils";

const AUTH_SKIP_ROUTES = ["/onboarding"];

/**
 * Determines if a pathname should skip auth redirect
 * @param pathname - Current pathname
 * @returns true if auth redirect should be skipped
 */
function shouldSkipAuthRedirect(pathname: string): boolean {
  return AUTH_SKIP_ROUTES.some((route) => pathname.startsWith(route));
}

export function useAuthLayoutLogic() {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    // Skip redirect if still loading or not in cloud mode
    if (isLoading || !isCloudMode()) {
      return;
    }

    // Redirect authenticated users away from auth pages
    if (isAuthenticated && !shouldSkipAuthRedirect(pathname)) {
      router.push("/");
    }
  }, [isLoading, isAuthenticated, router, pathname]);

  return { isLoading };
}
