"use client";

import { type Workspace } from "@locusai/shared";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ChevronDown,
  ChevronRight,
  FileText,
  FolderKanban,
  LayoutDashboard,
  List,
  LogOut,
  Plus,
  Settings,
  User as UserIcon,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { Avatar } from "@/components/ui";
import { useAuth } from "@/context/AuthContext";
import { useGlobalKeydowns } from "@/hooks";
import { locusClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
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
      href: "/docs",
      label: "Library",
      icon: FileText,
      description: "Documentation",
    },
  ];

  return (
    <aside className="w-[260px] flex flex-col border-r border-border/50 bg-card/30 backdrop-blur-xl h-full">
      {/* Logo */}
      <div className="flex items-center gap-3 p-4 border-b border-border/30">
        <Image
          src="/logo.png"
          alt="Locus"
          width={97.81}
          height={32}
          className="rounded-xl"
        />
      </div>

      {/* Workspace Selector */}
      <div className="p-3 border-b border-border/30">
        <button
          onClick={() => setIsWorkspaceOpen(!isWorkspaceOpen)}
          className="w-full flex items-center gap-3 p-2.5 rounded-xl hover:bg-secondary/50 transition-all group"
        >
          <div className="flex items-center justify-center h-9 w-9 rounded-lg bg-linear-to-br from-primary/20 to-primary/5 border border-border/50 text-lg">
            {"🚀"}
          </div>
          <div className="flex-1 text-left min-w-0">
            <div className="text-sm font-semibold text-foreground truncate">
              {currentWorkspace?.name || "Select Workspace"}
            </div>
            <div className="text-[10px] text-muted-foreground/70 uppercase tracking-wider">
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
        </button>

        {/* Workspace Dropdown */}
        {isWorkspaceOpen && (
          <div className="mt-2 p-2 bg-secondary/30 rounded-xl border border-border/30 animate-in fade-in slide-in-from-top-2 duration-200">
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
                <span className="text-base">{"🚀"}</span>
                <span className="font-medium">{workspace.name}</span>
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
      <div className="flex-1 p-3 overflow-y-auto">
        <div className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground/60 mb-2 px-2">
          Navigation
        </div>
        <nav className="space-y-1">
          {mainMenuItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "group flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-xl transition-all duration-200",
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
                <span className="flex-1">{item.label}</span>
                {isActive && <ChevronRight size={14} className="opacity-70" />}
              </Link>
            );
          })}
        </nav>

        {/* Quick Actions */}
        <div className="mt-6">
          <div className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground/60 mb-2 px-2">
            Quick Actions
          </div>
          <div className="space-y-1">
            <button
              className="w-full flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-xl text-muted-foreground hover:bg-secondary/50 hover:text-foreground transition-all"
              onClick={() => router.push("/backlog?createTask=true")}
            >
              <Plus size={18} />
              <span>New Task</span>
              <kbd className="ml-auto text-[10px] px-1.5 py-0.5 rounded bg-secondary/80 border border-border/50 text-muted-foreground/70">
                Alt N
              </kbd>
            </button>
            <button
              className="w-full flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-xl text-muted-foreground hover:bg-secondary/50 hover:text-foreground transition-all"
              onClick={() => router.push("/backlog?createSprint=true")}
            >
              <FolderKanban size={18} />
              <span>New Sprint</span>
              <kbd className="ml-auto text-[10px] px-1.5 py-0.5 rounded bg-secondary/80 border border-border/50 text-muted-foreground/70">
                Alt S
              </kbd>
            </button>
          </div>
        </div>
      </div>

      {/* Bottom Section */}
      <div className="p-3 border-t border-border/30 space-y-1">
        {/* User Profile */}
        <div className="relative">
          <button
            onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
            className="w-full flex items-center gap-3 p-2.5 rounded-xl hover:bg-secondary/50 transition-all group"
          >
            <Avatar
              name={user?.name || "User"}
              src={user?.avatarUrl}
              size="md"
            />
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
          </button>

          {/* User Menu Dropdown */}
          {isUserMenuOpen && (
            <div className="absolute bottom-full left-0 right-0 mb-2 p-2 bg-popover rounded-xl border border-border shadow-xl animate-in fade-in slide-in-from-bottom-2 duration-200">
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
