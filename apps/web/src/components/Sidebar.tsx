/**
 * Sidebar Component
 *
 * Main navigation sidebar with workspace switcher and user menu.
 * Displays navigation links, workspace selection, and user profile.
 * Features quick access to workspaces, settings, and user actions.
 *
 * Features:
 * - Workspace switcher with quick access
 * - Navigation links (Dashboard, Backlog, Docs)
 * - User profile menu
 * - Create workspace button
 * - Keyboard shortcuts (Cmd+K for workspace switcher)
 * - Logout functionality
 * - Workspace-aware routing
 *
 * @example
 * <Sidebar />
 */

"use client";

import { type Workspace } from "@locusai/shared";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Activity,
  ChevronDown,
  ChevronRight,
  FileText,
  FolderKanban,
  LayoutDashboard,
  List,
  LogOut,
  PanelLeftClose,
  PanelLeftOpen,
  Plus,
  Settings,
  Sparkles,
  User as UserIcon,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { Avatar } from "@/components/ui";
import { useAuth } from "@/context/AuthContext";
import { useGlobalKeydowns, useLocalStorage } from "@/hooks";
import { locusClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import { getTypographyClass } from "@/lib/typography";
import { cn } from "@/lib/utils";
import { WorkspaceCreateModal } from "./WorkspaceCreateModal";

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user, logout, switchWorkspace } = useAuth();
  const [isWorkspaceOpen, setIsWorkspaceOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useLocalStorage(
    "sidebar-collapsed",
    false
  );

  const { data: workspaces = [] } = useQuery<Workspace[]>({
    queryKey: queryKeys.workspaces.all(),
    queryFn: () => locusClient.workspaces.listAll(),
    enabled: !!user,
  });

  const currentWorkspace =
    workspaces.find((w) => w.id === user?.workspaceId) || workspaces[0];

  const invalidateWorkspaces = () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.workspaces.all() });
  };

  useGlobalKeydowns({
    onOpenCreateTask: () => {
      router.push("/backlog?createTask=true");
    },
    onOpenCreateSprint: () => {
      router.push("/backlog?createSprint=true");
    },
    onCloseCreateTask: () => {
      // Global escape could handle closing menus or global UI
      setIsWorkspaceOpen(false);
      setIsUserMenuOpen(false);
      setIsCreateModalOpen(false);
    },
  });

  const mainMenuItems = [
    {
      href: "/",
      label: "Dashboard",
      icon: LayoutDashboard,
      description: "Overview",
    },
    ...(process.env.NODE_ENV === "development"
      ? [
          {
            href: "/chat",
            label: "Chat",
            icon: Sparkles,
            description: "AI Companion",
          },
        ]
      : []),
    {
      href: "/board",
      label: "Board",
      icon: FolderKanban,
      description: "Sprint board",
    },
    {
      href: "/backlog",
      label: "Backlog",
      icon: List,
      description: "All tasks",
    },
    {
      href: "/activity",
      label: "Activity",
      icon: Activity,
      description: "Workspace history",
    },
    {
      href: "/docs",
      label: "Library",
      icon: FileText,
      description: "Documentation",
    },
  ];

  return (
    <aside
      className={cn(
        "flex flex-col border-r border-border/50 bg-card/30 backdrop-blur-xl h-full transition-all duration-300 ease-in-out z-50",
        isCollapsed ? "w-[70px]" : "w-[260px]"
      )}
    >
      {/* Logo & Toggle */}
      <div
        className={cn(
          "flex items-center gap-3 p-4 border-b border-border/30",
          isCollapsed ? "justify-center px-2" : "justify-between"
        )}
      >
        {!isCollapsed && (
          <Image
            src="/logo.png"
            alt="Locus"
            width={97.81}
            height={36.09}
            className="rounded-xl"
          />
        )}
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="text-muted-foreground hover:text-foreground transition-colors"
        >
          {isCollapsed ? (
            <PanelLeftOpen size={20} />
          ) : (
            <PanelLeftClose size={18} />
          )}
        </button>
      </div>

      {/* Workspace Selector */}
      <div
        className={cn("border-b border-border/30", isCollapsed ? "p-2" : "p-3")}
      >
        <button
          onClick={() => setIsWorkspaceOpen(!isWorkspaceOpen)}
          className={cn(
            "w-full flex items-center gap-3 rounded-xl hover:bg-secondary/50 transition-all group relative",
            isCollapsed ? "justify-center p-2" : "p-2.5"
          )}
        >
          <div className="flex items-center justify-center h-9 w-9 rounded-lg bg-linear-to-br from-primary/20 to-primary/5 border border-border/50 text-lg shrink-0">
            {"🚀"}
          </div>
          {!isCollapsed && (
            <>
              <div className="flex-1 text-left min-w-0">
                <div className="text-sm font-semibold text-foreground truncate">
                  {currentWorkspace?.name || "Select Workspace"}
                </div>
                <div
                  className={cn(
                    getTypographyClass("label"),
                    "text-muted-foreground/70"
                  )}
                >
                  Workspace
                </div>
              </div>
              <ChevronDown
                size={16}
                className={cn(
                  "text-muted-foreground transition-transform duration-200",
                  isWorkspaceOpen && "rotate-180"
                )}
              />
            </>
          )}
        </button>

        {/* Workspace Dropdown */}
        {isWorkspaceOpen && (
          <div
            className={cn(
              "mt-2 bg-secondary/30 rounded-xl border border-border/30 animate-in fade-in slide-in-from-top-2 duration-200 z-9999",
              isCollapsed
                ? "absolute left-20 top-20 w-[200px] shadow-xl p-2 bg-card"
                : "p-2 relative"
            )}
          >
            {workspaces.map((workspace) => (
              <button
                key={workspace.id}
                className={cn(
                  "w-full flex items-center gap-3 p-2 rounded-lg transition-colors text-sm",
                  workspace.id === currentWorkspace?.id
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-secondary/50 hover:text-foreground"
                )}
                onClick={() => {
                  switchWorkspace(workspace.id as string);
                  setIsWorkspaceOpen(false);
                }}
              >
                <span className="text-base shrink-0">{"🚀"}</span>
                <span className="font-medium truncate">{workspace.name}</span>
              </button>
            ))}
            <div className="border-t border-border/30 mt-2 pt-2">
              <button
                onClick={() => {
                  setIsCreateModalOpen(true);
                  setIsWorkspaceOpen(false);
                }}
                className="w-full flex items-center gap-2 p-2 rounded-lg text-muted-foreground hover:bg-secondary/50 hover:text-foreground transition-colors text-sm"
              >
                <Plus size={16} />
                <span>New Workspace</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Main Navigation */}
      <div
        className={cn(
          "flex-1 overflow-y-auto overflow-x-hidden",
          isCollapsed ? "px-2 py-3" : "p-3"
        )}
      >
        {!isCollapsed && (
          <div
            className={cn(
              getTypographyClass("label"),
              "text-muted-foreground/60 mb-2 px-2"
            )}
          >
            Navigation
          </div>
        )}
        <nav className="space-y-1">
          {mainMenuItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                title={isCollapsed ? item.label : undefined}
                className={cn(
                  "group flex items-center gap-3 rounded-xl transition-all duration-200",
                  isCollapsed ? "justify-center p-2.5" : "px-3 py-2.5",
                  isActive
                    ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20"
                    : "text-muted-foreground hover:bg-secondary/50 hover:text-foreground"
                )}
              >
                <Icon
                  size={18}
                  className={cn(
                    "shrink-0",
                    !isActive && "group-hover:scale-110 transition-transform"
                  )}
                />
                {!isCollapsed && (
                  <span className="flex-1 text-sm font-medium">
                    {item.label}
                  </span>
                )}
                {!isCollapsed && isActive && (
                  <ChevronRight size={14} className="opacity-70" />
                )}
              </Link>
            );
          })}
        </nav>

        {/* Quick Actions */}
        <div className="mt-6">
          {!isCollapsed && (
            <div
              className={cn(
                getTypographyClass("label"),
                "text-muted-foreground/60 mb-2 px-2"
              )}
            >
              Quick Actions
            </div>
          )}
          <div className="space-y-1">
            <button
              className={cn(
                "w-full flex items-center gap-3 rounded-xl text-muted-foreground hover:bg-secondary/50 hover:text-foreground transition-all",
                isCollapsed ? "justify-center p-2.5" : "px-3 py-2.5"
              )}
              title={isCollapsed ? "New Task" : undefined}
              onClick={() => router.push("/backlog?createTask=true")}
            >
              <Plus size={18} className="shrink-0" />
              {!isCollapsed && (
                <>
                  <span className="text-sm font-medium">New Task</span>
                  <kbd className="ml-auto text-[10px] px-1.5 py-0.5 rounded bg-secondary/80 border border-border/50 text-muted-foreground/70">
                    Alt N
                  </kbd>
                </>
              )}
            </button>
            <button
              className={cn(
                "w-full flex items-center gap-3 rounded-xl text-muted-foreground hover:bg-secondary/50 hover:text-foreground transition-all",
                isCollapsed ? "justify-center p-2.5" : "px-3 py-2.5"
              )}
              title={isCollapsed ? "New Sprint" : undefined}
              onClick={() => router.push("/backlog?createSprint=true")}
            >
              <FolderKanban size={18} className="shrink-0" />
              {!isCollapsed && (
                <>
                  <span className="text-sm font-medium">New Sprint</span>
                  <kbd className="ml-auto text-[10px] px-1.5 py-0.5 rounded bg-secondary/80 border border-border/50 text-muted-foreground/70">
                    Alt S
                  </kbd>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Bottom Section */}
      <div
        className={cn("border-t border-border/30", isCollapsed ? "p-2" : "p-3")}
      >
        {/* User Profile */}
        <div className="relative">
          <button
            onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
            className={cn(
              "w-full flex items-center gap-3 rounded-xl hover:bg-secondary/50 transition-all group",
              isCollapsed ? "justify-center p-2" : "p-2.5"
            )}
          >
            <Avatar
              name={user?.name || "User"}
              src={user?.avatarUrl}
              size="md"
            />
            {!isCollapsed && (
              <>
                <div className="flex-1 text-left min-w-0">
                  <div className="text-sm font-semibold text-foreground truncate">
                    {user?.name}
                  </div>
                  <div className="text-[11px] text-muted-foreground truncate">
                    {user?.email}
                  </div>
                </div>
                <ChevronDown
                  size={14}
                  className={cn(
                    "text-muted-foreground transition-transform duration-200",
                    isUserMenuOpen && "rotate-180"
                  )}
                />
              </>
            )}
          </button>

          {/* User Menu Dropdown */}
          {isUserMenuOpen && (
            <div
              className={cn(
                "absolute bottom-full mb-2 bg-popover rounded-xl border border-border shadow-xl animate-in fade-in slide-in-from-bottom-2 duration-200 z-9999",
                isCollapsed ? "left-14 w-48" : "left-0 right-0 p-2"
              )}
            >
              <div className={cn(isCollapsed && "p-2")}>
                <Link
                  href="/settings/profile"
                  className="flex items-center gap-2 p-2 rounded-lg text-sm text-muted-foreground hover:bg-secondary/50 hover:text-foreground transition-colors"
                  onClick={() => setIsUserMenuOpen(false)}
                >
                  <UserIcon size={16} />
                  <span>Profile</span>
                </Link>
                <Link
                  href="/settings"
                  className="flex items-center gap-2 p-2 rounded-lg text-sm text-muted-foreground hover:bg-secondary/50 hover:text-foreground transition-colors"
                  onClick={() => setIsUserMenuOpen(false)}
                >
                  <Settings size={16} />
                  <span>Settings</span>
                </Link>
                <div className="border-t border-border/50 mt-1 pt-1">
                  <button
                    onClick={() => {
                      logout();
                      router.push("/login");
                    }}
                    className="w-full flex items-center gap-2 p-2 rounded-lg text-sm text-rose-400 hover:bg-rose-500/10 transition-colors"
                  >
                    <LogOut size={16} />
                    <span>Sign Out</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <WorkspaceCreateModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSuccess={invalidateWorkspaces}
      />
    </aside>
  );
}
