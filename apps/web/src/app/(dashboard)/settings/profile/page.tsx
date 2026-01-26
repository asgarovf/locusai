"use client";

import { ImageIcon, Mail, User as UserIcon } from "lucide-react";
import { Suspense } from "react";
import { toast } from "sonner";
import { PageLayout } from "@/components/PageLayout";
import { SettingItem } from "@/components/settings/SettingItem";
import { SettingSection } from "@/components/settings/SettingSection";
import { Avatar, Button, Input, Spinner } from "@/components/ui";
import { useSafeAuth } from "@/context/AuthContext";

function ProfileContent() {
  const { user } = useSafeAuth();

  const handleSave = () => {
    toast.success("Profile updated successfully");
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
      </div>
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
