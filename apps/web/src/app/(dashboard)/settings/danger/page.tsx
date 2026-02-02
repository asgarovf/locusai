"use client";

import { useQueryClient } from "@tanstack/react-query";
import { Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { PageLayout } from "@/components/PageLayout";
import { Button, Input, Modal, Spinner, showToast } from "@/components/ui";
import { useAuth } from "@/context";
import { useWorkspaceIdOptional, useWorkspaceQuery } from "@/hooks";
import { locusClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";

export default function DangerParamsPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { logout, workspaces, refreshUser, switchWorkspace } = useAuth();
  const workspaceId = useWorkspaceIdOptional();
  const { data: workspace, isLoading: isWorkspaceLoading } =
    useWorkspaceQuery();
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);

  const workspaceName = workspace?.name || "workspace";

  const handleDeleteWorkspace = async () => {
    if (!workspaceId) return;

    const expectedConfirmation = `delete ${workspaceName}`.toLowerCase();
    if (deleteConfirmation.toLowerCase() !== expectedConfirmation) {
      showToast.error(`Please type "delete ${workspaceName}" to confirm`);
      return;
    }

    setIsDeleting(true);
    try {
      await locusClient.workspaces.delete(workspaceId);
      showToast.success("Workspace deleted");

      // Close modal immediately after successful deletion
      setIsDeleteModalOpen(false);

      // Invalidate the workspaces query so sidebar updates
      queryClient.invalidateQueries({ queryKey: queryKeys.workspaces.all() });

      // Refresh to get updated workspace list
      await refreshUser();

      // Find remaining workspaces (excluding the deleted one)
      const remainingWorkspaces = workspaces.filter(
        (w) => String(w.id) !== workspaceId
      );

      if (remainingWorkspaces.length > 0) {
        // Switch to the first available workspace
        switchWorkspace(String(remainingWorkspaces[0].id));
        // Navigate to dashboard
        router.push("/");
      } else {
        // No workspaces left, logout the user
        logout();
      }
    } catch (error) {
      showToast.error(
        error instanceof Error ? error.message : "Failed to delete workspace"
      );
    } finally {
      setIsDeleting(false);
    }
  };

  if (isWorkspaceLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Spinner />
      </div>
    );
  }

  return (
    <PageLayout
      title="Danger Zone"
      description="Destructive actions for your workspace"
    >
      <div className="max-w-2xl">
        <div className="bg-destructive/5 border border-destructive/20 rounded-2xl p-6">
          <div className="flex items-start justify-between">
            <div>
              <h4 className="font-medium text-foreground">Delete Workspace</h4>
              <p className="text-sm text-muted-foreground mt-1 max-w-sm">
                Permanently delete this workspace and all its data. This action
                cannot be undone.
              </p>
            </div>
            <Button
              variant="danger"
              size="sm"
              onClick={() => setIsDeleteModalOpen(true)}
            >
              <Trash2 size={18} />
              Delete
            </Button>
          </div>
        </div>
      </div>

      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
      >
        <div className="space-y-4">
          <div>
            <h2 className="text-xl font-bold text-foreground">
              Delete Workspace
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              This action cannot be undone. All workspace data will be
              permanently deleted.
            </p>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">
              Type "delete {workspaceName}" to confirm
            </label>
            <Input
              placeholder={`delete ${workspaceName}`}
              value={deleteConfirmation}
              onChange={(e) => setDeleteConfirmation(e.target.value)}
              disabled={isDeleting}
            />
          </div>

          <div className="flex gap-3 justify-end pt-4">
            <Button
              variant="secondary"
              onClick={() => setIsDeleteModalOpen(false)}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={handleDeleteWorkspace}
              disabled={
                isDeleting ||
                deleteConfirmation.toLowerCase() !==
                  `delete ${workspaceName}`.toLowerCase()
              }
              isLoading={isDeleting}
            >
              Delete Workspace
            </Button>
          </div>
        </div>
      </Modal>
    </PageLayout>
  );
}
