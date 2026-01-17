"use client";

import {
  ChevronRight,
  Command,
  FileText,
  LayoutDashboard,
  List,
  Settings,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

export function Sidebar() {
  const pathname = usePathname();

  const menuItems = [
    {
      href: "/",
      label: "Board",
      icon: LayoutDashboard,
      description: "Manage tasks",
    },
    {
      href: "/backlog", // Added Backlog item
      label: "Backlog",
      icon: List,
      description: "Manage backlog items",
    },
    {
      href: "/docs",
      label: "Library",
      icon: FileText,
      description: "Documents",
    },
  ];

  return (
    <aside className="w-[260px] flex flex-col border-r border-border/50 bg-card/50 backdrop-blur-sm h-full">
      {/* Logo */}
      <div className="flex items-center gap-3 p-5 border-b border-border/50">
        <div className="bg-linear-to-br from-primary to-primary/70 text-primary-foreground p-2 rounded-xl shadow-lg shadow-primary/20">
          <Command size={20} />
        </div>
        <div>
          <h2 className="text-lg font-bold tracking-tight text-foreground">
            Locus
          </h2>
          <p className="text-[10px] text-muted-foreground font-medium">
            Engineering Workspace
          </p>
        </div>
      </div>

      {/* Navigation */}
      <div className="flex-1 p-4">
        <div className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground/70 mb-3 px-3">
          Navigation
        </div>
        <nav className="space-y-1">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "group flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-xl transition-all",
                  isActive
                    ? "bg-primary text-primary-foreground shadow-md shadow-primary/20"
                    : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                )}
              >
                <Icon
                  size={18}
                  className={
                    isActive ? "" : "group-hover:scale-110 transition-transform"
                  }
                />
                <div className="flex-1">
                  <span className="block">{item.label}</span>
                </div>
                {isActive && <ChevronRight size={14} className="opacity-70" />}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-border/50">
        <Link
          href="/settings"
          className={cn(
            "flex items-center gap-3 w-full px-3 py-2.5 text-sm font-medium rounded-xl transition-all",
            pathname === "/settings"
              ? "bg-secondary text-foreground"
              : "text-muted-foreground hover:bg-secondary/60 hover:text-foreground"
          )}
        >
          <Settings size={18} />
          <span>Settings</span>
        </Link>
      </div>
    </aside>
  );
}
