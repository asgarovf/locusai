"use client";

import { ChevronRight, Key, Server, Trash2, Users } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";
import { PageLayout } from "@/components";
import {
  SettingItem,
  SettingSection,
  WorkspaceChecklistSettings,
} from "@/components/settings";
import { Spinner } from "@/components/ui";

function SettingsContent() {
  return (
    <PageLayout
      title="Settings"
      description="Manage your workspace preferences and configuration."
    >
      <div className="max-w-5xl space-y-8">
        {/* Workspace Section */}
        <SettingSection title="Workspace">
          <Link href="/settings/team">
            <SettingItem
              icon={<Users size={18} />}
              title="Team"
              description="Invite and manage workspace members"
            >
              <div className="text-muted-foreground">
                <ChevronRight size={20} />
              </div>
            </SettingItem>
          </Link>

          <Link href="/settings/api-keys">
            <SettingItem
              icon={<Key size={18} />}
              title="API Keys"
              description="Manage API keys for CLI and integrations"
            >
              <div className="text-muted-foreground">
                <ChevronRight size={20} />
              </div>
            </SettingItem>
          </Link>
        </SettingSection>

        {/* Infrastructure */}
        <SettingSection title="Infrastructure">
          <Link href="/settings/aws">
            <SettingItem
              icon={<Server size={18} />}
              title="Hosting"
              description="Connect AWS credentials to provision agent servers"
            >
              <div className="text-muted-foreground">
                <ChevronRight size={20} />
              </div>
            </SettingItem>
          </Link>
        </SettingSection>

        {/* Task Settings */}
        <WorkspaceChecklistSettings />

        {/* Danger Zone */}
        <SettingSection title="Danger Zone">
          <div className="space-y-4">
            <Link href="/settings/danger">
              <SettingItem
                icon={<Trash2 size={18} className="text-destructive" />}
                title="Danger Zone"
                description="Delete workspace and other destructive actions"
              >
                <div className="text-muted-foreground">
                  <ChevronRight size={20} />
                </div>
              </SettingItem>
            </Link>
          </div>
        </SettingSection>
      </div>
    </PageLayout>
  );
}

export default function SettingsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center h-full">
          <Spinner size="lg" />
        </div>
      }
    >
      <SettingsContent />
    </Suspense>
  );
}
