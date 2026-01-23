"use client";

import { ChevronRight, Trash2, Users } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { PageLayout } from "@/components/PageLayout";
import { ApiKeysSettings } from "@/components/settings/ApiKeysSettings";
import { SettingItem } from "@/components/settings/SettingItem";
import { SettingSection } from "@/components/settings/SettingSection";
import { Button, Input, Modal } from "@/components/ui";
import { useAuth } from "@/context";
import { useAuthenticatedUser, useOrganizationQuery } from "@/hooks";
import { locusClient } from "@/lib/api-client";

export default function SettingsPage() {
  const user = useAuthenticatedUser();
  const { logout } = useAuth();
  const router = useRouter();
  const { data: organization } = useOrganizationQuery();
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

  return (
    <PageLayout
      title="Settings"
      description="Manage your workspace preferences and configuration."
    >
      <div className="max-w-5xl space-y-8">
        {/* Organization Section */}
        <SettingSection title="Organization">
          <Link href="/settings/team">
            <SettingItem
              icon={<Users size={18} />}
              title="Team"
              description="Invite and manage organization members"
            >
              <div className="text-muted-foreground">
                <ChevronRight size={20} />
              </div>
            </SettingItem>
          </Link>
        </SettingSection>

        {/* API Keys Section */}
        <ApiKeysSettings />

        {/* Danger Zone */}
        <div>
          <h3 className="text-xs font-bold uppercase tracking-widest text-destructive mb-4 px-4">
            Danger Zone
          </h3>
          <div className="bg-destructive/5 border border-destructive/20 rounded-2xl p-6">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-medium text-foreground">
                  Delete Organization
                </h4>
                <p className="text-sm text-muted-foreground mt-0.5">
                  Permanently delete this organization and all its data
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
      </div>

      {/* Delete Organization Modal */}
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
