"use client";

import {
  Bell,
  ChevronRight,
  Globe,
  Moon,
  Palette,
  Shield,
  Sun,
  User,
  Users,
  Zap,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { PageLayout } from "@/components/PageLayout";
import { SettingItem } from "@/components/settings/SettingItem";
import { SettingSection } from "@/components/settings/SettingSection";
import { Button, Toggle } from "@/components/ui";

export default function SettingsPage() {
  const [darkMode, setDarkMode] = useState(true);
  const [notifications, setNotifications] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [compactMode, setCompactMode] = useState(false);

  return (
    <PageLayout
      title="Settings"
      description="Manage your workspace preferences and configuration."
    >
      <div className="max-w-3xl">
        {/* Appearance Section */}
        <SettingSection title="Appearance">
          <SettingItem
            icon={darkMode ? <Moon size={18} /> : <Sun size={18} />}
            title="Dark Mode"
            description="Toggle between light and dark theme"
          >
            <Toggle checked={darkMode} onChange={setDarkMode} />
          </SettingItem>
          <SettingItem
            icon={<Palette size={18} />}
            title="Accent Color"
            description="Choose your preferred accent color"
          >
            <div className="flex gap-2">
              {["#6366f1", "#8b5cf6", "#06b6d4", "#10b981", "#f59e0b"].map(
                (color) => (
                  <button
                    key={color}
                    className="w-6 h-6 rounded-full border-2 border-transparent hover:border-foreground/30 transition-colors"
                    style={{ backgroundColor: color }}
                  />
                )
              )}
            </div>
          </SettingItem>
          <SettingItem
            icon={<Zap size={18} />}
            title="Compact Mode"
            description="Reduce spacing for more content visibility"
          >
            <Toggle checked={compactMode} onChange={setCompactMode} />
          </SettingItem>
        </SettingSection>

        {/* Notifications Section */}
        <SettingSection title="Notifications">
          <SettingItem
            icon={<Bell size={18} />}
            title="Push Notifications"
            description="Receive notifications for task updates"
          >
            <Toggle checked={notifications} onChange={setNotifications} />
          </SettingItem>
          <SettingItem
            icon={<Globe size={18} />}
            title="Auto Refresh"
            description="Automatically refresh board data"
          >
            <Toggle checked={autoRefresh} onChange={setAutoRefresh} />
          </SettingItem>
        </SettingSection>

        {/* Account Section */}
        <SettingSection title="Account">
          <SettingItem
            icon={<User size={18} />}
            title="Profile"
            description="Update your personal information"
          >
            <Button variant="secondary" size="sm">
              Edit
            </Button>
          </SettingItem>
          <SettingItem
            icon={<Shield size={18} />}
            title="Security"
            description="Manage authentication settings"
          >
            <Button variant="secondary" size="sm">
              Configure
            </Button>
          </SettingItem>
        </SettingSection>

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

        {/* Danger Zone */}
        <div>
          <h3 className="text-xs font-bold uppercase tracking-widest text-destructive mb-4 px-4">
            Danger Zone
          </h3>
          <div className="bg-destructive/5 border border-destructive/20 rounded-2xl p-6">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-medium text-foreground">Reset Workspace</h4>
                <p className="text-sm text-muted-foreground mt-0.5">
                  Delete all tasks, documents, and settings
                </p>
              </div>
              <Button variant="danger" size="sm">
                Reset
              </Button>
            </div>
          </div>
        </div>
      </div>
    </PageLayout>
  );
}
