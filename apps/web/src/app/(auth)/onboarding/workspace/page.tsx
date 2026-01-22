"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Button, Input } from "@/components/ui";
import { useAuth } from "@/context/AuthContext";
import { useAuthenticatedUser } from "@/hooks";
import { locusClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";

export default function OnboardingWorkspacePage() {
  const [name, setName] = useState("");
  const router = useRouter();
  const queryClient = useQueryClient();
  const user = useAuthenticatedUser();
  const { refreshUser } = useAuth();

  const createWorkspaceMutation = useMutation({
    mutationFn: (name: string) => {
      // If user has orgId, use the standard create method
      if (user?.orgId) {
        return locusClient.workspaces.create({ name, orgId: user.orgId });
      }
      // Otherwise, use createWithAutoOrg which creates organization if needed
      return locusClient.workspaces.createWithAutoOrg({ name });
    },
    onSuccess: async () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.workspaces.all() });
      // Refresh user data to get the new workspaceId
      await refreshUser();
      toast.success("Workspace created!");
      router.push("/");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to create workspace");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    createWorkspaceMutation.mutate(name.trim());
  };

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h1 className="text-2xl font-bold tracking-tight">
          Create your workspace
        </h1>
        <p className="text-sm text-muted-foreground">
          You need at least one workspace to get started.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Workspace Name
          </label>
          <Input
            placeholder="e.g. Acme Corp, My Projects"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            autoFocus
          />
        </div>

        <Button
          type="submit"
          className="w-full"
          disabled={!name.trim() || createWorkspaceMutation.isPending}
        >
          {createWorkspaceMutation.isPending ? "Creating..." : "Get Started"}
        </Button>
      </form>
    </div>
  );
}
