"use client";

import { Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { PageLayout } from "@/components/PageLayout";
import { Button, Input, Modal, Spinner } from "@/components/ui";
import { useAuth } from "@/context";
import { useAuthenticatedUser, useOrganizationQuery } from "@/hooks";
import { locusClient } from "@/lib/api-client";

export default function DangerParamsPage() {
  const user = useAuthenticatedUser();
  const { logout } = useAuth();
  const router = useRouter();
  const { data: organization, isLoading: isOrgLoading } =
    useOrganizationQuery();
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);

  const orgName = organization?.name || "organization";

  const handleDeleteOrganization = async () => {
    if (!user?.orgId) return;

    const expectedConfirmation = `delete ${orgName}`.toLowerCase();
    if (deleteConfirmation.toLowerCase() !== expectedConfirmation) {
      toast.error(`Please type "delete ${orgName}" to confirm`);
      return;
    }

    setIsDeleting(true);
    try {
      await locusClient.organizations.delete(user.orgId);
      toast.success("Organization deleted");

      // Logout the user
      logout();

      // Redirect to login
      router.push("/login");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to delete organization"
      );
    } finally {
      setIsDeleting(false);
    }
  };

  if (isOrgLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Spinner />
      </div>
    );
  }

  return (
    <PageLayout
      title="Danger Zone"
      description="Destructive actions for your organization"
    >
      <div className="max-w-2xl">
        <div className="bg-destructive/5 border border-destructive/20 rounded-2xl p-6">
          <div className="flex items-start justify-between">
            <div>
              <h4 className="font-medium text-foreground">
                Delete Organization
              </h4>
              <p className="text-sm text-muted-foreground mt-1 max-w-sm">
                Permanently delete this organization and all its data. This
                action cannot be undone.
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
              Delete Organization
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              This action cannot be undone. All organization data will be
              permanently deleted.
            </p>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">
              Type "delete {orgName}" to confirm
            </label>
            <Input
              placeholder={`delete ${orgName}`}
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
              onClick={handleDeleteOrganization}
              disabled={
                isDeleting ||
                deleteConfirmation.toLowerCase() !==
                  `delete ${orgName}`.toLowerCase()
              }
              isLoading={isDeleting}
            >
              Delete Organization
            </Button>
          </div>
        </div>
      </Modal>
    </PageLayout>
  );
}
