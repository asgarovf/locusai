/**
 * Hook for workspace creation form management
 * Handles workspace creation with optional auto-organization creation
 */
"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { showToast } from "@/components/ui";
import { useAuth } from "@/context/AuthContext";
import { locusClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import { useAuthenticatedUser } from "./useAuthenticatedUser";

interface UseWorkspaceCreateFormReturn {
  name: string;
  isLoading: boolean;
  setName: (name: string) => void;
  handleSubmit: (e: React.FormEvent) => void;
}

/**
 * Custom hook for workspace creation
 * Handles both standard and auto-org workspace creation
 */
export function useWorkspaceCreateForm(): UseWorkspaceCreateFormReturn {
  const [name, setName] = useState("");
  const router = useRouter();
  const queryClient = useQueryClient();
  const user = useAuthenticatedUser();
  const { refreshUser } = useAuth();

  const createWorkspaceMutation = useMutation({
    mutationFn: (workspaceName: string) => {
      // If user has orgId, use the standard create method
      if (user?.orgId) {
        return locusClient.workspaces.create({
          name: workspaceName,
          orgId: user.orgId,
        });
      }
      // Otherwise, use createWithAutoOrg which creates organization if needed
      return locusClient.workspaces.createWithAutoOrg({ name: workspaceName });
    },
    onSuccess: async () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.workspaces.all() });
      // Refresh user data to get the new workspaceId
      await refreshUser();
      showToast.success("Workspace created!");
      // Redirect to chat with interview query param to trigger onboarding
      router.push("/chat?interview=true");
    },
    onError: (error: Error) => {
      showToast.error(error.message || "Failed to create workspace");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    createWorkspaceMutation.mutate(name.trim());
  };

  return {
    name,
    isLoading: createWorkspaceMutation.isPending,
    setName,
    handleSubmit,
  };
}
