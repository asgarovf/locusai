"use client";

import { Command, FileText, LayoutDashboard, Settings } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

export function Sidebar() {
  const pathname = usePathname();

  const menuItems = [
    { href: "/", label: "Board", icon: LayoutDashboard },
    { href: "/docs", label: "Library", icon: FileText },
  ];

  return (
    <aside className="w-[240px] flex flex-col border-r bg-card h-full p-4">
      <div className="flex items-center gap-2 mb-8 px-2">
        <div className="bg-primary text-primary-foreground p-1.5 rounded-md">
          <Command size={18} />
        </div>
        <h2 className="text-xl font-bold tracking-tight text-foreground">
          Locus
        </h2>
      </div>

      <div className="flex-1">
        <div className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground mb-4 px-2">
          Main Menu
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
                  "flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-md transition-colors",
                  isActive
                    ? "bg-secondary text-secondary-foreground"
                    : "text-muted-foreground hover:bg-secondary/50 hover:text-foreground"
                )}
              >
                <Icon size={18} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>

      <div className="mt-auto border-t pt-4">
        <button
          className="flex items-center gap-3 w-full px-3 py-2 text-sm font-medium text-muted-foreground rounded-md transition-colors hover:bg-secondary/50 hover:text-foreground"
          onClick={() => alert("Settings panel coming soon!")}
        >
          <Settings size={18} />
          <span>Settings</span>
        </button>
      </div>
    </aside>
  );
}
