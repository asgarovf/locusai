"use client";

import { useAuth } from "@/context";

/**
 * Hook to get the current workspace ID
 * Ensures consistent handling of workspace context across the app
 */
export function useWorkspaceId(): string {
  const { user } = useAuth();
  const workspaceId = user?.workspaceId;

  if (!workspaceId) {
    throw new Error(
      "No workspace ID available. User must be authenticated with a workspace."
    );
  }

  return workspaceId;
}

/**
 * Hook to safely get workspace ID or null
 * Useful for conditional queries that shouldn't execute without a workspace
 */
export function useWorkspaceIdOptional(): string | null {
  const { user } = useAuth();
  return user?.workspaceId ?? null;
}
