/**
 * BottomNav Component
 *
 * Mobile-only bottom navigation bar with 4 main navigation items.
 * Features safe area support for iPhone (notch) and Android (navigation bar).
 * Hidden on desktop (lg+ screens).
 *
 * Features:
 * - 4 navigation items: Dashboard, Board, Chat, Backlog
 * - Active state highlighting based on current route
 * - Safe area insets for mobile devices
 * - Smooth transitions and hover states
 *
 * @example
 * <BottomNav />
 */

"use client";

import {
  FolderKanban,
  LayoutDashboard,
  List,
  Sparkles,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

/**
 * Navigation item configuration
 */
interface NavItem {
  /** Route path (for Link component) */
  href: string;
  /** Display label */
  label: string;
  /** Lucide icon component */
  icon: React.ElementType;
}

export function BottomNav() {
  const pathname = usePathname();

  const navItems: NavItem[] = [
    { icon: LayoutDashboard, label: "Dashboard", href: "/" },
    { icon: FolderKanban, label: "Board", href: "/board" },
    { icon: Sparkles, label: "Chat", href: "/chat" },
    { icon: List, label: "Backlog", href: "/backlog" },
  ];

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-card/95 backdrop-blur-xl border-t border-border/50 z-40 safe-area-inset-bottom">
      <div className="flex justify-around items-center h-16 px-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col items-center justify-center gap-1 px-3 py-2 rounded-xl transition-all duration-200 min-w-[60px]",
                isActive
                  ? "text-primary bg-primary/10"
                  : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
              )}
            >
              <Icon
                className={cn("w-5 h-5", isActive && "scale-110")}
                strokeWidth={isActive ? 2.5 : 2}
              />
              <span className="text-[11px] font-medium">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
