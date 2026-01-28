"use client";

import { Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { PageLayout } from "@/components/PageLayout";
import { Button, Input, Modal, Spinner } from "@/components/ui";
import { useAuth } from "@/context";
import { useWorkspaceIdOptional, useWorkspaceQuery } from "@/hooks";
import { locusClient } from "@/lib/api-client";

export default function DangerParamsPage() {
  const { logout } = useAuth();
  const router = useRouter();
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
      toast.error(`Please type "delete ${workspaceName}" to confirm`);
      return;
    }

    setIsDeleting(true);
    try {
      await locusClient.workspaces.delete(workspaceId);
      toast.success("Workspace deleted");

      // Logout the user (or redirect to another workspace if available in a real app)
      logout();

      // Redirect to login
      router.push("/login");
    } catch (error) {
      toast.error(
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
