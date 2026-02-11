"use client";

import { ImageIcon, Mail, Trash2, User as UserIcon } from "lucide-react";
import { Suspense, useState } from "react";
import { PageLayout } from "@/components/PageLayout";
import { SettingItem } from "@/components/settings/SettingItem";
import { SettingSection } from "@/components/settings/SettingSection";
import {
  Avatar,
  Button,
  Input,
  Modal,
  Spinner,
  showToast,
} from "@/components/ui";
import { useAuth } from "@/context";
import { useSafeAuth } from "@/context/AuthContext";
import { locusClient } from "@/lib/api-client";

function ProfileContent() {
  const { user } = useSafeAuth();
  const { logout } = useAuth();
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);

  const handleSave = () => {
    showToast.success("Profile updated successfully");
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirmation.toLowerCase() !== "delete my account") {
      showToast.error('Please type "delete my account" to confirm');
      return;
    }

    setIsDeleting(true);
    try {
      await locusClient.auth.deleteAccount();
      showToast.success("Account deleted successfully");
      setIsDeleteModalOpen(false);
      logout();
    } catch (error) {
      showToast.error(
        error instanceof Error ? error.message : "Failed to delete account"
      );
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <PageLayout
      title="Profile"
      description="Manage your personal information and profile settings."
    >
      <div className="max-w-3xl mx-auto space-y-8">
        <SettingSection title="Personal Information">
          {/* Avatar */}
          <div className="flex items-center justify-between p-4 rounded-xl hover:bg-secondary/30 transition-colors">
            <div className="flex gap-4">
              <div className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center text-muted-foreground shrink-0">
                <ImageIcon size={18} />
              </div>
              <div>
                <h4 className="font-medium text-foreground">Avatar</h4>
                <p className="text-sm text-muted-foreground mt-0.5">
                  Your profile picture
                </p>
              </div>
            </div>
            <div className="shrink-0 flex items-center">
              <Avatar
                name={user.name || "User"}
                src={user.avatarUrl}
                size="lg"
                className="h-12 w-12"
              />
            </div>
          </div>

          {/* Name */}
          <SettingItem
            icon={<UserIcon size={18} />}
            title="Display Name"
            description="Your name as it appears to others"
          >
            <div className="w-64">
              <Input defaultValue={user.name || ""} placeholder="Your name" />
            </div>
          </SettingItem>

          {/* Email */}
          <SettingItem
            icon={<Mail size={18} />}
            title="Email Address"
            description="Your email address used for login"
          >
            <div className="w-64">
              <Input
                defaultValue={user.email}
                disabled
                className="opacity-70 bg-secondary/50"
              />
            </div>
          </SettingItem>
        </SettingSection>

        <div className="flex justify-end pt-4">
          <Button onClick={handleSave}>Save Changes</Button>
        </div>

        {/* Danger Zone */}
        <SettingSection title="Danger Zone" titleClassName="text-destructive">
          <div className="p-4">
            <div className="flex items-start justify-between">
              <div>
                <h4 className="font-medium text-foreground">Delete Account</h4>
                <p className="text-sm text-muted-foreground mt-1 max-w-sm">
                  Permanently delete your account and all associated data. This
                  action cannot be undone.
                </p>
              </div>
              <Button
                variant="danger"
                size="sm"
                onClick={() => setIsDeleteModalOpen(true)}
              >
                <Trash2 size={18} />
                Delete Account
              </Button>
            </div>
          </div>
        </SettingSection>
      </div>

      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
      >
        <div className="space-y-4">
          <div>
            <h2 className="text-xl font-bold text-foreground">
              Delete Account
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              This will permanently delete your account, all workspaces you own,
              and all associated data. This action cannot be undone.
            </p>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">
              Type &quot;delete my account&quot; to confirm
            </label>
            <Input
              placeholder="delete my account"
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
              onClick={handleDeleteAccount}
              disabled={
                isDeleting ||
                deleteConfirmation.toLowerCase() !== "delete my account"
              }
              isLoading={isDeleting}
            >
              Delete Account
            </Button>
          </div>
        </div>
      </Modal>
    </PageLayout>
  );
}

export default function ProfilePage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center h-full">
          <Spinner size="lg" />
        </div>
      }
    >
      <ProfileContent />
    </Suspense>
  );
}
