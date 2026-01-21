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
import { Button } from "@/components/ui";

interface SettingItemProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  children: React.ReactNode;
}

function SettingItem({ icon, title, description, children }: SettingItemProps) {
  return (
    <div className="flex items-start justify-between p-4 rounded-xl hover:bg-secondary/30 transition-colors">
      <div className="flex gap-4">
        <div className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center text-muted-foreground shrink-0">
          {icon}
        </div>
        <div>
          <h4 className="font-medium text-foreground">{title}</h4>
          <p className="text-sm text-muted-foreground mt-0.5">{description}</p>
        </div>
      </div>
      <div className="shrink-0 flex items-center h-full">{children}</div>
    </div>
  );
}

function Toggle({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 ${
        checked ? "bg-primary" : "bg-secondary"
      }`}
    >
      <span
        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition ${
          checked ? "translate-x-5" : "translate-x-0"
        }`}
      />
    </button>
  );
}

export default function SettingsPage() {
  const [darkMode, setDarkMode] = useState(true);
  const [notifications, setNotifications] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [compactMode, setCompactMode] = useState(false);

  return (
    <div className="max-w-3xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          Settings
        </h1>
        <p className="text-muted-foreground mt-1">
          Manage your workspace preferences and configuration.
        </p>
      </div>

      {/* Appearance Section */}
      <div className="mb-8">
        <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-4 px-4">
          Appearance
        </h3>
        <div className="bg-card border border-border/50 rounded-2xl overflow-hidden divide-y divide-border/50">
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
        </div>
      </div>

      {/* Notifications Section */}
      <div className="mb-8">
        <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-4 px-4">
          Notifications
        </h3>
        <div className="bg-card border border-border/50 rounded-2xl overflow-hidden divide-y divide-border/50">
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
        </div>
      </div>

      {/* Account Section */}
      <div className="mb-8">
        <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-4 px-4">
          Account
        </h3>
        <div className="bg-card border border-border/50 rounded-2xl overflow-hidden divide-y divide-border/50">
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
        </div>
      </div>

      {/* Organization Section */}
      <div className="mb-8">
        <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-4 px-4">
          Organization
        </h3>
        <div className="bg-card border border-border/50 rounded-2xl overflow-hidden divide-y divide-border/50">
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
        </div>
      </div>

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
  );
}
