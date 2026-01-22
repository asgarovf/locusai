"use client";

import { useState } from "react";
import { toast } from "sonner";
import { CreateModal } from "@/components/CreateModal";
import { Input } from "@/components/ui";
import { useAuthenticatedUser } from "@/hooks";
import { useMutationWithToast } from "@/hooks/useMutationWithToast";
import { locusClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";

interface WorkspaceCreateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function WorkspaceCreateModal({
  isOpen,
  onClose,
  onSuccess,
}: WorkspaceCreateModalProps) {
  const [name, setName] = useState("");
  const user = useAuthenticatedUser();
  const orgId = user.orgId;

  const createWorkspace = useMutationWithToast({
    mutationFn: (data: { name: string }) => {
      if (!orgId) {
        throw new Error("Organization ID is required");
      }
      return locusClient.workspaces.create({ orgId, name: data.name });
    },
    successMessage: "Workspace created successfully",
    invalidateKeys: [queryKeys.workspaces.all()],
    onSuccess: () => {
      setName("");
      onSuccess();
      onClose();
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!orgId) {
      toast.error("You must be in an organization to create a workspace");
      return;
    }
    createWorkspace.mutate({ name });
  };

  return (
    <CreateModal
      isOpen={isOpen}
      title="Create New Workspace"
      size="sm"
      fields={[
        {
          name: "name",
          label: "Workspace Name",
          component: (
            <Input
              placeholder="Engineering, Marketing, etc."
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
            />
          ),
          required: true,
        },
      ]}
      onSubmit={handleSubmit}
      onClose={onClose}
      submitText="Create Workspace"
      isPending={createWorkspace.isPending}
      submitDisabled={!name.trim()}
    />
  );
}
