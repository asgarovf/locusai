"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Button, Input, Modal, Spinner } from "@/components/ui";
import { useAuth } from "@/context";
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
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const orgId = user?.orgId;

  const createWorkspace = useMutation({
    mutationFn: (data: { name: string }) =>
      locusClient.workspaces.create({ orgId: orgId || "", name: data.name }),
    onSuccess: () => {
      toast.success("Workspace created successfully");
      queryClient.invalidateQueries({ queryKey: queryKeys.workspaces.all() });
      onSuccess();
      onClose();
      setName("");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to create workspace");
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
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Create New Workspace"
      size="sm"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <label className="text-sm font-medium">Workspace Name</label>
          <Input
            placeholder="Engineering, Marketing, etc."
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            autoFocus
          />
        </div>
        <div className="flex justify-end gap-3 mt-6">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={createWorkspace.isPending}>
            {createWorkspace.isPending ? (
              <Spinner size="sm" />
            ) : (
              "Create Workspace"
            )}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
